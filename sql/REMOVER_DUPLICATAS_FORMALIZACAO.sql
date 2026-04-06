-- ============================================================
-- REMOVER DUPLICATAS DA TABELA formalizacao
-- Critério: coluna emenda (mantém o registro mais atualizado)
-- ============================================================

-- PASSO 1: Diagnosticar — quais emendas têm duplicata?
-- ============================================================
SELECT
  emenda,
  ano,
  COUNT(*) AS qtd_duplicadas,
  STRING_AGG(id::text, ', ' ORDER BY updated_at DESC, id DESC) AS ids_ordem_mais_recente
FROM formalizacao
GROUP BY emenda, ano
HAVING COUNT(*) > 1
ORDER BY qtd_duplicadas DESC, emenda;

-- PASSO 2: Quantos registros serão removidos?
-- ============================================================
SELECT
  COUNT(*) AS registros_a_deletar,
  COUNT(DISTINCT emenda) AS emendas_com_duplicata
FROM (
  SELECT id, emenda,
    ROW_NUMBER() OVER (
      PARTITION BY emenda
      ORDER BY updated_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM formalizacao
) sub
WHERE rn > 1;

-- PASSO 3: REMOVER DUPLICATAS
-- Mantém 1 registro por emenda: o mais recente (updated_at DESC, depois id DESC)
-- Registros com dados manuais (tecnico, conferencista preenchidos) são priorizados
-- ============================================================
BEGIN;

DELETE FROM formalizacao
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY emenda
        ORDER BY
          -- Priorizar registros com dados operacionais preenchidos
          (CASE WHEN tecnico IS NOT NULL AND tecnico <> '' THEN 1 ELSE 0 END) DESC,
          (CASE WHEN conferencista IS NOT NULL AND conferencista <> '' THEN 1 ELSE 0 END) DESC,
          -- Depois o mais recente
          updated_at DESC NULLS LAST,
          id DESC
      ) AS rn
    FROM formalizacao
  ) sub
  WHERE rn > 1
);

-- Verificar resultado
SELECT
  COUNT(*) AS total_registros,
  COUNT(DISTINCT emenda) AS emendas_unicas,
  CASE
    WHEN COUNT(*) = COUNT(DISTINCT emenda) THEN '✓ SEM DUPLICATAS'
    ELSE '✗ AINDA HÁ DUPLICATAS — verificar emendas NULL ou vazias'
  END AS status
FROM formalizacao;

-- Diagnosticar emendas NULL (não participam do critério de duplicata)
SELECT COUNT(*) AS registros_sem_emenda
FROM formalizacao
WHERE emenda IS NULL OR emenda = '';

COMMIT;

-- PASSO 4: Criar constraint UNIQUE em emenda (executar APÓS confirmar passo 3)
-- Impede duplicatas futuras na importação
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'formalizacao_emenda_unique'
      AND conrelid = 'formalizacao'::regclass
  ) THEN
    ALTER TABLE formalizacao
    ADD CONSTRAINT formalizacao_emenda_unique UNIQUE (emenda);
    RAISE NOTICE '✓ Constraint UNIQUE criada: formalizacao_emenda_unique';
  ELSE
    RAISE NOTICE '⚠ Constraint UNIQUE já existe: formalizacao_emenda_unique';
  END IF;
END $$;
