-- ⚠️ NÃO DESATIVAR RLS. Este script antigo fazia
--    ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
-- o que expunha a tabela usuarios (incl. senha_hash) para a chave anon pública.
-- A service_role já ignora RLS, então desativá-lo nunca é necessário.
-- Use sql/SECURITY_LOCKDOWN_ANON.sql.
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
