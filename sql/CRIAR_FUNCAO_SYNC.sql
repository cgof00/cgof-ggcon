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

CREATE INDEX IF NOT EXISTS idx_formalizacao_emenda_digits
  ON formalizacao (TRIM(REGEXP_REPLACE(emenda, '[^0-9]', '', 'g')))
  WHERE emenda IS NOT NULL AND emenda != ''
    AND LENGTH(REGEXP_REPLACE(emenda, '[^0-9]', '', 'g')) >= 8;

CREATE INDEX IF NOT EXISTS idx_emendas_codigo_num_digits
  ON emendas (TRIM(REGEXP_REPLACE(codigo_num, '[^0-9]', '', 'g')))
  WHERE codigo_num IS NOT NULL;

-- ============================================================
-- FUNÇÃO RPC DE SINCRONIZAÇÃO
-- Chamada pelo endpoint /api/emendas/sync-formalizacao
-- ============================================================

CREATE OR REPLACE FUNCTION sync_emendas_formalizacao()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
DECLARE
  v_updated INTEGER := 0;
  v_updated2 INTEGER := 0;
  v_inserted INTEGER := 0;
BEGIN
  -- ── PRÉ-COMPUTAR: dígitos normalizados das emendas em staging ────────────
  -- Evita REGEXP_REPLACE repetido em cada linha do JOIN (O(N) em vez de O(N×M))
  CREATE TEMP TABLE _e_digits ON COMMIT DROP AS
    SELECT
      id,
      codigo_num,
      TRIM(REGEXP_REPLACE(codigo_num, '[^0-9]', '', 'g')) AS digits,
      TRIM(num_convenio)  AS num_convenio_trim
    FROM emendas
    WHERE codigo_num IS NOT NULL AND codigo_num != ''
      AND LENGTH(TRIM(REGEXP_REPLACE(codigo_num, '[^0-9]', '', 'g'))) >= 6;

  CREATE INDEX ON _e_digits (digits);
  CREATE INDEX ON _e_digits (num_convenio_trim);

  -- ── PRÉ-COMPUTAR: dígitos normalizados das formalizações existentes ───────
  CREATE TEMP TABLE _f_digits ON COMMIT DROP AS
    SELECT
      id,
      TRIM(REGEXP_REPLACE(emenda, '[^0-9]', '', 'g')) AS digits,
      TRIM(numero_convenio)                            AS num_convenio_trim
    FROM formalizacao
    WHERE emenda IS NOT NULL AND emenda != ''
      AND LENGTH(REGEXP_REPLACE(emenda, '[^0-9]', '', 'g')) >= 6;

  CREATE INDEX ON _f_digits (digits);
  CREATE INDEX ON _f_digits (num_convenio_trim);

  -- ── PASSO 1: Atualizar por numero_convenio (hash join via índice) ─────────
  -- PROCX: demanda e situacao_demandas_sempapel sempre vêm do CSV quando há valor
  -- Outros campos: preenche apenas se estiver vazio na formalização
  WITH matched AS (
    UPDATE formalizacao f SET
      demanda                      = COALESCE(NULLIF(e.detalhes, ''), f.demanda),
      situacao_demandas_sempapel   = COALESCE(NULLIF(e.situacao_d, ''), f.situacao_demandas_sempapel),
      classificacao_emenda_demanda = COALESCE(NULLIF(f.classificacao_emenda_demanda, ''), e.natureza),
      ano                          = COALESCE(NULLIF(f.ano, ''), e.ano_refer),
      emenda                       = COALESCE(NULLIF(f.emenda, ''), e.codigo_num),
      emendas_agregadoras          = COALESCE(NULLIF(f.emendas_agregadoras, ''), e.num_emenda),
      parlamentar                  = COALESCE(NULLIF(f.parlamentar, ''), e.parlamentar),
      partido                      = COALESCE(NULLIF(f.partido, ''), e.partido),
      conveniado                   = COALESCE(NULLIF(f.conveniado, ''), e.beneficiario),
      municipio                    = COALESCE(NULLIF(f.municipio, ''), e.municipio),
      objeto                       = COALESCE(NULLIF(f.objeto, ''), e.objeto),
      regional                     = COALESCE(NULLIF(f.regional, ''), e.regional),
      portfolio                    = COALESCE(NULLIF(f.portfolio, ''), e.portfolio),
      valor                        = COALESCE(f.valor, e.valor)
    FROM emendas e
    WHERE TRIM(f.numero_convenio) = TRIM(e.num_convenio)
      AND f.numero_convenio IS NOT NULL
      AND f.numero_convenio != ''
    RETURNING f.id
  )
  SELECT COUNT(*) INTO v_updated FROM matched;

  -- ── PASSO 1b: Atualizar por codigo_num (usando temp tables indexadas) ─────
  WITH matched2 AS (
    UPDATE formalizacao f SET
      demanda                      = COALESCE(NULLIF(e.detalhes, ''), f.demanda),
      situacao_demandas_sempapel   = COALESCE(NULLIF(e.situacao_d, ''), f.situacao_demandas_sempapel),
      classificacao_emenda_demanda = COALESCE(NULLIF(f.classificacao_emenda_demanda, ''), e.natureza),
      ano                          = COALESCE(NULLIF(f.ano, ''), e.ano_refer),
      emendas_agregadoras          = COALESCE(NULLIF(f.emendas_agregadoras, ''), e.num_emenda),
      parlamentar                  = COALESCE(NULLIF(f.parlamentar, ''), e.parlamentar),
      partido                      = COALESCE(NULLIF(f.partido, ''), e.partido),
      conveniado                   = COALESCE(NULLIF(f.conveniado, ''), e.beneficiario),
      municipio                    = COALESCE(NULLIF(f.municipio, ''), e.municipio),
      objeto                       = COALESCE(NULLIF(f.objeto, ''), e.objeto),
      regional                     = COALESCE(NULLIF(f.regional, ''), e.regional),
      portfolio                    = COALESCE(NULLIF(f.portfolio, ''), e.portfolio),
      numero_convenio              = COALESCE(NULLIF(f.numero_convenio, ''), e.num_convenio),
      valor                        = COALESCE(f.valor, e.valor)
    FROM emendas e
    JOIN _e_digits ed ON ed.id = e.id
    JOIN _f_digits fd ON fd.digits = ed.digits   -- índice hash: O(N)
    WHERE f.id = fd.id
      -- Excluir registros já atualizados via convenio no passo anterior
      AND (f.numero_convenio IS NULL OR f.numero_convenio = ''
           OR NOT EXISTS (
             SELECT 1 FROM emendas ex
             WHERE TRIM(ex.num_convenio) = TRIM(f.numero_convenio)
           ))
    RETURNING f.id
  )
  SELECT COUNT(*) INTO v_updated2 FROM matched2;

  -- ── PASSO 2: Inserir emendas que não existem em formalizacao ─────────────
  -- LEFT JOIN para encontrar ausentes: O(N log N) via índice
  INSERT INTO formalizacao (
    ano, parlamentar, partido, emenda, demanda,
    classificacao_emenda_demanda, numero_convenio,
    regional, municipio, conveniado, objeto,
    portfolio, valor
  )
  SELECT
    e.ano_refer, e.parlamentar, e.partido, e.codigo_num, e.detalhes,
    e.natureza,  e.num_convenio, e.regional, e.municipio,
    e.beneficiario, e.objeto, e.portfolio, e.valor
  FROM emendas e
  JOIN _e_digits ed ON ed.id = e.id
  -- Não existe por código da emenda
  LEFT JOIN _f_digits fd ON fd.digits = ed.digits
  -- Não existe por numero_convenio
  LEFT JOIN formalizacao fconv
    ON ed.num_convenio_trim != ''
    AND TRIM(fconv.numero_convenio) = ed.num_convenio_trim
  WHERE fd.id IS NULL       -- sem match por codigo_num
    AND fconv.id IS NULL;   -- sem match por numero_convenio

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  -- Limpar temp tables explicitamente
  DROP TABLE IF EXISTS _e_digits;
  DROP TABLE IF EXISTS _f_digits;

  RETURN json_build_object(
    'updated',             v_updated + v_updated2,
    'updated_by_convenio', v_updated,
    'updated_by_emenda',   v_updated2,
    'inserted',            v_inserted,
    'message', (v_updated + v_updated2) || ' formalizacoes atualizadas, ' || v_inserted || ' novas inseridas'
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
