-- ============================================================
-- PASSO 1: LIMPAR TABELAS ATUAIS
-- Execute ANTES de carregar os novos dados
-- ============================================================
-- ATENÇÃO: Isso apaga TODOS os dados das tabelas emendas e formalizacao!
-- Faça backup se necessário.
-- ============================================================

-- Limpar formalizacao primeiro (pode ter referência)
TRUNCATE TABLE formalizacao RESTART IDENTITY CASCADE;

-- Limpar emendas
TRUNCATE TABLE emendas RESTART IDENTITY CASCADE;

-- Verificar que estão vazias
SELECT 'formalizacao' as tabela, COUNT(*) as registros FROM formalizacao
UNION ALL
SELECT 'emendas' as tabela, COUNT(*) as registros FROM emendas;

-- ============================================================
-- PRONTO! Agora carregue os novos CSVs no Supabase:
-- 1. Vá em Table Editor → emendas → Import → selecione o CSV de emendas
-- 2. Vá em Table Editor → formalizacao → Import → selecione o CSV de formalização
-- 3. Depois execute o script PASSO2_SINCRONIZAR.sql
-- ============================================================
