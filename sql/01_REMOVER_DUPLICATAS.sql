-- ============================================================
-- SCRIPT DE DEDUPLICAÇÃO E PROTEÇÃO CONTRA DUPLICATAS
-- ============================================================
-- 1. Remove duplicatas existentes
-- 2. Garante constraint UNIQUE em "emenda"
-- 3. Fornece query para monitorar duplicatas
-- ============================================================

-- PASSO 1: Diagnosticar duplicatas existentes
-- ============================================================
SELECT 
  emenda,
  COUNT(*) as qtd_duplicadas,
  STRING_AGG(DISTINCT id::text, ', ') as ids
FROM formalizacao
GROUP BY emenda
HAVING COUNT(*) > 1
ORDER BY qtd_duplicadas DESC;

-- PASSO 2: Contar quantas duplicatas serão removidas
-- ============================================================
SELECT 
  COUNT(*) as total_registros_para_deletar,
  COUNT(DISTINCT emenda) as emendas_com_duplicata
FROM (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY emenda 
      ORDER BY updated_at DESC, id DESC  -- Mantém o mais recente
    ) as rn
  FROM formalizacao
) sub
WHERE rn > 1;

-- PASSO 3: REMOVER DUPLICATAS (Mantém o registro mais recente por emenda)
-- ============================================================
BEGIN;

DELETE FROM formalizacao
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY emenda 
        ORDER BY updated_at DESC, id DESC
      ) as rn
    FROM formalizacao
  ) sub
  WHERE rn > 1
);

COMMIT;

-- PASSO 4: Verificar resultado
-- ============================================================
SELECT 
  COUNT(*) as total_registros,
  COUNT(DISTINCT emenda) as emendas_unicas,
  CASE 
    WHEN COUNT(*) = COUNT(DISTINCT emenda) THEN '✓ SEM DUPLICATAS'
    ELSE '✗ AINDA HÁ DUPLICATAS'
  END as status
FROM formalizacao;

-- PASSO 5: CRIAR CONSTRAINT UNIQUE (se não existir)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'formalizacao_emenda_unique'
  ) THEN
    ALTER TABLE formalizacao 
    ADD CONSTRAINT formalizacao_emenda_unique UNIQUE (emenda);
    RAISE NOTICE 'Constraint UNIQUE criada com sucesso: formalizacao_emenda_unique';
  ELSE
    RAISE NOTICE 'Constraint UNIQUE já existe: formalizacao_emenda_unique';
  END IF;
END $$;

-- PASSO 6: Criar ÍNDICE para melhorar performance (se não existir)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_formalizacao_emenda 
ON formalizacao(emenda);

-- PASSO 7: Criar vista para monitorar duplicatas em tempo real
-- ============================================================
DROP VIEW IF EXISTS vw_formalizacao_duplicatas;
CREATE VIEW vw_formalizacao_duplicatas AS
SELECT 
  emenda,
  COUNT(*) as qtd_registros,
  STRING_AGG(DISTINCT id::text, ', ' ORDER BY id::text) as ids,
  STRING_AGG(DISTINCT area_estagio, ', ') as areas,
  MAX(updated_at) as ultima_atualizacao
FROM formalizacao
GROUP BY emenda
HAVING COUNT(*) > 1
ORDER BY qtd_registros DESC;

-- PASSO 8: Criar TRIGGER que previne inserção de duplicatas (OPCIONAL)
-- ============================================================
-- Descomente essa seção se quiser proteção via TRIGGER adicional

/*
CREATE OR REPLACE FUNCTION formalizacao_no_duplicates()
RETURNS TRIGGER AS $$
BEGIN
  -- Se uma emenda já existe e está sendo inserida novamente
  IF (
    SELECT COUNT(*) FROM formalizacao 
    WHERE emenda = NEW.emenda AND id != NEW.id
  ) > 0 THEN
    RAISE EXCEPTION 'Emenda % já existe na tabela formalizacao', NEW.emenda;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS formalizacao_duplicate_check ON formalizacao;
CREATE TRIGGER formalizacao_duplicate_check
BEFORE INSERT OR UPDATE ON formalizacao
FOR EACH ROW
EXECUTE FUNCTION formalizacao_no_duplicates();
*/

-- PASSO 9: Verificação final
-- ============================================================
SELECT 
  'Diagnóstico Final' as etapa,
  COUNT(*) as total,
  COUNT(DISTINCT emenda) as unicas,
  COUNT(*) - COUNT(DISTINCT emenda) as duplicatas_restantes,
  ROUND(100.0 * COUNT(DISTINCT emenda) / COUNT(*), 2) as pct_integridade
FROM formalizacao;
