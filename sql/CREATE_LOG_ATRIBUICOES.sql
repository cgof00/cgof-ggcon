-- ============================================================
-- Tabela de Auditoria de Atribuições
--
-- Registra QUEM (admin) atribuiu OU removeu técnicos de demandas,
-- com timestamp preciso. Permite consultas como:
--   "No dia 19/05/2026, a adm Karen atribuiu 20 demandas
--    para Paula (8), Paulo (7) e Cássia (5)."
--
-- Execute UMA VEZ no SQL Editor do Supabase.
-- É idempotente (IF NOT EXISTS).
-- ============================================================

-- ── 1. Tabela principal de auditoria ────────────────────────
CREATE TABLE IF NOT EXISTS log_atribuicoes (
  id              BIGSERIAL PRIMARY KEY,
  formalizacao_id INTEGER      NOT NULL,
  demanda         TEXT,                      -- código da demanda (EM-001, etc.)
  tecnico_novo    TEXT,                      -- NULL quando ação = 'remover'
  tecnico_anterior TEXT,                     -- técnico que estava antes (quando disponível)
  data_liberacao  TEXT,                      -- data de liberação atribuída
  admin_nome      TEXT         NOT NULL,     -- nome do admin que fez a ação
  admin_role      TEXT         DEFAULT 'admin',
  acao            TEXT         NOT NULL DEFAULT 'atribuir',  -- 'atribuir' | 'remover'
  criado_em       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── 2. Colunas extras para log geral de alterações de campos ─
ALTER TABLE log_atribuicoes ADD COLUMN IF NOT EXISTS campo_alterado TEXT;
ALTER TABLE log_atribuicoes ADD COLUMN IF NOT EXISTS valor_anterior TEXT;
ALTER TABLE log_atribuicoes ADD COLUMN IF NOT EXISTS valor_novo     TEXT;

-- ── 3. Índices para consultas rápidas ──────────────────────
CREATE INDEX IF NOT EXISTS idx_log_atr_criado   ON log_atribuicoes (criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_log_atr_data     ON log_atribuicoes (DATE(criado_em AT TIME ZONE 'America/Sao_Paulo'));
CREATE INDEX IF NOT EXISTS idx_log_atr_admin    ON log_atribuicoes (admin_nome);
CREATE INDEX IF NOT EXISTS idx_log_atr_tecnico  ON log_atribuicoes (tecnico_novo);
CREATE INDEX IF NOT EXISTS idx_log_atr_fid      ON log_atribuicoes (formalizacao_id);

-- ── 3. Permissões ─────────────────────────────────────────
GRANT ALL ON log_atribuicoes TO service_role;
GRANT USAGE, SELECT ON SEQUENCE log_atribuicoes_id_seq TO service_role;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- CONSULTA DE EXEMPLO — resumo por admin e dia:
--
-- SELECT
--   DATE(criado_em AT TIME ZONE 'America/Sao_Paulo') AS dia,
--   admin_nome,
--   acao,
--   tecnico_novo,
--   COUNT(*) AS total_demandas
-- FROM log_atribuicoes
-- WHERE criado_em >= NOW() - INTERVAL '30 days'
-- GROUP BY dia, admin_nome, acao, tecnico_novo
-- ORDER BY dia DESC, admin_nome, tecnico_novo;
-- ============================================================
