-- ============================================================
-- CRIAR FUNÇÃO RPC PARA TRUNCAR TABELA EMENDAS (STAGING)
-- ============================================================
-- A tabela 'emendas' é usada apenas como staging durante importação.
-- Após a sincronização com 'formalizacao', os dados podem ser removidos
-- para economizar espaço no banco (Free Plan: 500 MB).
--
-- Esta RPC pode ser chamada manualmente ou é executada automaticamente
-- após cada sync bem-sucedida pelo sistema.
-- ============================================================

CREATE OR REPLACE FUNCTION truncate_emendas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  TRUNCATE TABLE emendas RESTART IDENTITY;
END;
$$;

GRANT EXECUTE ON FUNCTION truncate_emendas() TO service_role;

-- ============================================================
-- REMOVER ÍNDICES DESNECESSÁRIOS DA TABELA EMENDAS (STAGING)
-- Como a tabela é limpa após cada sync, índices só consomem espaço.
-- ============================================================
DROP INDEX IF EXISTS idx_emendas_parlamentar;
DROP INDEX IF EXISTS idx_emendas_beneficiario;
DROP INDEX IF EXISTS idx_emendas_objeto;

-- ============================================================
-- VERIFICAR ESPAÇO ATUAL
-- ============================================================
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as tamanho_total,
  pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) as tamanho_dados,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename) - pg_relation_size(schemaname || '.' || tablename)) as tamanho_indices
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('emendas', 'formalizacao', 'usuarios')
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
