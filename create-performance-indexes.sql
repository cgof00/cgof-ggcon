-- 🚀 PERFORMANCE INDEXES - Criar índices essenciais para 37k+ registros
-- Execute isso no Supabase SQL Editor IMEDIATAMENTE

-- Índices para filtros mais usados (melhora drasticamente performance)
CREATE INDEX IF NOT EXISTS idx_formalizacao_ano ON formalizacao(ano);
CREATE INDEX IF NOT EXISTS idx_formalizacao_tecnico ON formalizacao(tecnico);
CREATE INDEX IF NOT EXISTS idx_formalizacao_usuario_atribuido ON formalizacao(usuario_atribuido_id);
CREATE INDEX IF NOT EXISTS idx_formalizacao_situacao_analise ON formalizacao(situacao_analise_demanda);
CREATE INDEX IF NOT EXISTS idx_formalizacao_data_liberacao ON formalizacao(data_liberacao);

-- Índices compostos para queries common
CREATE INDEX IF NOT EXISTS idx_formalizacao_ano_tecnico ON formalizacao(ano, tecnico);
CREATE INDEX IF NOT EXISTS idx_formalizacao_ano_status ON formalizacao(ano, situacao_analise_demanda);

-- Índices para campos de busca (BIGINT é mais rápido que TEXT para FK)
CREATE INDEX IF NOT EXISTS idx_formalizacao_id_updated ON formalizacao(id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_formalizacao_created_order ON formalizacao(created_at DESC);

-- Remove índices não utilizados (opcional, para economizar espaço)
-- DROP INDEX IF EXISTS idx_old_formalizacao_sequence;
-- DROP INDEX IF EXISTS idx_old_formalizacao_obsolete;

-- Ver todos os índices criados
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'formalizacao' ORDER BY indexname;
