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


-- ============================================================
-- CORREÇÃO ESPECÍFICA: registros legados com técnico ghost
--
-- Registros importados do sistema antigo podem ter tecnico='CINTIA'
-- (ou outro nome sem usuário real no banco). Como esses registros
-- têm demandas_formalizacao=NULL, eles escapam do filtro de
-- duplicatas acima e continuam aparecendo no dashboard.
--
-- Passos:
--   A) Confirme quais registros estão afetados
--   B) Delete o registro legado (o novo, de Paulo, já está correto)
-- ============================================================

-- A) Verificar: encontra registros cujo técnico não existe como usuário ativo
--    (substitua 'CINTIA' pelo nome ghost que aparecer no dashboard)
SELECT
  f.id,
  f.demanda,
  f.demandas_formalizacao,
  f.emenda,
  f.tecnico,
  f.data_liberacao,
  f.area_estagio_situacao_demanda
FROM public.formalizacao f
WHERE f.tecnico ILIKE '%CINTIA%'
ORDER BY f.demanda;

-- B) Ver o registro correto de Paulo para a mesma demanda (confirmação)
SELECT
  f.id,
  f.demanda,
  f.demandas_formalizacao,
  f.emenda,
  f.tecnico,
  f.data_liberacao
FROM public.formalizacao f
WHERE f.demanda = '89537'
ORDER BY f.data_liberacao DESC;

-- C) DELETAR o(s) registro(s) legados de CINTIA
--    Descomente após confirmar o resultado acima.
--    Só deleta registros com data_liberacao anterior a 2026 para segurança.

-- DELETE FROM public.formalizacao
-- WHERE tecnico ILIKE '%CINTIA%'
--   AND (data_liberacao IS NULL OR data_liberacao < '2026-01-01');

-- D) Verificar que apenas o registro do Paulo ficou
-- SELECT id, demanda, tecnico, data_liberacao
-- FROM public.formalizacao
-- WHERE demanda = '89537';
