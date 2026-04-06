-- ============================================================
-- ADICIONAR COLUNA parecer_ld NA TABELA formalizacao
-- Corresponde à coluna "Parecer LDO" nos arquivos de atualização
-- ============================================================

ALTER TABLE formalizacao
ADD COLUMN IF NOT EXISTS parecer_ld text;

-- (Opcional) Índice para buscas/filtros por este campo
CREATE INDEX IF NOT EXISTS idx_formalizacao_parecer_ld
  ON formalizacao (parecer_ld)
  WHERE parecer_ld IS NOT NULL;
