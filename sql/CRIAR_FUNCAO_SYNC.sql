-- ============================================================
-- SCRIPT SQL PARA SUPABASE: Criar função de sincronização
-- Execute no Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================
-- INSTRUÇÕES: Copie e cole este script INTEIRO no SQL Editor e execute.
-- Ele é seguro para re-executar (idempotente).
-- ============================================================

-- Constraint unique (seguro se já existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'emendas_codigo_num_unique'
  ) THEN
    ALTER TABLE emendas ADD CONSTRAINT emendas_codigo_num_unique UNIQUE (codigo_num);
  END IF;
END $$;

-- ============================================================
-- ÍNDICES PARA PERFORMANCE DA SINCRONIZAÇÃO
-- Índices em expressões usadas nos JOINs (TRIM, REGEXP_REPLACE)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_formalizacao_trim_numero_convenio
  ON formalizacao (TRIM(numero_convenio))
  WHERE numero_convenio IS NOT NULL AND numero_convenio != '';

CREATE INDEX IF NOT EXISTS idx_emendas_trim_num_convenio
  ON emendas (TRIM(num_convenio))
  WHERE num_convenio IS NOT NULL AND num_convenio != '';

-- Recria o índice com threshold >= 6 (era >= 8, que perdía códigos curtos)
DROP INDEX IF EXISTS idx_formalizacao_emenda_digits;
CREATE INDEX idx_formalizacao_emenda_digits
  ON formalizacao (TRIM(REGEXP_REPLACE(emenda, '[^0-9]', '', 'g')))
  WHERE emenda IS NOT NULL AND emenda != ''
    AND LENGTH(REGEXP_REPLACE(emenda, '[^0-9]', '', 'g')) >= 6;

CREATE INDEX IF NOT EXISTS idx_emendas_codigo_num_digits
  ON emendas (TRIM(REGEXP_REPLACE(codigo_num, '[^0-9]', '', 'g')))
  WHERE codigo_num IS NOT NULL;

-- ============================================================
-- FUNÇÃO PRINCIPAL (BATCH): processa p_limit registros a partir de p_offset
-- Chamada pelo endpoint /api/admin/sync-emendas com offset/limit
-- Cada lote: < 5s. O frontend chama em loop até has_more = false.
-- ============================================================

CREATE OR REPLACE FUNCTION sync_emendas_formalizacao_batch(
  p_offset int DEFAULT 0,
  p_limit  int DEFAULT 5000
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '25s'
AS $$
DECLARE
  v_updated  INTEGER := 0;
  v_updated2 INTEGER := 0;
  v_inserted INTEGER := 0;
  v_total    INTEGER;
BEGIN
  -- Total no staging (para calcular has_more)
  SELECT COUNT(*) INTO v_total FROM emendas;

  -- Batch: apenas p_limit registros do staging (REGEXP_REPLACE em ~5k linhas: < 0.3s)
  CREATE TEMP TABLE _batch ON COMMIT DROP AS
    SELECT
      e.id,
      e.ano_refer, e.parlamentar, e.partido, e.codigo_num,
      e.detalhes, e.natureza, e.num_convenio, e.regional,
      e.municipio, e.beneficiario, e.objeto, e.portfolio,
      e.valor, e.num_emenda, e.situacao_d,
      TRIM(REGEXP_REPLACE(COALESCE(e.codigo_num, ''), '[^0-9]', '', 'g')) AS digits,
      TRIM(COALESCE(e.num_convenio, ''))                                   AS conv_trim
    FROM emendas e
    ORDER BY e.id
    LIMIT p_limit OFFSET p_offset;

  CREATE INDEX ON _batch (digits);
  CREATE INDEX ON _batch (conv_trim);
  ANALYZE _batch;

  -- ── PASSO 1: Atualizar por numero_convenio ──────────────────────────────
  -- Join _batch(5k) × formalizacao(37k) via idx_formalizacao_trim_numero_convenio
  WITH m AS (
    UPDATE formalizacao f SET
      demanda                      = COALESCE(NULLIF(b.detalhes, ''), f.demanda),
      situacao_demandas_sempapel   = COALESCE(NULLIF(b.situacao_d, ''), f.situacao_demandas_sempapel),
      classificacao_emenda_demanda = COALESCE(NULLIF(f.classificacao_emenda_demanda, ''), b.natureza),
      ano                          = COALESCE(NULLIF(f.ano, ''), b.ano_refer),
      emenda                       = COALESCE(NULLIF(f.emenda, ''), b.codigo_num),
      emendas_agregadoras          = COALESCE(NULLIF(f.emendas_agregadoras, ''), b.num_emenda),
      parlamentar                  = COALESCE(NULLIF(f.parlamentar, ''), b.parlamentar),
      partido                      = COALESCE(NULLIF(f.partido, ''), b.partido),
      conveniado                   = COALESCE(NULLIF(f.conveniado, ''), b.beneficiario),
      municipio                    = COALESCE(NULLIF(f.municipio, ''), b.municipio),
      objeto                       = COALESCE(NULLIF(f.objeto, ''), b.objeto),
      regional                     = COALESCE(NULLIF(f.regional, ''), b.regional),
      portfolio                    = COALESCE(NULLIF(f.portfolio, ''), b.portfolio),
      valor                        = COALESCE(f.valor, b.valor)
    FROM _batch b
    WHERE b.conv_trim != ''
      AND TRIM(f.numero_convenio) = b.conv_trim
    RETURNING f.id
  )
  SELECT COUNT(*) INTO v_updated FROM m;

  -- ── PASSO 1b: Atualizar por codigo_num ─────────────────────────────────
  -- Join usa idx_formalizacao_emenda_digits (expression index): sem NOT EXISTS, idempotente via COALESCE
  WITH m2 AS (
    UPDATE formalizacao f SET
      demanda                      = COALESCE(NULLIF(b.detalhes, ''), f.demanda),
      situacao_demandas_sempapel   = COALESCE(NULLIF(b.situacao_d, ''), f.situacao_demandas_sempapel),
      classificacao_emenda_demanda = COALESCE(NULLIF(f.classificacao_emenda_demanda, ''), b.natureza),
      ano                          = COALESCE(NULLIF(f.ano, ''), b.ano_refer),
      emendas_agregadoras          = COALESCE(NULLIF(f.emendas_agregadoras, ''), b.num_emenda),
      parlamentar                  = COALESCE(NULLIF(f.parlamentar, ''), b.parlamentar),
      partido                      = COALESCE(NULLIF(f.partido, ''), b.partido),
      conveniado                   = COALESCE(NULLIF(f.conveniado, ''), b.beneficiario),
      municipio                    = COALESCE(NULLIF(f.municipio, ''), b.municipio),
      objeto                       = COALESCE(NULLIF(f.objeto, ''), b.objeto),
      regional                     = COALESCE(NULLIF(f.regional, ''), b.regional),
      portfolio                    = COALESCE(NULLIF(f.portfolio, ''), b.portfolio),
      numero_convenio              = COALESCE(NULLIF(f.numero_convenio, ''), b.num_convenio),
      valor                        = COALESCE(f.valor, b.valor)
    FROM _batch b
    WHERE LENGTH(b.digits) >= 6
      AND TRIM(REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g')) = b.digits
    RETURNING f.id
  )
  SELECT COUNT(*) INTO v_updated2 FROM m2;

  -- ── PASSO 2: Inserir emendas que não existem na formalização ───────────
  -- LEFT JOIN usa idx_formalizacao_emenda_digits + idx_formalizacao_trim_numero_convenio
  -- Sem O(N×M): planner faz hash/nested-loop via índice expressão
  INSERT INTO formalizacao (
    ano, parlamentar, partido, emenda, demanda,
    classificacao_emenda_demanda, numero_convenio,
    regional, municipio, conveniado, objeto, portfolio, valor
  )
  SELECT
    b.ano_refer, b.parlamentar, b.partido, b.codigo_num, b.detalhes,
    b.natureza,  b.num_convenio, b.regional, b.municipio,
    b.beneficiario, b.objeto, b.portfolio, b.valor
  FROM _batch b
  LEFT JOIN formalizacao f_e
    ON LENGTH(b.digits) >= 6
    AND TRIM(REGEXP_REPLACE(f_e.emenda, '[^0-9]', '', 'g')) = b.digits
  LEFT JOIN formalizacao f_c
    ON b.conv_trim != ''
    AND TRIM(f_c.numero_convenio) = b.conv_trim
  WHERE f_e.id IS NULL
    AND f_c.id IS NULL;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  DROP TABLE IF EXISTS _batch;

  RETURN json_build_object(
    'updated',  v_updated + v_updated2,
    'inserted', v_inserted,
    'offset',   p_offset,
    'limit',    p_limit,
    'total',    v_total,
    'has_more', (p_offset + p_limit < v_total)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION sync_emendas_formalizacao_batch(int, int) TO service_role;

-- ============================================================
-- WRAPPER (uso manual no SQL Editor): chama o batch em loop
-- NÃO use via Cloudflare (sem limite de timeout aqui)
-- ============================================================

CREATE OR REPLACE FUNCTION sync_emendas_formalizacao()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '600s'
AS $$
DECLARE
  v_total    INTEGER;
  v_offset   INTEGER := 0;
  v_limit    CONSTANT INTEGER := 5000;
  v_updated  INTEGER := 0;
  v_inserted INTEGER := 0;
  v_batch    JSON;
BEGIN
  SELECT COUNT(*) INTO v_total FROM emendas;
  WHILE v_offset < v_total LOOP
    v_batch    := sync_emendas_formalizacao_batch(v_offset, v_limit);
    v_updated  := v_updated  + (v_batch->>'updated')::int;
    v_inserted := v_inserted + (v_batch->>'inserted')::int;
    v_offset   := v_offset + v_limit;
  END LOOP;
  RETURN json_build_object(
    'updated',  v_updated,
    'inserted', v_inserted,
    'total',    v_total,
    'message',  v_updated || ' atualizados, ' || v_inserted || ' inseridos'
  );
END;
$$;

-- Dar permissão para o service_role executar a função
GRANT EXECUTE ON FUNCTION sync_emendas_formalizacao() TO service_role;

-- IMPORTANTE: Recarregar o cache do PostgREST para reconhecer a nova função
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- PRONTO! Após executar, teste a sincronização no sistema.
-- ============================================================
