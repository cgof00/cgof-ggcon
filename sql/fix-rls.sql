-- Desabilitar RLS na tabela usuarios para permitir acesso via service_role
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- Verificar status
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'usuarios';
