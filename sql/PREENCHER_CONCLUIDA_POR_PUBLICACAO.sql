-- ============================================================
-- PREENCHER CONCLUIDA_EM A PARTIR DA COLUNA PUBLICACAO
-- Tabela: formalizacao
--
-- Regra: se a coluna 'publicacao' tiver uma data preenchida
-- e a coluna 'concluida_em' estiver vazia/nula,
-- preencher 'concluida_em' com o valor de 'publicacao'.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. VISUALIZAR: quantas linhas serão afetadas
-- ─────────────────────────────────────────────────────────────
SELECT
  COUNT(*) FILTER (
    WHERE publicacao IS NOT NULL
      AND TRIM(CAST(publicacao AS TEXT)) <> ''
      AND (concluida_em IS NULL OR TRIM(CAST(concluida_em AS TEXT)) = '')
  ) AS serao_preenchidas,
  COUNT(*) FILTER (
    WHERE publicacao IS NOT NULL
      AND TRIM(CAST(publicacao AS TEXT)) <> ''
      AND concluida_em IS NOT NULL
      AND TRIM(CAST(concluida_em AS TEXT)) <> ''
  ) AS ja_tem_concluida_em,
  COUNT(*) FILTER (
    WHERE publicacao IS NULL OR TRIM(CAST(publicacao AS TEXT)) = ''
  ) AS sem_publicacao,
  COUNT(*) AS total
FROM formalizacao;

-- ─────────────────────────────────────────────────────────────
-- 2. AMOSTRA das linhas que serão atualizadas
-- ─────────────────────────────────────────────────────────────
SELECT id, emenda, publicacao, concluida_em
FROM formalizacao
WHERE publicacao IS NOT NULL
  AND TRIM(CAST(publicacao AS TEXT)) <> ''
  AND (concluida_em IS NULL OR TRIM(CAST(concluida_em AS TEXT)) = '')
ORDER BY publicacao
LIMIT 30;

-- ─────────────────────────────────────────────────────────────
-- 3. EXECUTAR: preencher concluida_em com o valor de publicacao
-- ─────────────────────────────────────────────────────────────
BEGIN;

UPDATE formalizacao
SET
  concluida_em = publicacao,
  updated_at   = NOW()
WHERE publicacao IS NOT NULL
  AND TRIM(CAST(publicacao AS TEXT)) <> ''
  AND (concluida_em IS NULL OR TRIM(CAST(concluida_em AS TEXT)) = '');

-- Confirmar quantas linhas foram alteradas
SELECT COUNT(*) AS linhas_atualizadas
FROM formalizacao
WHERE updated_at >= NOW() - INTERVAL '5 seconds';

COMMIT;

-- ─────────────────────────────────────────────────────────────
-- 4. VERIFICAR: não deve sobrar registros com publicacao
--    preenchida e concluida_em vazia
-- ─────────────────────────────────────────────────────────────
SELECT COUNT(*) AS pendentes_sem_concluida_em
FROM formalizacao
WHERE publicacao IS NOT NULL
  AND TRIM(CAST(publicacao AS TEXT)) <> ''
  AND (concluida_em IS NULL OR TRIM(CAST(concluida_em AS TEXT)) = '');
