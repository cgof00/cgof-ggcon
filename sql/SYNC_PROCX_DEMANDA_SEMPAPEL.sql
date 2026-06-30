-- ============================================================
-- ATUALIZAR FUNÇÃO DE SYNC: Comportamento PROCX para
--   demanda + situacao_demandas_sempapel
-- ============================================================
-- PROCX = o valor do CSV (staging emendas) SEMPRE prevalece
-- quando existe. Só mantém o valor atual se o CSV estiver vazio.
-- Diferença do comportamento antigo:
--   ANTES: só preenchia se o campo já estava vazio (fill-blank)
--   AGORA: sempre atualiza com o valor do CSV quando há match
-- ============================================================
-- Execute no: https://supabase.com/dashboard → SQL Editor
-- ============================================================

-- PASSO 1: Recriar a função sync com comportamento PROCX
CREATE OR REPLACE FUNCTION sync_emendas_formalizacao()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '300s'
AS $$
DECLARE
  v_updated INTEGER := 0;
  v_updated2 INTEGER := 0;
  v_inserted INTEGER := 0;
BEGIN
  -- Match por numero_convenio
  -- PROCX: demanda e situacao_demandas_sempapel sempre vêm do CSV
  -- Outros campos: preenche apenas se vazios (não sobrescreve dados manuais)
  WITH matched AS (
    UPDATE formalizacao f SET
      demanda                    = COALESCE(NULLIF(e.detalhes, ''), f.demanda),
      situacao_demandas_sempapel = COALESCE(NULLIF(e.situacao_d, ''), f.situacao_demandas_sempapel),
      classificacao_emenda_demanda = COALESCE(NULLIF(f.classificacao_emenda_demanda, ''), e.natureza),
      ano                        = COALESCE(NULLIF(f.ano, ''), e.ano_refer),
      emenda                     = COALESCE(NULLIF(f.emenda, ''), e.codigo_num),
      emendas_agregadoras        = COALESCE(NULLIF(f.emendas_agregadoras, ''), e.num_emenda),
      parlamentar                = COALESCE(NULLIF(f.parlamentar, ''), e.parlamentar),
      partido                    = COALESCE(NULLIF(f.partido, ''), e.partido),
      conveniado                 = COALESCE(NULLIF(f.conveniado, ''), e.beneficiario),
      municipio                  = COALESCE(NULLIF(f.municipio, ''), e.municipio),
      objeto                     = COALESCE(NULLIF(f.objeto, ''), e.objeto),
      regional                   = COALESCE(NULLIF(f.regional, ''), e.regional),
      portfolio                  = COALESCE(NULLIF(f.portfolio, ''), e.portfolio),
      valor                      = COALESCE(f.valor, e.valor)
    FROM emendas e
    WHERE TRIM(f.numero_convenio) = TRIM(e.num_convenio)
      AND f.numero_convenio IS NOT NULL
      AND f.numero_convenio != ''
    RETURNING f.id
  )
  SELECT COUNT(*) INTO v_updated FROM matched;

  -- Match por codigo_num (emendas sem convênio vinculado)
  WITH matched2 AS (
    UPDATE formalizacao f SET
      demanda                    = COALESCE(NULLIF(e.detalhes, ''), f.demanda),
      situacao_demandas_sempapel = COALESCE(NULLIF(e.situacao_d, ''), f.situacao_demandas_sempapel),
      classificacao_emenda_demanda = COALESCE(NULLIF(f.classificacao_emenda_demanda, ''), e.natureza),
      ano                        = COALESCE(NULLIF(f.ano, ''), e.ano_refer),
      emendas_agregadoras        = COALESCE(NULLIF(f.emendas_agregadoras, ''), e.num_emenda),
      parlamentar                = COALESCE(NULLIF(f.parlamentar, ''), e.parlamentar),
      partido                    = COALESCE(NULLIF(f.partido, ''), e.partido),
      conveniado                 = COALESCE(NULLIF(f.conveniado, ''), e.beneficiario),
      municipio                  = COALESCE(NULLIF(f.municipio, ''), e.municipio),
      objeto                     = COALESCE(NULLIF(f.objeto, ''), e.objeto),
      regional                   = COALESCE(NULLIF(f.regional, ''), e.regional),
      portfolio                  = COALESCE(NULLIF(f.portfolio, ''), e.portfolio),
      numero_convenio            = COALESCE(NULLIF(f.numero_convenio, ''), e.num_convenio),
      valor                      = COALESCE(f.valor, e.valor)
    FROM emendas e
    WHERE TRIM(REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g')) = TRIM(REGEXP_REPLACE(e.codigo_num, '[^0-9]', '', 'g'))
      AND f.emenda IS NOT NULL
      AND f.emenda != ''
      AND LENGTH(REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g')) >= 8
    RETURNING f.id
  )
  SELECT COUNT(*) INTO v_updated2 FROM matched2;

  -- Inserir emendas novas (sem correspondência em formalizacao)
  -- INCLUI emendas com OU SEM num_convenio (novas emendas ainda sem convênio)
  WITH new_records AS (
    INSERT INTO formalizacao (
      ano, parlamentar, partido, emenda, demanda,
      classificacao_emenda_demanda, numero_convenio,
      regional, municipio, conveniado, objeto, portfolio, valor
    )
    SELECT
      e.ano_refer, e.parlamentar, e.partido, e.codigo_num, e.detalhes,
      e.natureza, e.num_convenio, e.regional, e.municipio,
      e.beneficiario, e.objeto, e.portfolio, e.valor
    FROM emendas e
    WHERE
      -- Se tiver num_convenio, não deve já existir por convenio
      NOT EXISTS (
        SELECT 1 FROM formalizacao f
        WHERE e.num_convenio IS NOT NULL AND e.num_convenio != ''
          AND TRIM(f.numero_convenio) = TRIM(e.num_convenio)
      )
      -- Não deve existir por codigo_num (emenda já importada)
      AND NOT EXISTS (
        SELECT 1 FROM formalizacao f
        WHERE f.emenda IS NOT NULL AND f.emenda != ''
          AND LENGTH(TRIM(REGEXP_REPLACE(e.codigo_num, '[^0-9]', '', 'g'))) >= 6
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

GRANT EXECUTE ON FUNCTION sync_emendas_formalizacao() TO service_role;
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- PASSO 2 (OPCIONAL): Atualizar AGORA toda a tabela formalizacao
-- com os dados da última importação de emendas (staging)
-- Útil para corrigir registros ya existentes sem precisar
-- reimportar o CSV.
-- ============================================================

-- Match por numero_convenio
UPDATE formalizacao f SET
  demanda                    = COALESCE(NULLIF(e.detalhes, ''), f.demanda),
  situacao_demandas_sempapel = COALESCE(NULLIF(e.situacao_d, ''), f.situacao_demandas_sempapel),
  updated_at                 = NOW()
FROM emendas e
WHERE TRIM(f.numero_convenio) = TRIM(e.num_convenio)
  AND f.numero_convenio IS NOT NULL AND f.numero_convenio != ''
  AND (
    NULLIF(e.detalhes, '') IS NOT NULL OR NULLIF(e.situacao_d, '') IS NOT NULL
  );

-- Match por emenda/codigo_num
UPDATE formalizacao f SET
  demanda                    = COALESCE(NULLIF(e.detalhes, ''), f.demanda),
  situacao_demandas_sempapel = COALESCE(NULLIF(e.situacao_d, ''), f.situacao_demandas_sempapel),
  updated_at                 = NOW()
FROM emendas e
WHERE TRIM(REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g')) = TRIM(REGEXP_REPLACE(e.codigo_num, '[^0-9]', '', 'g'))
  AND f.emenda IS NOT NULL AND f.emenda != ''
  AND LENGTH(REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g')) >= 8
  AND (
    NULLIF(e.detalhes, '') IS NOT NULL OR NULLIF(e.situacao_d, '') IS NOT NULL
  );

-- Verificar resultado
SELECT
  COUNT(*) FILTER (WHERE demanda IS NOT NULL AND demanda != '')                AS formalizacao_com_demanda,
  COUNT(*) FILTER (WHERE situacao_demandas_sempapel IS NOT NULL AND situacao_demandas_sempapel != '') AS formalizacao_com_sempapel,
  COUNT(*)                                                                      AS total
FROM formalizacao;
