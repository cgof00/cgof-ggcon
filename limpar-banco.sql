-- ============================================
-- SCRIPT PARA LIMPAR BANCO DE DADOS (SUPABASE)
-- ============================================
-- ⚠️ ATENÇÃO: Este script vai DELETAR TODOS os registros!
-- Use apenas se tem certeza do que está fazendo!
-- ============================================

-- 1️⃣ DELETAR TODOS OS REGISTROS DE FORMALIZAÇÕES
TRUNCATE TABLE public.formalizacao CASCADE;

-- 2️⃣ DELETAR TODOS OS REGISTROS DE EMENDAS  
TRUNCATE TABLE public.emendas CASCADE;

-- 3️⃣ CONFIRMAR LIMPEZA
SELECT 
  (SELECT COUNT(*) FROM public.formalizacao) as total_formalizacoes,
  (SELECT COUNT(*) FROM public.emendas) as total_emendas;

-- ✅ SCRIPT COMPLETO
-- Se o resultado acima mostrar 0 | 0, a limpeza foi bem-sucedida!
