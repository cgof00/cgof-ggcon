-- ============================================================
-- FORÇAR SINCRONIZAÇÃO DA COLUNA CLASSIFICAÇÃO
-- Execute cada bloco separadamente no Supabase SQL Editor
-- ============================================================

-- ============================================================
-- BLOCO 1: DIAGNÓSTICO DEFINITIVO — Execute e cole o resultado aqui
-- ============================================================

-- 1A) Quais colunas "classif%" existem na tabela formalizacao?
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'formalizacao' 
  AND column_name LIKE '%classif%';

-- 1B) A coluna é "classificacao" ou "classificacao_emenda_demanda"?
SELECT column_name
FROM information_schema.columns 
WHERE table_name = 'formalizacao' 
  AND column_name IN ('classificacao', 'classificacao_emenda_demanda');

-- 1C) Quais colunas "convenio%" existem?
SELECT column_name
FROM information_schema.columns 
WHERE table_name = 'formalizacao' 
  AND column_name IN ('num_convenio', 'numero_convenio');

-- 1D) Natureza na tabela emendas tem dados?
SELECT 
  COUNT(*) AS total_emendas,
  COUNT(NULLIF(TRIM(COALESCE(natureza, '')), '')) AS com_natureza
FROM emendas;

-- 1E) Amostra de natureza
SELECT DISTINCT natureza FROM emendas 
WHERE natureza IS NOT NULL AND TRIM(natureza) != '' 
LIMIT 10;

-- 1F) Quantos matches existem entre emendas e formalizacao?
-- (tenta ambos nomes de coluna - um vai funcionar, outro pode dar erro)
-- Se der erro, comente a linha que falhar e rode de novo

-- Tenta com num_convenio:
SELECT 'match_num_convenio' AS tipo, COUNT(*) AS total
FROM formalizacao f
JOIN emendas e ON TRIM(f.num_convenio) = TRIM(e.num_convenio)
WHERE f.num_convenio IS NOT NULL AND TRIM(f.num_convenio) != '';

-- OU tenta com numero_convenio (descomente se o de cima der erro):
-- SELECT 'match_numero_convenio' AS tipo, COUNT(*) AS total
-- FROM formalizacao f
-- JOIN emendas e ON TRIM(f.numero_convenio) = TRIM(e.num_convenio)
-- WHERE f.numero_convenio IS NOT NULL AND TRIM(f.numero_convenio) != '';


-- ============================================================
-- BLOCO 2: UPDATE DIRETO (sem função RPC)
-- Usa "classificacao" — SE o bloco 1 mostrou essa coluna, execute este
-- Se o bloco 1 mostrou "classificacao_emenda_demanda", vá para o BLOCO 2B
-- ============================================================

-- Limpar caracteres invisíveis em natureza
UPDATE emendas SET natureza = REGEXP_REPLACE(TRIM(natureza), E'[\\x00-\\x1F\\x7F\\xA0]', '', 'g')
WHERE natureza IS NOT NULL;

-- Zerar classificação para forçar reescrita
UPDATE formalizacao SET classificacao = NULL;

-- UPDATE direto por num_convenio (sem RPC, sem função)
UPDATE formalizacao f SET
  classificacao = TRIM(e.natureza)
FROM emendas e
WHERE TRIM(f.num_convenio) = TRIM(e.num_convenio)
  AND f.num_convenio IS NOT NULL AND TRIM(f.num_convenio) != ''
  AND e.natureza IS NOT NULL AND TRIM(e.natureza) != '';

-- UPDATE direto por emenda/codigo_num 
UPDATE formalizacao f SET
  classificacao = TRIM(e.natureza)
FROM emendas e
WHERE TRIM(f.emenda) = TRIM(e.codigo_num)
  AND f.emenda IS NOT NULL AND TRIM(f.emenda) != ''
  AND e.natureza IS NOT NULL AND TRIM(e.natureza) != ''
  AND (f.classificacao IS NULL OR TRIM(f.classificacao) = '');

-- Verificar resultado
SELECT 
  COUNT(*) AS total,
  COUNT(NULLIF(TRIM(COALESCE(classificacao, '')), '')) AS com_classificacao,
  COUNT(*) - COUNT(NULLIF(TRIM(COALESCE(classificacao, '')), '')) AS sem_classificacao
FROM formalizacao;

SELECT classificacao, COUNT(*) AS qtd
FROM formalizacao
WHERE classificacao IS NOT NULL AND TRIM(classificacao) != ''
GROUP BY classificacao
ORDER BY qtd DESC
LIMIT 20;


-- ============================================================
-- BLOCO 2B: UPDATE DIRETO (SE a coluna for classificacao_emenda_demanda)
-- Execute APENAS se o BLOCO 1 mostrou "classificacao_emenda_demanda"
-- ============================================================

-- Limpar caracteres invisíveis em natureza
-- UPDATE emendas SET natureza = REGEXP_REPLACE(TRIM(natureza), E'[\\x00-\\x1F\\x7F\\xA0]', '', 'g')
-- WHERE natureza IS NOT NULL;

-- Zerar classificação para forçar reescrita
-- UPDATE formalizacao SET classificacao_emenda_demanda = NULL;

-- UPDATE direto por numero_convenio
-- UPDATE formalizacao f SET
--   classificacao_emenda_demanda = TRIM(e.natureza)
-- FROM emendas e
-- WHERE TRIM(f.numero_convenio) = TRIM(e.num_convenio)
--   AND f.numero_convenio IS NOT NULL AND TRIM(f.numero_convenio) != ''
--   AND e.natureza IS NOT NULL AND TRIM(e.natureza) != '';

-- UPDATE direto por emenda/codigo_num 
-- UPDATE formalizacao f SET
--   classificacao_emenda_demanda = TRIM(e.natureza)
-- FROM emendas e
-- WHERE TRIM(f.emenda) = TRIM(e.codigo_num)
--   AND f.emenda IS NOT NULL AND TRIM(f.emenda) != ''
--   AND e.natureza IS NOT NULL AND TRIM(e.natureza) != ''
--   AND (f.classificacao_emenda_demanda IS NULL OR TRIM(f.classificacao_emenda_demanda) = '');

-- Verificar resultado
-- SELECT 
--   COUNT(*) AS total,
--   COUNT(NULLIF(TRIM(COALESCE(classificacao_emenda_demanda, '')), '')) AS com_classificacao,
--   COUNT(*) - COUNT(NULLIF(TRIM(COALESCE(classificacao_emenda_demanda, '')), '')) AS sem_classificacao
-- FROM formalizacao;
