-- ============================================================
-- PASSO 2C: ATUALIZAR formalizações por EMENDA/CODIGO_NUM
-- Execute DEPOIS do PASSO 2B
-- (para registros que não foram encontrados pelo numero_convenio)
-- ============================================================

UPDATE formalizacao f SET
  demanda = COALESCE(NULLIF(TRIM(f.demanda), ''), e.detalhes),
  classificacao_emenda_demanda = COALESCE(NULLIF(TRIM(f.classificacao_emenda_demanda), ''), e.natureza),
  ano = COALESCE(NULLIF(TRIM(f.ano), ''), e.ano_refer),
  emendas_agregadoras = COALESCE(NULLIF(TRIM(f.emendas_agregadoras), ''), e.num_emenda),
  situacao_demandas_sempapel = COALESCE(NULLIF(TRIM(f.situacao_demandas_sempapel), ''), e.situacao_d),
  parlamentar = COALESCE(NULLIF(TRIM(f.parlamentar), ''), e.parlamentar),
  partido = COALESCE(NULLIF(TRIM(f.partido), ''), e.partido),
  conveniado = COALESCE(NULLIF(TRIM(f.conveniado), ''), e.beneficiario),
  municipio = COALESCE(NULLIF(TRIM(f.municipio), ''), e.municipio),
  objeto = COALESCE(NULLIF(TRIM(f.objeto), ''), e.objeto),
  regional = COALESCE(NULLIF(TRIM(f.regional), ''), e.regional),
  portfolio = COALESCE(NULLIF(TRIM(f.portfolio), ''), e.portfolio),
  numero_convenio = COALESCE(NULLIF(TRIM(f.numero_convenio), ''), e.num_convenio),
  valor = COALESCE(f.valor, e.valor)
FROM emendas e
WHERE REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g') = REGEXP_REPLACE(e.codigo_num, '[^0-9]', '', 'g')
  AND f.emenda IS NOT NULL
  AND TRIM(f.emenda) != ''
  AND LENGTH(REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g')) >= 8
  AND (f.numero_convenio IS NULL OR TRIM(f.numero_convenio) = '' 
       OR NOT EXISTS (
         SELECT 1 FROM emendas e2 
         WHERE TRIM(f.numero_convenio) = TRIM(e2.num_convenio)
       ));

-- Conferir quantos foram atualizados
DO $$
DECLARE cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM formalizacao f
  INNER JOIN emendas e ON REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g') = REGEXP_REPLACE(e.codigo_num, '[^0-9]', '', 'g')
  WHERE f.emenda IS NOT NULL AND TRIM(f.emenda) != ''
    AND LENGTH(REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g')) >= 8;
  RAISE NOTICE '✅ PASSO 2C: % formalizações com match por emenda/codigo_num', cnt;
END $$;
