-- ============================================================
-- Tabela de Notificações de Atribuição
--
-- Criada quando admin atribui demandas a técnicos/conferencistas.
-- O técnico/conferencista confirma o recebimento.
-- O admin vê o status de confirmação em tempo real.
--
-- Execute UMA VEZ no SQL Editor do Supabase.
-- É idempotente (IF NOT EXISTS).
-- ============================================================

CREATE TABLE IF NOT EXISTS notificacoes_atribuicao (
  id               BIGSERIAL PRIMARY KEY,
  tipo             TEXT        NOT NULL DEFAULT 'tecnico',  -- 'tecnico' | 'conferencista'
  usuario_id       INTEGER     NOT NULL,   -- ID do técnico/conferencista que recebeu
  usuario_nome     TEXT        NOT NULL,   -- Nome do técnico/conferencista
  admin_nome       TEXT        NOT NULL,   -- Nome do admin que atribuiu
  formalizacao_ids INTEGER[]   NOT NULL DEFAULT '{}',  -- IDs das formalizações atribuídas
  demandas         TEXT[]      NOT NULL DEFAULT '{}',  -- Códigos das demandas (para exibição)
  total_demandas   INTEGER     NOT NULL DEFAULT 0,
  data_atribuicao  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmado       BOOLEAN     NOT NULL DEFAULT FALSE,
  confirmado_em    TIMESTAMPTZ,
  observacao       TEXT,        -- observação do técnico ao confirmar
  lida             BOOLEAN     NOT NULL DEFAULT FALSE   -- true quando o técnico abriu a notificação
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_notif_usuario ON notificacoes_atribuicao (usuario_id, confirmado);
CREATE INDEX IF NOT EXISTS idx_notif_criado  ON notificacoes_atribuicao (data_atribuicao DESC);
CREATE INDEX IF NOT EXISTS idx_notif_conf    ON notificacoes_atribuicao (confirmado, data_atribuicao DESC);

-- Permissões para o service_role (usado pelas Cloudflare Functions)
GRANT ALL ON notificacoes_atribuicao TO service_role;
GRANT USAGE, SELECT ON SEQUENCE notificacoes_atribuicao_id_seq TO service_role;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Consultas úteis
-- ============================================================
-- Ver todas as notificações pendentes (não confirmadas):
-- SELECT * FROM notificacoes_atribuicao WHERE confirmado = FALSE ORDER BY data_atribuicao DESC;

-- Ver histórico por técnico:
-- SELECT * FROM notificacoes_atribuicao WHERE usuario_id = 123 ORDER BY data_atribuicao DESC;

-- Taxa de confirmação:
-- SELECT
--   usuario_nome,
--   COUNT(*) FILTER (WHERE confirmado) AS confirmadas,
--   COUNT(*) FILTER (WHERE NOT confirmado) AS pendentes,
--   COUNT(*) AS total
-- FROM notificacoes_atribuicao
-- GROUP BY usuario_nome
-- ORDER BY pendentes DESC;
-- ============================================================
