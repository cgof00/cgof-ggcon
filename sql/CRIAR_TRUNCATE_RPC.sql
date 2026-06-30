-- ============================================================
-- CRIAR FUNÇÃO RPC PARA TRUNCATE RÁPIDO
-- Execute UMA VEZ no SQL Editor do Supabase ANTES de rodar
-- o script importar-formalizacao.py
-- ============================================================
-- Isso permite que o script Python faça TRUNCATE instantâneo
-- em vez de deletar row-by-row (que demora minutos)
-- ============================================================

CREATE OR REPLACE FUNCTION truncate_formalizacao()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  TRUNCATE TABLE formalizacao RESTART IDENTITY CASCADE;
END;
$$;

GRANT EXECUTE ON FUNCTION truncate_formalizacao() TO service_role;
NOTIFY pgrst, 'reload schema';

-- ✅ Pronto! Agora o script importar-formalizacao.py será muito mais rápido.
