-- ============================================================
-- PASSO 2D: INSERIR emendas que NÃO existem na formalização
-- Execute DEPOIS do PASSO 2C
-- ============================================================
-- Usa LEFT JOIN (mais rápido que NOT EXISTS em tabelas grandes)
-- ============================================================

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
LEFT JOIN formalizacao f1
  ON TRIM(f1.numero_convenio) = TRIM(e.num_convenio)
  AND e.num_convenio IS NOT NULL AND TRIM(e.num_convenio) != ''
LEFT JOIN formalizacao f2
  ON TRIM(REGEXP_REPLACE(f2.emenda, '[^0-9]', '', 'g')) = TRIM(REGEXP_REPLACE(e.codigo_num, '[^0-9]', '', 'g'))
  AND e.codigo_num IS NOT NULL AND TRIM(e.codigo_num) != ''
  AND LENGTH(REGEXP_REPLACE(f2.emenda, '[^0-9]', '', 'g')) >= 8
WHERE f1.id IS NULL AND f2.id IS NULL;

-- RESUMO FINAL
SELECT 
  'formalizacao' as tabela, 
  COUNT(*) as total_registros 
FROM formalizacao
UNION ALL
SELECT 
  'emendas' as tabela, 
  COUNT(*) as total_registros 
FROM emendas;
