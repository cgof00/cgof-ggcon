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
  v_updated   INTEGER := 0;
  v_updated2  INTEGER := 0;
  v_inserted  INTEGER := 0;
  v_cleared   INTEGER := 0;
  v_concluded INTEGER := 0;
  v_total     INTEGER;
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
      e.valor, e.num_emenda, e.situacao_d, e.situacao_e,
      e.data_publicacao, e.vigencia,
      COALESCE(e.parecer_ld, '')                                           AS parecer_ld,
      TRIM(REGEXP_REPLACE(COALESCE(e.codigo_num, ''), '[^0-9]', '', 'g')) AS digits,
      TRIM(COALESCE(e.num_convenio, ''))                                   AS conv_trim,
      -- Situação Demanda (coluna H) OU Situação Emenda (coluna G) indicando que o processo
      -- já foi para o SIAFEM: a planilha nem sempre preenche a coluna H para esse estágio
      -- (casos observados com H vazio e a mesma informação só em G) — checar as duas evita
      -- perder linhas. A demanda deve receber Publicação (coluna X) e Vigência (coluna AE)
      -- da planilha e ser concluída automaticamente, sem esperar o técnico preencher na mão.
      (
        UPPER(TRIM(COALESCE(e.situacao_d, ''))) IN ('PROCESSO SIAFEM', 'PROCESSO SIAFEM - FUNDO A FUNDO')
        OR UPPER(TRIM(COALESCE(e.situacao_e, ''))) IN ('PROCESSO SIAFEM', 'PROCESSO SIAFEM - FUNDO A FUNDO')
      ) AS siafem_concluido
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
      demanda                      = COALESCE(NULLIF(TRIM(b.detalhes), ''), f.demanda),
      situacao_demandas_sempapel   = COALESCE(NULLIF(TRIM(b.situacao_d), ''), f.situacao_demandas_sempapel),
      situacao_emenda              = COALESCE(NULLIF(TRIM(b.situacao_e), ''), f.situacao_emenda),
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
      valor                        = COALESCE(NULLIF(b.valor, 0), f.valor),
      parecer_ld                   = COALESCE(NULLIF(b.parecer_ld, ''), f.parecer_ld),
      -- Processo SIAFEM: recebe Publicação/Vigência da planilha e conclui automaticamente
      -- (não sobrescreve se já preenchido manualmente antes)
      publicacao                   = CASE WHEN b.siafem_concluido THEN COALESCE(NULLIF(f.publicacao, ''), NULLIF(TRIM(b.data_publicacao), '')) ELSE f.publicacao END,
      vigencia                     = CASE WHEN b.siafem_concluido THEN COALESCE(NULLIF(f.vigencia, ''), NULLIF(TRIM(b.vigencia), '')) ELSE f.vigencia END,
      concluida_em                 = CASE WHEN b.siafem_concluido THEN COALESCE(NULLIF(f.concluida_em, ''), TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')) ELSE f.concluida_em END
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
      demanda                      = COALESCE(NULLIF(TRIM(b.detalhes), ''), f.demanda),
      situacao_demandas_sempapel   = COALESCE(NULLIF(TRIM(b.situacao_d), ''), f.situacao_demandas_sempapel),
      situacao_emenda              = COALESCE(NULLIF(TRIM(b.situacao_e), ''), f.situacao_emenda),
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
      valor                        = COALESCE(NULLIF(b.valor, 0), f.valor),
      parecer_ld                   = COALESCE(NULLIF(b.parecer_ld, ''), f.parecer_ld),
      -- Processo SIAFEM: recebe Publicação/Vigência da planilha e conclui automaticamente
      -- (não sobrescreve se já preenchido manualmente antes)
      publicacao                   = CASE WHEN b.siafem_concluido THEN COALESCE(NULLIF(f.publicacao, ''), NULLIF(TRIM(b.data_publicacao), '')) ELSE f.publicacao END,
      vigencia                     = CASE WHEN b.siafem_concluido THEN COALESCE(NULLIF(f.vigencia, ''), NULLIF(TRIM(b.vigencia), '')) ELSE f.vigencia END,
      concluida_em                 = CASE WHEN b.siafem_concluido THEN COALESCE(NULLIF(f.concluida_em, ''), TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')) ELSE f.concluida_em END
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
    regional, municipio, conveniado, objeto, portfolio, valor,
    parecer_ld, situacao_emenda,
    publicacao, vigencia, concluida_em
  )
  SELECT
    b.ano_refer, b.parlamentar, b.partido, b.codigo_num, b.detalhes,
    b.natureza,  b.num_convenio, b.regional, b.municipio,
    b.beneficiario, b.objeto, b.portfolio, b.valor,
    NULLIF(b.parecer_ld, ''),
    NULLIF(TRIM(b.situacao_e), ''),
    CASE WHEN b.siafem_concluido THEN NULLIF(TRIM(b.data_publicacao), '') ELSE NULL END,
    CASE WHEN b.siafem_concluido THEN NULLIF(TRIM(b.vigencia), '') ELSE NULL END,
    CASE WHEN b.siafem_concluido THEN TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') ELSE NULL END
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

  -- PASSO 3 (somente no ultimo lote): Limpar demanda de registros nao encontrados na planilha importada
  -- Se um registro em formalizacao nao tem emenda correspondente no staging (emendas),
  -- o numero da demanda e removido pois a planilha nao o reconhece mais.
  -- Guarda: requer ao menos 100 registros no staging para evitar limpeza acidental.
  IF NOT (p_offset + p_limit < v_total) AND v_total > 100 THEN
    UPDATE formalizacao f
    SET demanda = NULL
    WHERE
      f.demanda IS NOT NULL
      AND TRIM(f.demanda) != ''
      -- Nao existe correspondencia por emenda (codigo normalizado)
      AND NOT EXISTS (
        SELECT 1 FROM emendas e
        WHERE NULLIF(TRIM(REGEXP_REPLACE(COALESCE(e.codigo_num,''), '[^0-9]', '', 'g')), '') IS NOT NULL
          AND TRIM(REGEXP_REPLACE(COALESCE(f.emenda,''), '[^0-9]', '', 'g'))
            = TRIM(REGEXP_REPLACE(COALESCE(e.codigo_num,''), '[^0-9]', '', 'g'))
      );
    GET DIAGNOSTICS v_cleared = ROW_COUNT;
  END IF;

  -- PASSO 4 (somente no último lote): Concluir retroativamente demandas cuja Área – Estágio
  -- (campo controlado dentro do próprio app, não vem da planilha) já está em "PROCESSO SIAFEM"
  -- ou "PROCESSO SIAFEM - FUNDO A FUNDO" mas nunca foram concluídas — cobre tanto quem chegou
  -- nesse estágio direto pelo select do técnico/conferencista quanto casos em que o PASSO 1/1b
  -- não encontrou a linha correspondente no lote da planilha.
  --
  -- Dividido em duas atualizações INDEPENDENTES de propósito: se o staging `emendas` estiver
  -- vazio nesse momento (ex: sincronização manual sem reimportar a planilha antes), Publicação/
  -- Vigência não têm de onde vir — mas ainda assim marcamos concluída_em. Se a trava dependesse
  -- só de concluida_em (como antes), uma sincronização futura JÁ COM a planilha importada nunca
  -- mais preencheria Publicação/Vigência desses registros, porque eles já não estariam mais
  -- "vazios". Por isso o preenchimento de Publicação/Vigência tem sua própria condição, que
  -- continua valendo mesmo depois da demanda já estar concluída.
  IF NOT (p_offset + p_limit < v_total) THEN
    -- 4a: preenche Publicação/Vigência a partir da planilha sempre que faltar, mesmo se a
    -- demanda já tiver sido concluída antes (ex: por uma sincronização anterior sem staging).
    -- Dividido em dois UPDATEs (convênio, depois dígitos da emenda) em vez de um JOIN com OR:
    -- um único ON com OR entre duas expressões indexadas de tabelas diferentes costuma forçar
    -- o Postgres a abandonar os índices e varrer emendas inteira por linha de formalizacao
    -- filtrada — foi exatamente isso que estourou o timeout de 24s no último lote. Separado
    -- assim, cada UPDATE usa o índice correspondente (idx_emendas_trim_num_convenio /
    -- idx_emendas_codigo_num_digits), igual ao padrão já usado nos PASSOS 1 e 1b.
    UPDATE formalizacao f SET
      publicacao = COALESCE(NULLIF(f.publicacao, ''), NULLIF(TRIM(e.data_publicacao), '')),
      vigencia   = COALESCE(NULLIF(f.vigencia, ''), NULLIF(TRIM(e.vigencia), ''))
    FROM emendas e
    WHERE UPPER(TRIM(COALESCE(f.area_estagio_situacao_demanda, ''))) IN ('PROCESSO SIAFEM', 'PROCESSO SIAFEM - FUNDO A FUNDO')
      AND ((f.publicacao IS NULL OR TRIM(f.publicacao) = '') OR (f.vigencia IS NULL OR TRIM(f.vigencia) = ''))
      AND TRIM(COALESCE(f.numero_convenio, '')) != ''
      AND TRIM(f.numero_convenio) = TRIM(COALESCE(e.num_convenio, ''));

    UPDATE formalizacao f SET
      publicacao = COALESCE(NULLIF(f.publicacao, ''), NULLIF(TRIM(e.data_publicacao), '')),
      vigencia   = COALESCE(NULLIF(f.vigencia, ''), NULLIF(TRIM(e.vigencia), ''))
    FROM emendas e
    WHERE UPPER(TRIM(COALESCE(f.area_estagio_situacao_demanda, ''))) IN ('PROCESSO SIAFEM', 'PROCESSO SIAFEM - FUNDO A FUNDO')
      AND ((f.publicacao IS NULL OR TRIM(f.publicacao) = '') OR (f.vigencia IS NULL OR TRIM(f.vigencia) = ''))
      AND LENGTH(TRIM(REGEXP_REPLACE(COALESCE(f.emenda, ''), '[^0-9]', '', 'g'))) >= 6
      AND TRIM(REGEXP_REPLACE(COALESCE(f.emenda, ''), '[^0-9]', '', 'g'))
        = TRIM(REGEXP_REPLACE(COALESCE(e.codigo_num, ''), '[^0-9]', '', 'g'));

    -- 4b: marca concluida_em (não sobrescreve se já preenchida) para toda demanda no estágio
    -- "PROCESSO SIAFEM" — independente de ter achado Publicação/Vigência ou não.
    WITH upd AS (
      UPDATE formalizacao f SET
        concluida_em = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
      WHERE UPPER(TRIM(COALESCE(f.area_estagio_situacao_demanda, ''))) IN ('PROCESSO SIAFEM', 'PROCESSO SIAFEM - FUNDO A FUNDO')
        AND (f.concluida_em IS NULL OR TRIM(f.concluida_em) = '')
      RETURNING f.id
    )
    SELECT COUNT(*) INTO v_concluded FROM upd;
  END IF;

  RETURN json_build_object(
    'updated',   v_updated + v_updated2,
    'inserted',  v_inserted,
    'offset',    p_offset,
    'limit',     p_limit,
    'total',     v_total,
    'cleared',   v_cleared,
    'concluded', v_concluded,
    'has_more', (p_offset + p_limit < v_total),
    -- No último lote, retorna o total real de formalizações p/ calcular novas inseridas
    'formalizacao_count', CASE WHEN NOT (p_offset + p_limit < v_total)
      THEN (SELECT COUNT(*)::int FROM formalizacao)
      ELSE NULL
    END
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

-- ============================================================
-- FUNÇÃO AUXILIAR: TRUNCATE do staging (usa TRUNCATE em vez de DELETE
-- para devolver espaço em disco imediatamente - sem bloat)
-- ============================================================
CREATE OR REPLACE FUNCTION truncate_emendas_staging()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  TRUNCATE TABLE emendas RESTART IDENTITY;
  RETURN json_build_object('truncated', true, 'message', 'emendas staging truncated');
END;
$$;

GRANT EXECUTE ON FUNCTION truncate_emendas_staging() TO service_role;

-- IMPORTANTE: Recarregar o cache do PostgREST para reconhecer a nova função
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- PRONTO! Após executar, teste a sincronização no sistema.
-- ============================================================
