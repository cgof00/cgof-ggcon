-- ============================================================
-- VERIFICAR FALTA_ASSINATURA NO BACKUP DO SUPABASE
--
-- COMO USAR:
-- 1. Acesse: https://supabase.com/dashboard/project/[SEU_PROJECT]/database/backups
-- 2. Clique em "Restore to a new project" escolhendo data ANTES de 21/05/2026
--    OU use o botão "Download" para baixar o backup e restaurar localmente
-- 3. Execute esta query NO BANCO RESTAURADO para ver os valores antigos
-- ============================================================

-- Contagem específica: quantos tinham AGUARDANDO RESOLUÇÃO
SELECT COUNT(*) AS total_aguardando_resolucao
FROM formalizacao
WHERE falta_assinatura ILIKE '%AGUARDANDO RESOLUÇÃO%';

-- Detalhe: todos os registros com AGUARDANDO RESOLUÇÃO
SELECT
  id,
  emenda,
  demanda,
  tecnico,
  falta_assinatura,
  parlamentar,
  conveniado
FROM formalizacao
WHERE falta_assinatura ILIKE '%AGUARDANDO RESOLUÇÃO%'
ORDER BY id;

-- Contagem geral por valor de falta_assinatura (visão completa do backup)
SELECT
  falta_assinatura,
  COUNT(*) AS total
FROM formalizacao
WHERE falta_assinatura IS NOT NULL
  AND TRIM(falta_assinatura) != ''
GROUP BY falta_assinatura
ORDER BY total DESC;

-- ============================================================
-- APÓS RODAR NO BACKUP: gerar UPDATEs para restaurar no banco atual
-- Cole os resultados aqui e execute no banco de produção:
-- ============================================================

-- Exemplo de UPDATE para restaurar um registro específico:
-- UPDATE formalizacao
-- SET falta_assinatura = 'AGUARDANDO RESOLUÇÃO'
-- WHERE id = [ID_DO_REGISTRO]
--   AND (falta_assinatura IS NULL OR falta_assinatura = '');

-- ============================================================
-- Alternativamente: se tiver acesso ao banco do backup via psql,
-- gerar os UPDATEs automaticamente:
-- ============================================================
/*
SELECT
  'UPDATE formalizacao SET falta_assinatura = ' ||
  quote_literal(falta_assinatura) ||
  ' WHERE id = ' || id ||
  ' AND (falta_assinatura IS NULL OR falta_assinatura = '''');'
FROM formalizacao
WHERE falta_assinatura IS NOT NULL
  AND TRIM(falta_assinatura) != ''
ORDER BY id;
*/

-- ============================================================
-- VERIFICAÇÃO RÁPIDA: registros afetados (ids com tecnico zerado no log)
-- Ver se esses registros tinham falta_assinatura no backup
-- ============================================================
SELECT id, emenda, demanda, tecnico, falta_assinatura
FROM formalizacao
WHERE id IN (35338, 35276, 31236, 12805, 32374, 29443, 28976, 28535)
ORDER BY id;
