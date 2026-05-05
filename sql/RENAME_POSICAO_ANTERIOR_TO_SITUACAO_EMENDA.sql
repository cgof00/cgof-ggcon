-- ============================================================
-- MIGRAÇÃO: Renomear coluna posicao_anterior → situacao_emenda
--           na tabela formalizacao
--
-- Motivo: O campo receberá dados da coluna "Situação Emenda"
--         do arquivo CSV importado (não mais "Posição Anterior").
--
-- Execute UMA VEZ no Supabase SQL Editor (é seguro re-executar).
-- ============================================================

-- 1) Renomear a coluna
ALTER TABLE public.formalizacao
  RENAME COLUMN posicao_anterior TO situacao_emenda;

-- 2) Notifica PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Verificação: confirmar que a coluna foi renomeada
-- ============================================================
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'formalizacao'
  AND column_name  = 'situacao_emenda';
-- Deve retornar 1 linha com column_name = 'situacao_emenda'
