-- DIAGNOSTICAR PROBLEMA: Por que só 18 em vez de 1307?
-- Verificar o matching de emendas

-- 1. QUANTOS REGISTROS EXISTEM NA STAGING POR ANO?
SELECT 
  SUBSTR(emenda, 1, 4) as ano,
  COUNT(*) as total_staging
FROM formalizacao_recursos_tipos_staging
GROUP BY SUBSTR(emenda, 1, 4)
ORDER BY ano DESC;

-- 2. QUANTOS REGISTROS EXISTEM NA FORMALIZACAO POR ANO?
SELECT 
  SUBSTR(emenda, 1, 4) as ano,
  COUNT(*) as total_formalizacao
FROM formalizacao
GROUP BY SUBSTR(emenda, 1, 4)
ORDER BY ano DESC;

-- 3. QUANTOS REGISTROS NA FORMALIZACAO TEM tipo_formalizacao PREENCHIDO?
SELECT 
  SUBSTR(emenda, 1, 4) as ano,
  COUNT(*) as com_tipo
FROM formalizacao
WHERE tipo_formalizacao IS NOT NULL AND TRIM(tipo_formalizacao) != ''
GROUP BY SUBSTR(emenda, 1, 4)
ORDER BY ano DESC;

-- 4. VER ALGUNS REGISTROS DA STAGING PARA ENTENDER O FORMATO
SELECT 
  emenda,
  tipo_formalizacao,
  recurso,
  COUNT(*) as qtd_duplicatas
FROM formalizacao_recursos_tipos_staging
WHERE SUBSTR(emenda, 1, 4) = '2026'
GROUP BY emenda, tipo_formalizacao, recurso
LIMIT 20;

-- 5. VER A FORMALIZACAO ORIGINAL
SELECT 
  emenda,
  tipo_formalizacao,
  recurso
FROM formalizacao
WHERE SUBSTR(emenda, 1, 4) = '2026'
LIMIT 20;

-- 6. TESTAR MATCH: Quantos regitros da STAGING encontram correspondencia na FORMALIZACAO?
SELECT 
  COUNT(*) as staging_com_match
FROM formalizacao_recursos_tipos_staging s
WHERE EXISTS (
  SELECT 1 FROM formalizacao f 
  WHERE TRIM(f.emenda) = TRIM(s.emenda)
)
AND SUBSTR(s.emenda, 1, 4) = '2026';

-- 7. TESTAR MATCH INVERSO: Quantos registros da FORMALIZACAO encontram na STAGING?
SELECT 
  COUNT(*) as formalizacao_com_match
FROM formalizacao f
WHERE EXISTS (
  SELECT 1 FROM formalizacao_recursos_tipos_staging s 
  WHERE TRIM(f.emenda) = TRIM(s.emenda)
)
AND SUBSTR(f.emenda, 1, 4) = '2026';

-- 8. VER EMENDAS QUE NAO MATCHARAM
SELECT 
  s.emenda,
  s.tipo_formalizacao,
  s.recurso
FROM formalizacao_recursos_tipos_staging s
WHERE SUBSTR(s.emenda, 1, 4) = '2026'
  AND NOT EXISTS (
    SELECT 1 FROM formalizacao f 
    WHERE TRIM(f.emenda) = TRIM(s.emenda)
  )
LIMIT 20;
