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
-- FUNÇÃO RPC DE SINCRONIZAÇÃO
-- Chamada pelo endpoint /api/emendas/sync-formalizacao
-- ============================================================

CREATE OR REPLACE FUNCTION sync_emendas_formalizacao()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated INTEGER := 0;
  v_updated2 INTEGER := 0;
  v_inserted INTEGER := 0;
BEGIN
  -- PASSO 1: Atualizar formalizações existentes que têm match por numero_convenio
  -- Só atualiza campos que estão vazios na formalização
  WITH matched AS (
    UPDATE formalizacao f SET
      demanda = COALESCE(NULLIF(f.demanda, ''), e.detalhes),
      classificacao_emenda_demanda = COALESCE(NULLIF(f.classificacao_emenda_demanda, ''), e.natureza),
      ano = COALESCE(NULLIF(f.ano, ''), e.ano_refer),
      emenda = COALESCE(NULLIF(f.emenda, ''), e.codigo_num),
      emendas_agregadoras = COALESCE(NULLIF(f.emendas_agregadoras, ''), e.num_emenda),
      situacao_demandas_sempapel = COALESCE(NULLIF(f.situacao_demandas_sempapel, ''), e.situacao_d),
      parlamentar = COALESCE(NULLIF(f.parlamentar, ''), e.parlamentar),
      partido = COALESCE(NULLIF(f.partido, ''), e.partido),
      conveniado = COALESCE(NULLIF(f.conveniado, ''), e.beneficiario),
      municipio = COALESCE(NULLIF(f.municipio, ''), e.municipio),
      objeto = COALESCE(NULLIF(f.objeto, ''), e.objeto),
      regional = COALESCE(NULLIF(f.regional, ''), e.regional),
      portfolio = COALESCE(NULLIF(f.portfolio, ''), e.portfolio),
      valor = COALESCE(f.valor, e.valor)
    FROM emendas e
    WHERE TRIM(f.numero_convenio) = TRIM(e.num_convenio)
      AND f.numero_convenio IS NOT NULL
      AND f.numero_convenio != ''
    RETURNING f.id
  )
  SELECT COUNT(*) INTO v_updated FROM matched;

  -- PASSO 1b: Atualizar formalizações que têm match por emenda/codigo_num
  -- (para registros que não foram encontrados pelo numero_convenio)
  WITH matched2 AS (
    UPDATE formalizacao f SET
      demanda = COALESCE(NULLIF(f.demanda, ''), e.detalhes),
      classificacao_emenda_demanda = COALESCE(NULLIF(f.classificacao_emenda_demanda, ''), e.natureza),
      ano = COALESCE(NULLIF(f.ano, ''), e.ano_refer),
      emendas_agregadoras = COALESCE(NULLIF(f.emendas_agregadoras, ''), e.num_emenda),
      situacao_demandas_sempapel = COALESCE(NULLIF(f.situacao_demandas_sempapel, ''), e.situacao_d),
      parlamentar = COALESCE(NULLIF(f.parlamentar, ''), e.parlamentar),
      partido = COALESCE(NULLIF(f.partido, ''), e.partido),
      conveniado = COALESCE(NULLIF(f.conveniado, ''), e.beneficiario),
      municipio = COALESCE(NULLIF(f.municipio, ''), e.municipio),
      objeto = COALESCE(NULLIF(f.objeto, ''), e.objeto),
      regional = COALESCE(NULLIF(f.regional, ''), e.regional),
      portfolio = COALESCE(NULLIF(f.portfolio, ''), e.portfolio),
      numero_convenio = COALESCE(NULLIF(f.numero_convenio, ''), e.num_convenio),
      valor = COALESCE(f.valor, e.valor)
    FROM emendas e
    WHERE TRIM(REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g')) = TRIM(REGEXP_REPLACE(e.codigo_num, '[^0-9]', '', 'g'))
      AND f.emenda IS NOT NULL
      AND f.emenda != ''
      AND LENGTH(REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g')) >= 8
    RETURNING f.id
  )
  SELECT COUNT(*) INTO v_updated2 FROM matched2;

  -- PASSO 2: Inserir emendas que não existem na formalização
  -- (emendas com num_convenio ou codigo_num que não tem correspondência)
  WITH new_records AS (
    INSERT INTO formalizacao (
      ano, parlamentar, partido, emenda, demanda,
      classificacao_emenda_demanda, numero_convenio,
      regional, municipio, conveniado, objeto,
      portfolio, valor
    )
    SELECT
      e.ano_refer,
      e.parlamentar,
      e.partido,
      e.codigo_num,
      e.detalhes,
      e.natureza,
      e.num_convenio,
      e.regional,
      e.municipio,
      e.beneficiario,
      e.objeto,
      e.portfolio,
      e.valor
    FROM emendas e
    WHERE e.num_convenio IS NOT NULL
      AND e.num_convenio != ''
      AND NOT EXISTS (
        SELECT 1 FROM formalizacao f
        WHERE TRIM(f.numero_convenio) = TRIM(e.num_convenio)
      )
      AND NOT EXISTS (
        SELECT 1 FROM formalizacao f
        WHERE LENGTH(REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g')) >= 8
          AND TRIM(REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g')) = TRIM(REGEXP_REPLACE(e.codigo_num, '[^0-9]', '', 'g'))
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_inserted FROM new_records;

  RETURN json_build_object(
    'updated', v_updated + v_updated2,
    'updated_by_convenio', v_updated,
    'updated_by_emenda', v_updated2,
    'inserted', v_inserted,
    'message', (v_updated + v_updated2) || ' formalizacoes atualizadas, ' || v_inserted || ' novas inseridas'
  );
END;
$$;

-- Dar permissão para o service_role executar a função
GRANT EXECUTE ON FUNCTION sync_emendas_formalizacao() TO service_role;

-- ============================================================
-- PRONTO! Após executar, teste a sincronização no sistema.
-- ============================================================
