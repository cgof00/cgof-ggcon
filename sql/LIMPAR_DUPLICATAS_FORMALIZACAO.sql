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


-- ============================================================
-- VERIFICAÇÃO ADICIONAL: 6 registros CINTIA identificados
-- (89506, 89513, 89540, 90795, 92118, 92768)
--
-- IDs confirmados no banco: 24109, 24102, 26009, 26123, 23096, 26038
-- Verificar se cada um tem um registro MAIS NOVO de outro técnico.
-- Se sim → deletar o antigo. Se não → registros legítimos, não deletar.
-- ============================================================

-- E) Verificar duplicatas para os 6 registros CINTIA conhecidos
SELECT
  f.demanda,
  f.id         AS id_cintia,
  f.tecnico    AS tecnico_cintia,
  f.data_liberacao AS data_cintia,
  n.id         AS id_novo,
  n.tecnico    AS tecnico_novo,
  n.data_liberacao AS data_novo
FROM public.formalizacao f
LEFT JOIN public.formalizacao n
  ON n.demanda = f.demanda
  AND n.tecnico NOT ILIKE '%CINTIA%'
  AND n.data_liberacao > f.data_liberacao
WHERE f.id IN (24109, 24102, 26009, 26123, 23096, 26038)
ORDER BY f.demanda;

-- F) DELETAR os 6 registros CINTIA apenas se existir registro mais novo
--    (a subconsulta garante que há outro registro mais recente para a mesma demanda)
--    Descomente após conferir resultado acima.

-- DELETE FROM public.formalizacao
-- WHERE id IN (24109, 24102, 26009, 26123, 23096, 26038)
--   AND EXISTS (
--     SELECT 1 FROM public.formalizacao n
--     WHERE n.demanda = formalizacao.demanda
--       AND n.tecnico NOT ILIKE '%CINTIA%'
--       AND n.id <> formalizacao.id
--   );

-- G) Verificação final: confirmar que CINTIA não tem mais registros
-- SELECT COUNT(*) FROM public.formalizacao WHERE tecnico ILIKE '%CINTIA%';
