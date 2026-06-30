-- ============================================================
-- MIGRAÇÃO: Adiciona colunas Lote e Prioridade na tabela formalizacao
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Adiciona as novas colunas (se já existirem, não faz nada — idempotente)
ALTER TABLE formalizacao
  ADD COLUMN IF NOT EXISTS lote TEXT,
  ADD COLUMN IF NOT EXISTS prioridade TEXT;

-- Índices para buscas e filtros rápidos
CREATE INDEX IF NOT EXISTS idx_formalizacao_lote ON formalizacao (lote);
CREATE INDEX IF NOT EXISTS idx_formalizacao_prioridade ON formalizacao (prioridade);

-- Garante que o service_role tem acesso
GRANT SELECT, UPDATE ON formalizacao TO service_role;

-- ============================================================
-- Verificação final
-- ============================================================
SELECT
  lote,
  prioridade,
  COUNT(*) AS total
FROM formalizacao
GROUP BY lote, prioridade
ORDER BY lote NULLS LAST, prioridade NULLS LAST;
