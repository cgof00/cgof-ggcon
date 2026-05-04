-- ============================================================
-- HISTÓRICO DE MUDANÇAS DE SITUAÇÃO DA DEMANDA
--
-- Toda vez que o campo area_estagio_situacao_demanda é alterado,
-- o trigger abaixo registra a mudança em uma coluna JSONB
-- 'historico_situacao' na própria linha, sem tabela extra.
--
-- Cada entrada registra:
--   campo   : nome do campo alterado
--   de      : valor anterior
--   para    : novo valor
--   usuario : e-mail do usuário (extraído do JWT do Supabase)
--   em      : data/hora da alteração (fuso horário SP)
--
-- Execute UMA VEZ no Supabase SQL Editor (é idempotente).
-- ============================================================

-- 1) Coluna JSONB na tabela principal (array de eventos, crescente)
ALTER TABLE public.formalizacao
  ADD COLUMN IF NOT EXISTS historico_situacao JSONB DEFAULT '[]'::jsonb;

-- 2) Trigger function
CREATE OR REPLACE FUNCTION public.registrar_mudanca_situacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user  TEXT;
  v_entry JSONB;
BEGIN
  -- Tenta capturar o e-mail do usuário que fez a requisição via JWT (Supabase)
  BEGIN
    v_user := (current_setting('request.jwt.claims', true)::jsonb)->>'email';
  EXCEPTION WHEN OTHERS THEN
    v_user := NULL;
  END;

  -- Registra mudança em area_estagio_situacao_demanda
  IF OLD.area_estagio_situacao_demanda IS DISTINCT FROM NEW.area_estagio_situacao_demanda THEN
    v_entry := jsonb_build_object(
      'campo',   'area_estagio_situacao_demanda',
      'de',      COALESCE(OLD.area_estagio_situacao_demanda, ''),
      'para',    COALESCE(NEW.area_estagio_situacao_demanda, ''),
      'usuario', COALESCE(v_user, 'sistema'),
      'em',      to_char(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
    );
    NEW.historico_situacao := COALESCE(OLD.historico_situacao, '[]'::jsonb) || v_entry;
  END IF;

  -- Registra mudança em situacao_analise_demanda
  IF OLD.situacao_analise_demanda IS DISTINCT FROM NEW.situacao_analise_demanda THEN
    v_entry := jsonb_build_object(
      'campo',   'situacao_analise_demanda',
      'de',      COALESCE(OLD.situacao_analise_demanda, ''),
      'para',    COALESCE(NEW.situacao_analise_demanda, ''),
      'usuario', COALESCE(v_user, 'sistema'),
      'em',      to_char(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
    );
    NEW.historico_situacao := COALESCE(NEW.historico_situacao, '[]'::jsonb) || v_entry;
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Trigger (BEFORE UPDATE para poder modificar NEW)
DROP TRIGGER IF EXISTS trg_situacao_change ON public.formalizacao;
CREATE TRIGGER trg_situacao_change
  BEFORE UPDATE ON public.formalizacao
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_mudanca_situacao();

-- 4) Notifica PostgREST para recarregar schema
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Verificação: ver histórico de uma demanda específica
-- ============================================================
-- SELECT id, demanda, area_estagio_situacao_demanda, historico_situacao
-- FROM public.formalizacao
-- WHERE historico_situacao IS NOT NULL AND jsonb_array_length(historico_situacao) > 0
-- ORDER BY id DESC LIMIT 20;
