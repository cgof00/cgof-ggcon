-- ============================================================================
-- TESTE DIRETO: Verificar se os RPC functions (sync_formalizacao_atualizar e sync_formalizacao_novas) funcionam
-- ============================================================================
-- Execute isto no Supabase SQL Editor para debugar por que sync não funciona

-- PASSO 1: Verificar se as funções existem
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name IN ('sync_formalizacao_atualizar', 'sync_formalizacao_novas')
AND routine_schema = 'public';

-- PASSO 2: Contar registros ANTES de testar
SELECT 'ANTES - formalizacao' as status, COUNT(*) as total FROM formalizacao;
SELECT 'ANTES - emendas' as status, COUNT(*) as total FROM emendas;

-- PASSO 3: Testar UPDATE function
SELECT sync_formalizacao_atualizar();

-- PASSO 4: Contar registros DEPOIS de UPDATE
SELECT 'DEPOIS UPDATE - formalizacao' as status, COUNT(*) as total FROM formalizacao;

-- PASSO 5: Testar INSERT function
SELECT sync_formalizacao_novas();

-- PASSO 6: Contar registros DEPOIS de INSERT
SELECT 'DEPOIS INSERT - formalizacao' as status, COUNT(*) as total FROM formalizacao;

-- PASSO 7: Ver últimos registros inseridos/atualizados
SELECT id, emenda, numero_convenio, ano, parlamentar, demanda 
FROM formalizacao 
ORDER BY updated_at DESC NULLS LAST 
LIMIT 10;

-- PASSO 8: Verificar se updated_at foi alterado
SELECT COUNT(*) as records_com_update_recent 
FROM formalizacao 
WHERE updated_at > NOW() - INTERVAL '1 minute';
