-- ÍNDICES CRÍTICOS PARA PERFORMANCE - 37.352 registros
-- Execute tudo isso no Supabase SQL Editor antes de usar a aplicação
-- Sintaxe testada e garantida para PostgreSQL 12+

-- 1. Índices nas colunas mais filtradas
CREATE INDEX IF NOT EXISTS idx_formalizacao_ano ON formalizacao(ano) WHERE ano IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_formalizacao_parlamentar ON formalizacao(parlamentar) WHERE parlamentar IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_formalizacao_area_estagio ON formalizacao(area_estagio) WHERE area_estagio IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_formalizacao_tecnico ON formalizacao(tecnico) WHERE tecnico IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_formalizacao_regional ON formalizacao(regional) WHERE regional IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_formalizacao_municipio ON formalizacao(municipio) WHERE municipio IS NOT NULL;

-- 2. Índices compostos para as combinações mais comuns
CREATE INDEX IF NOT EXISTS idx_formalizacao_ano_regional ON formalizacao(ano, regional) WHERE ano IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_formalizacao_area_tecnico ON formalizacao(area_estagio, tecnico) WHERE area_estagio IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_formalizacao_ano_parlamentar ON formalizacao(ano, parlamentar) WHERE ano IS NOT NULL;

-- 3. Índice para busca full-text (busca pelo Parlamentar)
CREATE INDEX IF NOT EXISTS idx_formalizacao_parlamentar_gin 
  ON formalizacao USING GIN (to_tsvector('portuguese', COALESCE(parlamentar, '')));

-- 4. Índice para o usuário atribuído (importante para filtros de usuário)
CREATE INDEX IF NOT EXISTS idx_formalizacao_usuario_atribuido_id ON formalizacao(usuario_atribuido_id) 
  WHERE usuario_atribuido_id IS NOT NULL;

-- 5. Índice para demanda (já é texto ou numérico)
CREATE INDEX IF NOT EXISTS idx_formalizacao_demanda ON formalizacao(demanda) WHERE demanda IS NOT NULL;

-- 6. Índices para ordenação comum
CREATE INDEX IF NOT EXISTS idx_formalizacao_created_at ON formalizacao(created_at);
CREATE INDEX IF NOT EXISTS idx_formalizacao_updated_at ON formalizacao(updated_at);

-- Analisar a tabela para otimizar índices
ANALYZE formalizacao;

-- Verificar índices criados
SELECT 
  indexname, 
  tablename, 
  indexdef
FROM pg_indexes 
WHERE tablename = 'formalizacao'
ORDER BY indexname;
