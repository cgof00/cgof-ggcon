-- ============================================================
-- LIMPAR ZEROS DA COLUNA DEMANDA
-- Tabela: formalizacao
--
-- Objetivo: substituir por NULL (vazio) as células onde
-- a coluna 'demanda' contém apenas "0" (ou "0.0", "0 ", etc.)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. VISUALIZAR: quantas linhas serão afetadas
-- ─────────────────────────────────────────────────────────────
SELECT
  COUNT(*) FILTER (WHERE TRIM(CAST(demanda AS TEXT)) = '0')   AS so_zero,
  COUNT(*) FILTER (WHERE demanda IS NULL OR TRIM(CAST(demanda AS TEXT)) = '') AS ja_vazios,
  COUNT(*) FILTER (WHERE demanda IS NOT NULL AND TRIM(CAST(demanda AS TEXT)) NOT IN ('0',''))  AS com_valor,
  COUNT(*) AS total
FROM formalizacao;

-- ─────────────────────────────────────────────────────────────
-- 2. AMOSTRA das linhas que serão limpas
-- ─────────────────────────────────────────────────────────────
SELECT id, emenda, demanda
FROM formalizacao
WHERE TRIM(CAST(demanda AS TEXT)) = '0'
LIMIT 30;

-- ─────────────────────────────────────────────────────────────
-- 3. EXECUTAR: substituir "0" por NULL
-- ─────────────────────────────────────────────────────────────
BEGIN;

UPDATE formalizacao
SET
  demanda    = NULL,
  updated_at = NOW()
WHERE TRIM(CAST(demanda AS TEXT)) = '0';

-- Confirmar quantas linhas foram alteradas
SELECT COUNT(*) AS linhas_atualizadas
FROM formalizacao
WHERE updated_at >= NOW() - INTERVAL '5 seconds';

COMMIT;

-- ─────────────────────────────────────────────────────────────
-- 4. VERIFICAR: não deve sobrar nenhum "0" na coluna
-- ─────────────────────────────────────────────────────────────
SELECT COUNT(*) AS zeros_restantes
FROM formalizacao
WHERE TRIM(CAST(demanda AS TEXT)) = '0';
