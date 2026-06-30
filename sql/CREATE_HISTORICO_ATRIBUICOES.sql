-- ============================================================
-- Histórico de Atribuições de Demandas
--
-- PROBLEMA: a tabela formalizacao armazena apenas o estado
-- atual (snapshot). Quando uma demanda retorna de diligência
-- e é reatribuída a outro técnico (ou à mesma pessoa em nova
-- data de liberação), o histórico da atribuição anterior se
-- perde: o sistema enxerga apenas a última data de liberação.
--
-- SOLUÇÃO: acumular cada atribuição substituída em uma coluna
-- JSONB (historico_atribuicoes) via trigger BEFORE UPDATE.
-- O endpoint GET /api/formalizacao já usa select=* e retorna
-- a coluna automaticamente — sem mudança na API.
--
-- Execute UMA VEZ no SQL Editor do Supabase.
-- É idempotente (IF NOT EXISTS / OR REPLACE).
-- ============================================================

-- ── 1. Coluna JSONB na tabela principal ──────────────────────────────────────
ALTER TABLE formalizacao
  ADD COLUMN IF NOT EXISTS historico_atribuicoes JSONB NOT NULL DEFAULT '[]'::JSONB;

-- ── 2. Função do trigger ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_log_atribuicao_historico()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_entry JSONB;
BEGIN
  -- Dispara somente em reatribuição real:
  --   a) técnico mudou (para outro técnico)
  --   b) mesma técnico mas data_liberacao mudou
  --      (retorno de diligência → nova liberação)
  IF (
    -- (a) técnico diferente
    (OLD.tecnico IS DISTINCT FROM NEW.tecnico AND OLD.tecnico IS NOT NULL)
    OR
    -- (b) mesmo técnico, nova data de liberação
    (OLD.tecnico IS NOT DISTINCT FROM NEW.tecnico
     AND OLD.data_liberacao IS NOT NULL
     AND OLD.data_liberacao IS DISTINCT FROM NEW.data_liberacao)
  ) THEN

    -- Snapshot da atribuição que está sendo substituída
    v_old_entry := jsonb_strip_nulls(jsonb_build_object(
      'tecnico',                                  OLD.tecnico,
      'conferencista',                            OLD.conferencista,
      'data_liberacao',                           OLD.data_liberacao,
      'data_analise_demanda',                     OLD.data_analise_demanda,
      'data_recebimento_demanda',                 OLD.data_recebimento_demanda,
      'data_liberacao_assinatura_conferencista',  OLD.data_liberacao_assinatura_conferencista,
      'data_liberacao_assinatura',                OLD.data_liberacao_assinatura,
      'assinatura',                               OLD.assinatura,
      'situacao_analise_demanda',                 OLD.situacao_analise_demanda,
      'gravado_em',                               NOW()::TEXT
    ));

    -- Acumula no array (registros mais antigos primeiro)
    NEW.historico_atribuicoes :=
      COALESCE(NEW.historico_atribuicoes, '[]'::JSONB) || v_old_entry;

  END IF;

  RETURN NEW;
END;
$$;

-- ── 3. Trigger BEFORE UPDATE ─────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_log_atribuicao ON formalizacao;

CREATE TRIGGER trg_log_atribuicao
  BEFORE UPDATE ON formalizacao
  FOR EACH ROW
  EXECUTE FUNCTION fn_log_atribuicao_historico();

-- ── 4. Permissões ─────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION fn_log_atribuicao_historico() TO service_role;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- NOTAS IMPORTANTES
--
-- • O trigger captura apenas mudanças FUTURAS após a execução
--   deste script. Atribuições passadas não são recuperáveis
--   automaticamente (a menos que existam snapshots de CSVs
--   anteriores que possam ser reimportados na ordem certa).
--
-- • O campo "gravado_em" no JSON indica quando a substituição
--   foi detectada pelo trigger (UTC).
--
-- • Para consultar o histórico de uma demanda específica:
--   SELECT id, tecnico, data_liberacao,
--          jsonb_array_length(historico_atribuicoes) AS qtd_historico,
--          historico_atribuicoes
--     FROM formalizacao
--    WHERE historico_atribuicoes != '[]'::JSONB
--    ORDER BY jsonb_array_length(historico_atribuicoes) DESC;
--
-- • Para ver todas as atribuições de uma demanda (incluindo atual):
--   SELECT id, tecnico, data_liberacao, 'atual' AS origem
--     FROM formalizacao WHERE id = <X>
--   UNION ALL
--   SELECT f.id,
--          h->>'tecnico', h->>'data_liberacao', 'historico'
--     FROM formalizacao f,
--          jsonb_array_elements(f.historico_atribuicoes) h
--    WHERE f.id = <X>;
-- ============================================================
