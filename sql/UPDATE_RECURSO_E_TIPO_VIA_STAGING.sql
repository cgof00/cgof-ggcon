-- ============================================================
-- ATUALIZAR RECURSO E TIPO DE FORMALIZAÇÃO VIA TABELA STAGING
-- Execute em 3 etapas no Supabase SQL Editor
-- ============================================================

-- ============================================================
-- ETAPA 1: CRIAR TABELA STAGING PARA IMPORTAÇÃO DO CSV
-- ============================================================
-- Execute PRIMEIRO esta etapa
DROP TABLE IF EXISTS formalizacao_recursos CASCADE;

CREATE TABLE formalizacao_recursos_tipos_staging (
  emenda TEXT PRIMARY KEY,
  tipo_formalizacao TEXT,
  recurso TEXT,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staging_emenda 
  ON formalizacao_recursos(emenda);

COMMENT ON TABLE formalizacao_recursos
  IS 'Tabela temporária para importação de dados de Recurso e Tipo de Formalização';

-- ✅ Verificação: Tabela criada
SELECT 'Staging table created' AS status;

-- ============================================================
-- ETAPA 2: IMPORTAR DADOS DO CSV PARA A TABELA STAGING
-- ============================================================
-- Cole os dados do CSV aqui
-- Formato esperado: emenda | tipo_formalizacao | recurso
-- Exemplo:
/*
INSERT INTO formalizacao_recursos_tipos_staging (emenda, tipo_formalizacao, recurso) VALUES
('2026.005.80418', 'Repasse fundo a fundo', 'NÃO'),
('2026.005.80419', 'Repasse fundo a fundo', 'NÃO'),
('2026.005.80420', 'Repasse fundo a fundo', 'NÃO'),
-- ... mais registros
ON CONFLICT (emenda) DO UPDATE SET
  tipo_formalizacao = EXCLUDED.tipo_formalizacao,
  recurso = EXCLUDED.recurso,
  processed = FALSE;
*/

-- ✅ Após importar, verificar quantos registros foram carregados:
SELECT 'Staging data loaded' AS status, COUNT(*) as total_registros 
FROM formalizacao_recursos;

-- ============================================================
-- ETAPA 3: ATUALIZAR TABELA FORMALIZACAO COM OS DADOS DO STAGING
-- ============================================================
-- Execute DEPOIS que os dados estiverem no staging

BEGIN; -- Iniciar transação

UPDATE formalizacao f
SET
  tipo_formalizacao = COALESCE(NULLIF(TRIM(s.tipo_formalizacao), ''), f.tipo_formalizacao),
  recurso = COALESCE(NULLIF(TRIM(s.recurso), ''), f.recurso),
  updated_at = NOW()
FROM formalizacao_recursos s
WHERE TRIM(f.emenda) = TRIM(s.emenda)
  AND s.tipo_formalizacao IS NOT NULL AND TRIM(s.tipo_formalizacao) != '';

-- Atualizar flag de processamento
UPDATE formalizacao_recursos
SET processed = TRUE
WHERE tipo_formalizacao IS NOT NULL AND TRIM(tipo_formalizacao) != '';

COMMIT; -- Confirmar transação

-- ============================================================
-- ETAPA 4: VALIDAÇÃO E DIAGNÓSTICO
-- ============================================================

-- 4A) Quantas atualizações foram feitas?
SELECT COUNT(*) as atualizados
FROM formalizacao_recursos s
WHERE s.processed = TRUE;

-- 4B) Registros do staging que NÃO foram encontrados na formalizacao
SELECT s.emenda, s.tipo_formalizacao, s.recurso
FROM formalizacao_recursos s
LEFT JOIN formalizacao f ON TRIM(f.emenda) = TRIM(s.emenda)
WHERE f.id IS NULL
ORDER BY s.emenda;

-- 4C) Amostra de alguns registros atualizados
SELECT emenda, tipo_formalizacao, recurso, updated_at
FROM formalizacao
WHERE recurso IS NOT NULL OR tipo_formalizacao IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

-- 4D) Verificar distribuição de tipos de formalização
SELECT tipo_formalizacao, COUNT(*) as total
FROM formalizacao
WHERE tipo_formalizacao IS NOT NULL AND TRIM(tipo_formalizacao) != ''
GROUP BY tipo_formalizacao
ORDER BY total DESC;

-- 4E) Verificar distribuição de recursos
SELECT recurso, COUNT(*) as total
FROM formalizacao
WHERE recurso IS NOT NULL AND TRIM(recurso) != ''
GROUP BY recurso
ORDER BY total DESC;

-- ============================================================
-- ETAPA 5: LIMPEZA (Execute DEPOIS de validar que está tudo OK)
-- ============================================================
-- Após confirmar que a atualização funcionou:
-- DROP TABLE formalizacao_recursos;

-- ✅ RESUMO FINAL
SELECT 
  COUNT(*) as total_emendas,
  COUNT(CASE WHEN tipo_formalizacao IS NOT NULL THEN 1 END) as com_tipo_formalizacao,
  COUNT(CASE WHEN recurso IS NOT NULL THEN 1 END) as com_recurso,
  COUNT(CASE WHEN tipo_formalizacao IS NOT NULL AND recurso IS NOT NULL THEN 1 END) as com_ambos
FROM formalizacao;
