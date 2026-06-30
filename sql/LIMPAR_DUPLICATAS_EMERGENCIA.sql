-- ============================================================================
-- 🚨 EMERGÊNCIA: Limpar Duplicatas na Tabela Formalização
-- ============================================================================
-- Problema: sync_step3_insert_novas inseriu ~29k duplicatas
-- Solução: Remover duplicatas mantendo apenas o primeiro registro por emenda
-- ============================================================================

-- 1️⃣ BACKUP: Contar duplicatas antes de limpar
SELECT 
  emenda,
  numero_convenio,
  COUNT(*) as qtd
FROM formalizacao
GROUP BY emenda, numero_convenio
HAVING COUNT(*) > 1
ORDER BY qtd DESC
LIMIT 20;

-- 2️⃣ IDENTIFI CÃO: Ver quantas linhas serão deletadas
WITH duplicatas AS (
  SELECT 
    id,
    emenda,
    numero_convenio,
    ROW_NUMBER() OVER (PARTITION BY COALESCE(TRIM(emenda), TRIM(numero_convenio)) ORDER BY id) as rn
  FROM formalizacao
  WHERE id IS NOT NULL
)
SELECT COUNT(*) as total_para_deletar
FROM duplicatas
WHERE rn > 1;

-- 3️⃣ LIMPEZA: Deletar registros duplicados (mantém o primeiro)
WITH duplicatas_para_remover AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(TRIM(emenda), TRIM(numero_convenio)) 
      ORDER BY id
    ) as rn
  FROM formalizacao
  WHERE id IS NOT NULL
)
DELETE FROM formalizacao
WHERE id IN (
  SELECT id FROM duplicatas_para_remover 
  WHERE rn > 1
);

-- 4️⃣ VERIFICAÇÃO: Contar registros após limpeza
SELECT COUNT(*) as total_apos_limpeza FROM formalizacao;

-- 5️⃣ VALIDAÇÃO: Confirmar que não há mais duplicatas
SELECT 
  emenda,
  numero_convenio,
  COUNT(*) as qtd
FROM formalizacao
GROUP BY emenda, numero_convenio
HAVING COUNT(*) > 1;
-- Deve retornar: 0 registros (sem duplicatas)

-- 6️⃣ INTEGRIDADE: Verificar se os anos estão corretos
SELECT 
  ano,
  COUNT(*) as total
FROM formalizacao
GROUP BY ano
ORDER BY ano DESC;
