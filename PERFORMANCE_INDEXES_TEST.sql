-- TESTE RÁPIDO: Copie e cole APENAS ISSO no Supabase SQL Editor
-- Para validar que a sintaxe está correta ANTES de rodar tudo

-- 1. Teste básico - criar um índice simples
CREATE INDEX IF NOT EXISTS idx_test_ano ON formalizacao(ano) WHERE ano IS NOT NULL;

-- 2. Teste composto - dois campos
CREATE INDEX IF NOT EXISTS idx_test_ano_regional ON formalizacao(ano, regional) WHERE ano IS NOT NULL;

-- 3. Teste full-text
CREATE INDEX IF NOT EXISTS idx_test_parlamentar_gin 
  ON formalizacao USING GIN (to_tsvector('portuguese', COALESCE(parlamentar, '')));

-- Se chegou até aqui SEM erros, o restante vai funcionar!
-- Próximo passo: Limpar esses índices de teste

-- Remover índices de teste (execute só se tudo passou)
-- DROP INDEX IF EXISTS idx_test_ano;
-- DROP INDEX IF EXISTS idx_test_ano_regional;
-- DROP INDEX IF EXISTS idx_test_parlamentar_gin;

-- Resultado esperado: 3 linhas com sucesso
-- Se vir "CREATE INDEX", está funcionando! ✅

-- DEPOIS DE PASSAR NO TESTE, execute PERFORMANCE_INDEXES.sql
