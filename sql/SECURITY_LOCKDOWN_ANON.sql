-- ============================================================================
-- SECURITY LOCKDOWN — bloqueia acesso das chaves anon/authenticated ao banco
-- ============================================================================
-- Contexto (25/09/2026): a chave ANON (pública por natureza) conseguia ler
-- formalizacao, formalizacao_backup, usuarios (inclusive senha_hash) e
-- system_settings porque o RLS estava DESATIVADO nessas tabelas.
--
-- Este sistema NÃO usa Supabase no navegador: todo acesso passa pelo backend
-- (Cloudflare Pages Functions / server.ts) com a service_role, que ignora RLS.
-- Logo, é seguro negar TUDO para anon/authenticated.
--
-- Rodar no Supabase Dashboard > SQL Editor. Idempotente (pode rodar de novo).
-- ============================================================================

BEGIN;

-- 1) Ativa RLS em todas as tabelas do schema public (sem políticas = nega tudo
--    para anon/authenticated; service_role continua com acesso total)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

-- 2) Remove privilégios diretos (cobre também VIEWS, que ignoram RLS)
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- 3) Funções RPC (ex.: truncate, sync) — muitas são SECURITY DEFINER e
--    ignorariam o RLS se anon pudesse chamá-las via /rest/v1/rpc/...
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 4) Garante que objetos criados no futuro também nasçam fechados
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL     ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL     ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO — todas as linhas devem ter rls = true e anon_select = false
-- ============================================================================
SELECT c.relname AS tabela,
       c.relkind AS tipo,           -- r = tabela, v = view, m = materialized view
       c.relrowsecurity AS rls,
       has_table_privilege('anon', c.oid, 'SELECT') AS anon_select
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r','v','m')
ORDER BY anon_select DESC, c.relname;

-- Funções que anon ainda consegue executar (deve voltar vazio)
SELECT p.proname
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND has_function_privilege('anon', p.oid, 'EXECUTE');
