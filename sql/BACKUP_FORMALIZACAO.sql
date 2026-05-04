-- ============================================================
-- BACKUP DA TABELA FORMALIZACAO
-- 
-- Execute este script UMA VEZ no Supabase SQL Editor para criar:
--   1) A tabela de backup  formalizacao_backup
--   2) A função RPC       backup_formalizacao()
--
-- Depois, toda vez que importar emendas ou atualizar tipo/recurso,
-- o sistema chamará automaticamente backup_formalizacao() antes
-- de qualquer operação de escrita na tabela formalizacao.
--
-- Para RESTAURAR em caso de erro:
--   INSERT INTO formalizacao SELECT * FROM formalizacao_backup
--   ON CONFLICT (id) DO UPDATE SET ... (ou TRUNCATE + INSERT)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1) Tabela de backup (criada vazia na primeira execução)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.formalizacao_backup
  (LIKE public.formalizacao INCLUDING DEFAULTS);

-- Garantir que colunas adicionadas depois da criação do backup existam
ALTER TABLE public.formalizacao_backup
  ADD COLUMN IF NOT EXISTS parecer_ld text;

-- ─────────────────────────────────────────────────────────────
-- 2) RPC: backup_formalizacao()
--    Trunca a tabela de backup e copia toda a formalizacao.
--    Retorna: { success, rows, timestamp }
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.backup_formalizacao()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cnt bigint;
BEGIN
  -- Recria a tabela de backup do zero para sempre capturar todas as colunas atuais
  -- (evita erro "INSERT has more expressions than target columns" quando novas colunas são adicionadas)
  DROP TABLE IF EXISTS public.formalizacao_backup;
  CREATE TABLE public.formalizacao_backup (LIKE public.formalizacao INCLUDING DEFAULTS);

  -- Copia todos os registros
  INSERT INTO public.formalizacao_backup
    SELECT * FROM public.formalizacao;

  GET DIAGNOSTICS cnt = ROW_COUNT;

  RETURN jsonb_build_object(
    'success',    true,
    'rows',       cnt,
    'timestamp',  now()
  );
END;
$$;

-- Permissão para a role usada pelo Supabase via API
GRANT EXECUTE ON FUNCTION public.backup_formalizacao() TO service_role;

-- ─────────────────────────────────────────────────────────────
-- Para RESTAURAR o backup (execute manualmente se necessário):
-- ─────────────────────────────────────────────────────────────
-- TRUNCATE public.formalizacao;
-- INSERT INTO public.formalizacao SELECT * FROM public.formalizacao_backup;
