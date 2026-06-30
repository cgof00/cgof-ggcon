-- ============================================================
-- PASSO 2B: ATUALIZAR formalizações por NUMERO_CONVENIO
-- Execute DEPOIS do PASSO 2A
-- ============================================================

UPDATE formalizacao f SET
  demanda = COALESCE(NULLIF(TRIM(f.demanda), ''), e.detalhes),
  classificacao_emenda_demanda = COALESCE(NULLIF(TRIM(f.classificacao_emenda_demanda), ''), e.natureza),
  ano = COALESCE(NULLIF(TRIM(f.ano), ''), e.ano_refer),
  emenda = COALESCE(NULLIF(TRIM(f.emenda), ''), e.codigo_num),
  emendas_agregadoras = COALESCE(NULLIF(TRIM(f.emendas_agregadoras), ''), e.num_emenda),
  situacao_demandas_sempapel = COALESCE(NULLIF(TRIM(f.situacao_demandas_sempapel), ''), e.situacao_d),
  parlamentar = COALESCE(NULLIF(TRIM(f.parlamentar), ''), e.parlamentar),
  partido = COALESCE(NULLIF(TRIM(f.partido), ''), e.partido),
  conveniado = COALESCE(NULLIF(TRIM(f.conveniado), ''), e.beneficiario),
  municipio = COALESCE(NULLIF(TRIM(f.municipio), ''), e.municipio),
  objeto = COALESCE(NULLIF(TRIM(f.objeto), ''), e.objeto),
  regional = COALESCE(NULLIF(TRIM(f.regional), ''), e.regional),
  portfolio = COALESCE(NULLIF(TRIM(f.portfolio), ''), e.portfolio),
  valor = COALESCE(f.valor, e.valor)
FROM emendas e
WHERE TRIM(f.numero_convenio) = TRIM(e.num_convenio)
  AND f.numero_convenio IS NOT NULL
  AND TRIM(f.numero_convenio) != '';

-- Conferir quantos foram atualizados
DO $$
DECLARE cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM formalizacao f
  INNER JOIN emendas e ON TRIM(f.numero_convenio) = TRIM(e.num_convenio)
  WHERE f.numero_convenio IS NOT NULL AND TRIM(f.numero_convenio) != '';
  RAISE NOTICE '✅ PASSO 2B: % formalizações com match por numero_convenio', cnt;
END $$;
