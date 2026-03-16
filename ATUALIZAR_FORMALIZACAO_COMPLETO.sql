-- SOLUCAO: ATUALIZAR FORMALIZACAO COM TODOS OS DADOS
-- Garante que TODOS os 1307 registros sejam preenchidos corretamente

-- 1. PASSAR 1: Consolidar dados da STAGING (remover nulos e vazios)
-- Criar uma VIEW temporária com os melhores dados da staging por emenda
WITH staging_consolidado AS (
  SELECT DISTINCT ON (TRIM(emenda))
    TRIM(emenda) as emenda_limpa,
    NULLIF(TRIM(tipo_formalizacao), '') as tipo_formalizacao,
    NULLIF(TRIM(recurso), '') as recurso
  FROM formalizacao_recursos_tipos_staging
  WHERE emenda IS NOT NULL 
    AND TRIM(emenda) != ''
    AND (tipo_formalizacao IS NOT NULL OR recurso IS NOT NULL)
  ORDER BY TRIM(emenda), id DESC
)

-- 2. PASSAR 2: ATUALIZAR FORMALIZACAO COM ESSES DADOS
UPDATE formalizacao f
SET
  tipo_formalizacao = COALESCE(s.tipo_formalizacao, f.tipo_formalizacao),
  recurso = COALESCE(s.recurso, f.recurso),
  updated_at = NOW()
FROM staging_consolidado s
WHERE TRIM(f.emenda) = s.emenda_limpa
  AND (s.tipo_formalizacao IS NOT NULL OR s.recurso IS NOT NULL);

-- 3. CHECAR RESULTADO POR ANO
SELECT 
  SUBSTR(emenda, 1, 4) as ano,
  COUNT(*) as total_com_tipo,
  SUM(CASE WHEN tipo_formalizacao IS NOT NULL THEN 1 ELSE 0 END) as com_tipo_preenchido,
  SUM(CASE WHEN recurso IS NOT NULL THEN 1 ELSE 0 END) as com_recurso_preenchido
FROM formalizacao
WHERE SUBSTR(emenda, 1, 4) = '2026'
GROUP BY SUBSTR(emenda, 1, 4);

-- 4. VER AMOSTRA DOS RESULTADOS
SELECT 
  emenda,
  tipo_formalizacao,
  recurso,
  updated_at
FROM formalizacao
WHERE SUBSTR(emenda, 1, 4) = '2026' AND updated_at = NOW()
LIMIT 30;

-- 5. PERCENTUAL DE PREENCHIMENTO
SELECT 
  SUBSTR(emenda, 1, 4) as ano,
  COUNT(*) as total,
  SUM(CASE WHEN tipo_formalizacao IS NOT NULL AND TRIM(tipo_formalizacao) != '' THEN 1 ELSE 0 END) as com_tipo,
  ROUND(100.0 * SUM(CASE WHEN tipo_formalizacao IS NOT NULL AND TRIM(tipo_formalizacao) != '' THEN 1 ELSE 0 END) / COUNT(*), 2) as pct_tipo,
  SUM(CASE WHEN recurso IS NOT NULL AND TRIM(recurso) != '' THEN 1 ELSE 0 END) as com_recurso,
  ROUND(100.0 * SUM(CASE WHEN recurso IS NOT NULL AND TRIM(recurso) != '' THEN 1 ELSE 0 END) / COUNT(*), 2) as pct_recurso
FROM formalizacao
WHERE SUBSTR(emenda, 1, 4) = '2026'
GROUP BY SUBSTR(emenda, 1, 4);
