-- ============================================================
-- REMOVER ZEROS E PONTOS DA COLUNA EMENDA
-- Tabela: formalizacao
--
-- Objetivo: normalizar a coluna 'emenda' para somente dígitos,
-- removendo pontos e zeros de preenchimento (LPAD).
--
-- Exemplos de transformação:
--   '2026.005.80418'   →  '202600580418'
--   '0022.001.12345'   →  '2200112345'    (remove apenas não-dígitos)
--   '0000.005.80418'   →  '000000580418'  (mantém zeros que fazem parte do número)
--
-- OBS: O frontend (formatEmendaNumber) exibirá com pontos automaticamente.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. VISUALIZAR ESTADO ATUAL (execute antes para conferir)
-- ─────────────────────────────────────────────────────────────
SELECT
  emenda,
  REGEXP_REPLACE(emenda, '[^0-9]', '', 'g') AS emenda_somente_digitos,
  LENGTH(emenda)                             AS tamanho_atual,
  LENGTH(REGEXP_REPLACE(emenda, '[^0-9]', '', 'g')) AS tamanho_novo
FROM formalizacao
WHERE emenda IS NOT NULL
  AND emenda ~ '\.'          -- somente linhas que já têm ponto(s)
LIMIT 50;

-- ─────────────────────────────────────────────────────────────
-- 2. CONTAGEM: quantas linhas serão afetadas
-- ─────────────────────────────────────────────────────────────
SELECT
  COUNT(*) FILTER (WHERE emenda ~ '\.')  AS com_pontos,
  COUNT(*) FILTER (WHERE emenda !~ '\.' AND emenda IS NOT NULL AND TRIM(emenda) != '') AS sem_pontos,
  COUNT(*) FILTER (WHERE emenda IS NULL OR TRIM(emenda) = '') AS vazios,
  COUNT(*)                                AS total
FROM formalizacao;

-- ─────────────────────────────────────────────────────────────
-- 3. EXECUTAR A ATUALIZAÇÃO
--    Remove TODOS os caracteres não-numéricos (pontos, espaços, traços, etc.)
-- ─────────────────────────────────────────────────────────────
BEGIN;

UPDATE formalizacao
SET
  emenda    = REGEXP_REPLACE(emenda, '[^0-9]', '', 'g'),
  updated_at = NOW()
WHERE emenda IS NOT NULL
  AND TRIM(emenda) != ''
  AND emenda ~ '[^0-9]';   -- somente linhas que têm algum caractere não-numérico

-- Verificar quantas linhas foram atualizadas
SELECT COUNT(*) AS linhas_atualizadas
FROM formalizacao
WHERE updated_at >= NOW() - INTERVAL '5 seconds';

COMMIT;

-- ─────────────────────────────────────────────────────────────
-- 4. VERIFICAR RESULTADO APÓS A ATUALIZAÇÃO
-- ─────────────────────────────────────────────────────────────

-- Checar se ainda restam pontos ou caracteres estranhos
SELECT COUNT(*) AS ainda_com_pontos
FROM formalizacao
WHERE emenda ~ '[^0-9]'
  AND emenda IS NOT NULL
  AND TRIM(emenda) != '';

-- Amostra dos valores normalizados
SELECT DISTINCT emenda, LENGTH(emenda) AS tamanho
FROM formalizacao
WHERE emenda IS NOT NULL AND TRIM(emenda) != ''
ORDER BY tamanho DESC, emenda
LIMIT 30;
