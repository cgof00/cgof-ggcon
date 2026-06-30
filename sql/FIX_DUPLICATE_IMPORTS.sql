-- ============================================================================
-- FIX: Adicionar constraint UNIQUE a codigo_num para impedir duplicações
-- ============================================================================
-- PROBLEMA: Sem UNIQUE constraint, o UPSERT não funciona corretamente
--           e o banco cria novos registros sempre em vez de atualizar
-- 
-- IMPORTANTE: A tabela formalizacao depende de emendas via numero_convenio
--             Ao corrigir duplicatas em emendas, garantimos integridade em formalizacao

-- PASSO 0: Remover constraint anterior se existir (permite re-executar)
-- ============================================================================
ALTER TABLE emendas
DROP CONSTRAINT IF EXISTS emendas_codigo_num_unique;

-- PASSO 1: Analisar duplicatas ANTES de remover
-- ============================================================================
-- Mostrar quais emendas têm duplicatas (para auditoria)
CREATE TEMP TABLE duplicatas_audit AS
SELECT 
  codigo_num,
  COUNT(*) as quantidade,
  COUNT(DISTINCT num_convenio) as convenios_unicos,
  STRING_AGG(DISTINCT CAST(id AS TEXT), ',') as ids_para_deletar,
  MAX(id) as id_manter
FROM emendas
WHERE codigo_num IS NOT NULL AND codigo_num != ''
GROUP BY codigo_num
HAVING COUNT(*) > 1;

-- Mostrar resultado
SELECT 'Duplicatas encontradas:' as info, COUNT(*) as total FROM duplicatas_audit;
SELECT * FROM duplicatas_audit;

-- PASSO 2: Remover duplicatas existentes (manter o último/mais recente)
-- ============================================================================
DELETE FROM emendas e1
WHERE id < (
  SELECT MAX(e2.id)
  FROM emendas e2
  WHERE e2.codigo_num = e1.codigo_num
    AND e1.codigo_num IS NOT NULL
    AND e1.codigo_num != ''
);

-- PASSO 3: Adicionar constraint UNIQUE ao campo codigo_num
-- ============================================================================
-- Isso garante que:
-- 1. INSERT novo: cria nova linha em emendas
-- 2. UPDATE existente: atualiza a linha correspondente
-- 3. UPSERT (on_conflict): funciona corretamente
ALTER TABLE emendas 
ADD CONSTRAINT emendas_codigo_num_unique 
UNIQUE (codigo_num);

-- PASSO 4: Validar integridade com formalizacao
-- ============================================================================
-- Mostrar emendas que têm formalizacoes associadas
SELECT 
  'Emendas com formalizações:' as info, 
  COUNT(DISTINCT e.codigo_num) as emendas_unicas,
  COUNT(DISTINCT f.numero_convenio) as formalizacoes_unicas
FROM emendas e
LEFT JOIN formalizacao f ON f.numero_convenio = e.num_convenio
WHERE e.codigo_num IS NOT NULL AND e.codigo_num != '';

-- PASSO 5: Verificação final
-- ============================================================================
-- Verificar se constraint foi criada
SELECT 
  constraint_name, 
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'emendas' 
  AND constraint_name = 'emendas_codigo_num_unique';

-- Contar duplicatas remanescentes (deve retornar 0)
SELECT 
  'Duplicatas remanescentes:' as verificacao,
  COUNT(*) as total
FROM (
  SELECT codigo_num
  FROM emendas
  WHERE codigo_num IS NOT NULL AND codigo_num != ''
  GROUP BY codigo_num
  HAVING COUNT(*) > 1
) as dup;

-- ============================================================================
-- PASSO 6: Verificar total de registros
-- ============================================================================
SELECT 
  'Emendas no banco:' as tabela,
  COUNT(*) as total 
FROM emendas;

SELECT 
  'Formalizações no banco:' as tabela,
  COUNT(*) as total 
FROM formalizacao;

-- Emendas com numero_convenio
SELECT 
  'Emendas com numero_convenio:' as filtro,
  COUNT(*) as total 
FROM emendas 
WHERE num_convenio IS NOT NULL AND num_convenio != '';

-- Formalizações com numero_convenio
SELECT 
  'Formalizações com numero_convenio:' as filtro,
  COUNT(*) as total 
FROM formalizacao 
WHERE numero_convenio IS NOT NULL AND numero_convenio != '';
