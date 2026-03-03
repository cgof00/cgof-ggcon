-- ============================================
-- APAGAR BACKUP E LIMPAR TABELA
-- ============================================

-- 1️⃣ APAGAR TABELA DE BACKUP SE EXISTIR
DROP TABLE IF EXISTS public.formalizacao_backup CASCADE;

-- 2️⃣ APAGAR TABELA ATUAL SE QUISER COMEÇAR DO ZERO
DROP TABLE IF EXISTS public.formalizacao CASCADE;

-- ✅ FEITO!
-- Agora execute o script "adicionar-colunas.sql" para criar a tabela nova.
