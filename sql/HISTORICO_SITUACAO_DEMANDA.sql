-- ============================================================
-- HISTÓRICO DE MUDANÇAS DE SITUAÇÃO DA DEMANDA (v2)
--
-- Captura TODAS as alterações relevantes em formalizacao.
-- Armazena na coluna JSONB 'historico_situacao' na própria linha.
--
-- Campos monitorados:
--   • area_estagio_situacao_demanda  (campo principal de produtividade)
--   • situacao_analise_demanda
--   • data_analise_demanda
--   • data_liberacao
--   • data_recebimento_demanda
--   • data_liberacao_assinatura_conferencista
--   • data_liberacao_assinatura
--   • tecnico
--   • conferencista
--   • publicacao
--   • concluida_em
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
  v_em    TEXT;
BEGIN
  -- Captura e-mail do usuário via JWT (Supabase)
  BEGIN
    v_user := (current_setting('request.jwt.claims', true)::jsonb)->>'email';
  EXCEPTION WHEN OTHERS THEN
    v_user := NULL;
  END;

  v_em   := to_char(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI');
  v_user := COALESCE(v_user, 'sistema');

  -- Helper macro: adiciona entrada se o campo mudou
  -- area_estagio_situacao_demanda (principal — produtividade)
  IF OLD.area_estagio_situacao_demanda IS DISTINCT FROM NEW.area_estagio_situacao_demanda THEN
    v_entry := jsonb_build_object('campo','area_estagio_situacao_demanda',
      'de',COALESCE(OLD.area_estagio_situacao_demanda,''),'para',COALESCE(NEW.area_estagio_situacao_demanda,''),
      'usuario',v_user,'em',v_em);
    NEW.historico_situacao := COALESCE(NEW.historico_situacao,'[]'::jsonb) || v_entry;
  END IF;

  -- situacao_analise_demanda
  IF OLD.situacao_analise_demanda IS DISTINCT FROM NEW.situacao_analise_demanda THEN
    v_entry := jsonb_build_object('campo','situacao_analise_demanda',
      'de',COALESCE(OLD.situacao_analise_demanda,''),'para',COALESCE(NEW.situacao_analise_demanda,''),
      'usuario',v_user,'em',v_em);
    NEW.historico_situacao := COALESCE(NEW.historico_situacao,'[]'::jsonb) || v_entry;
  END IF;

  -- data_analise_demanda
  IF OLD.data_analise_demanda IS DISTINCT FROM NEW.data_analise_demanda THEN
    v_entry := jsonb_build_object('campo','data_analise_demanda',
      'de',COALESCE(OLD.data_analise_demanda::text,''),'para',COALESCE(NEW.data_analise_demanda::text,''),
      'usuario',v_user,'em',v_em);
    NEW.historico_situacao := COALESCE(NEW.historico_situacao,'[]'::jsonb) || v_entry;
  END IF;

  -- data_liberacao
  IF OLD.data_liberacao IS DISTINCT FROM NEW.data_liberacao THEN
    v_entry := jsonb_build_object('campo','data_liberacao',
      'de',COALESCE(OLD.data_liberacao::text,''),'para',COALESCE(NEW.data_liberacao::text,''),
      'usuario',v_user,'em',v_em);
    NEW.historico_situacao := COALESCE(NEW.historico_situacao,'[]'::jsonb) || v_entry;
  END IF;

  -- data_recebimento_demanda
  IF OLD.data_recebimento_demanda IS DISTINCT FROM NEW.data_recebimento_demanda THEN
    v_entry := jsonb_build_object('campo','data_recebimento_demanda',
      'de',COALESCE(OLD.data_recebimento_demanda::text,''),'para',COALESCE(NEW.data_recebimento_demanda::text,''),
      'usuario',v_user,'em',v_em);
    NEW.historico_situacao := COALESCE(NEW.historico_situacao,'[]'::jsonb) || v_entry;
  END IF;

  -- data_liberacao_assinatura_conferencista
  IF OLD.data_liberacao_assinatura_conferencista IS DISTINCT FROM NEW.data_liberacao_assinatura_conferencista THEN
    v_entry := jsonb_build_object('campo','data_liberacao_assinatura_conferencista',
      'de',COALESCE(OLD.data_liberacao_assinatura_conferencista::text,''),'para',COALESCE(NEW.data_liberacao_assinatura_conferencista::text,''),
      'usuario',v_user,'em',v_em);
    NEW.historico_situacao := COALESCE(NEW.historico_situacao,'[]'::jsonb) || v_entry;
  END IF;

  -- data_liberacao_assinatura
  IF OLD.data_liberacao_assinatura IS DISTINCT FROM NEW.data_liberacao_assinatura THEN
    v_entry := jsonb_build_object('campo','data_liberacao_assinatura',
      'de',COALESCE(OLD.data_liberacao_assinatura::text,''),'para',COALESCE(NEW.data_liberacao_assinatura::text,''),
      'usuario',v_user,'em',v_em);
    NEW.historico_situacao := COALESCE(NEW.historico_situacao,'[]'::jsonb) || v_entry;
  END IF;

  -- tecnico (reatribuição)
  IF OLD.tecnico IS DISTINCT FROM NEW.tecnico THEN
    v_entry := jsonb_build_object('campo','tecnico',
      'de',COALESCE(OLD.tecnico,''),'para',COALESCE(NEW.tecnico,''),
      'usuario',v_user,'em',v_em);
    NEW.historico_situacao := COALESCE(NEW.historico_situacao,'[]'::jsonb) || v_entry;
  END IF;

  -- conferencista (reatribuição)
  IF OLD.conferencista IS DISTINCT FROM NEW.conferencista THEN
    v_entry := jsonb_build_object('campo','conferencista',
      'de',COALESCE(OLD.conferencista,''),'para',COALESCE(NEW.conferencista,''),
      'usuario',v_user,'em',v_em);
    NEW.historico_situacao := COALESCE(NEW.historico_situacao,'[]'::jsonb) || v_entry;
  END IF;

  -- publicacao (conclusão)
  IF OLD.publicacao IS DISTINCT FROM NEW.publicacao THEN
    v_entry := jsonb_build_object('campo','publicacao',
      'de',COALESCE(OLD.publicacao::text,''),'para',COALESCE(NEW.publicacao::text,''),
      'usuario',v_user,'em',v_em);
    NEW.historico_situacao := COALESCE(NEW.historico_situacao,'[]'::jsonb) || v_entry;
  END IF;

  -- concluida_em (conclusão)
  IF OLD.concluida_em IS DISTINCT FROM NEW.concluida_em THEN
    v_entry := jsonb_build_object('campo','concluida_em',
      'de',COALESCE(OLD.concluida_em::text,''),'para',COALESCE(NEW.concluida_em::text,''),
      'usuario',v_user,'em',v_em);
    NEW.historico_situacao := COALESCE(NEW.historico_situacao,'[]'::jsonb) || v_entry;
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
-- SELECT id, demanda, area_estagio_situacao_demanda,
--        historico_situacao
-- FROM public.formalizacao
-- WHERE historico_situacao IS NOT NULL
--   AND jsonb_array_length(historico_situacao) > 0
-- ORDER BY id DESC LIMIT 20;

-- ============================================================
-- Relatório de produtividade por usuário (SQL direto)
-- Conta quantas vezes cada usuário saiu de "DEMANDA COM O TÉCNICO"
-- ============================================================
-- SELECT
--   entry->>'usuario'                AS usuario,
--   COUNT(*)                         AS demandas_analisadas,
--   MIN(entry->>'em')                AS primeira_acao,
--   MAX(entry->>'em')                AS ultima_acao
-- FROM public.formalizacao,
--      jsonb_array_elements(historico_situacao) AS entry
-- WHERE entry->>'campo'  = 'area_estagio_situacao_demanda'
--   AND entry->>'de' ILIKE 'DEMANDA COM O TÉCNICO%'
-- GROUP BY entry->>'usuario'
-- ORDER BY demandas_analisadas DESC;

