-- ============================================================
-- LIMPEZA DE DEMANDAS DUPLICADAS NA TABELA FORMALIZACAO
--
-- Uma demanda pode ter múltiplos registros quando foi reatribuída
-- manualmente sem deletar o registro antigo.
-- Este script remove registros antigos, mantendo apenas o de
-- maior id (mais recente) por número de demanda.
--
-- Execute no Supabase SQL Editor.
-- FAÇA BACKUP ANTES (rode backup_formalizacao() primeiro).
-- ============================================================

-- 1) Visualizar os duplicados ANTES de deletar (conferência)
SELECT
  demandas_formalizacao,
  COUNT(*) AS total_registros,
  MIN(id)  AS id_antigo,
  MAX(id)  AS id_novo,
  string_agg(tecnico, ' → ' ORDER BY id) AS historico_tecnicos,
  string_agg(data_liberacao::text, ' → ' ORDER BY id) AS historico_datas
FROM public.formalizacao
WHERE demandas_formalizacao IS NOT NULL
  AND demandas_formalizacao != ''
GROUP BY demandas_formalizacao
HAVING COUNT(*) > 1
ORDER BY total_registros DESC, demandas_formalizacao;

-- ============================================================
-- 2) DELETAR os registros antigos (mantém apenas o de maior id)
--    Descomente as linhas abaixo após conferir o resultado acima.
-- ============================================================

-- DELETE FROM public.formalizacao
-- WHERE id IN (
--   SELECT id FROM (
--     SELECT id,
--            ROW_NUMBER() OVER (
--              PARTITION BY demandas_formalizacao
--              ORDER BY id DESC  -- mantém o MAIOR id (mais recente)
--            ) AS rn
--     FROM public.formalizacao
--     WHERE demandas_formalizacao IS NOT NULL
--       AND demandas_formalizacao != ''
--   ) ranked
--   WHERE rn > 1  -- deleta todos exceto o mais recente
-- );

-- 3) Verificar resultado após limpeza
-- SELECT COUNT(*) AS total_restantes FROM public.formalizacao;
