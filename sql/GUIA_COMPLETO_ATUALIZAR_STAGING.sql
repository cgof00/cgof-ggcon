-- ============================================================
-- GUIA COMPLETO: Atualizar Recurso e Tipo de Formalização
-- com Tabela Staging no Supabase
-- ============================================================
-- Este é o fluxo integrado - execute etapa por etapa
-- ============================================================

-- ============================================================
-- ETAPA 1: CRIAR TABELA STAGING E IMPORTAR DADOS
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1A) Criar tabela staging
DROP TABLE IF EXISTS formalizacao_recursos_tipos_staging CASCADE;

CREATE TABLE formalizacao_recursos_tipos_staging (
  emenda TEXT PRIMARY KEY,
  tipo_formalizacao TEXT,
  recurso TEXT,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staging_emenda 
  ON formalizacao_recursos_tipos_staging(emenda);

COMMENT ON TABLE formalizacao_recursos_tipos_staging 
  IS 'Tabela temporária para importação de Recurso e Tipo de Formalização';

-- ✅ Verificar criação
SELECT 'Staging table created' AS status, COUNT(*) as linhas 
FROM information_schema.tables 
WHERE table_name = 'formalizacao_recursos_tipos_staging';

-- ============================================================
-- 1B) IMPORTAR DADOS DO CSV (veja arquivo: import_data.sql)
-- ============================================================
-- Cole aqui o conteúdo de import_data.sql
-- (ou copie/cole os INSERTs abaixo)

-- ============================================================
-- ETAPA 2: EXECUTAR ATUALIZAÇÃO NA TABELA PRINCIPAL
-- ============================================================

BEGIN; -- Iniciar transação para segurança

-- 2A) Atualizar formalizacao com dados do staging
WITH update_data AS (
  UPDATE formalizacao f
  SET
    tipo_formalizacao = COALESCE(
      NULLIF(TRIM(s.tipo_formalizacao), ''),
      f.tipo_formalizacao
    ),
    recurso = COALESCE(
      NULLIF(TRIM(s.recurso), ''),
      f.recurso
    ),
    updated_at = NOW()
  FROM formalizacao_recursos_tipos_staging s
  WHERE TRIM(f.emenda) = TRIM(s.emenda)
    AND (s.tipo_formalizacao IS NOT NULL OR s.recurso IS NOT NULL)
  RETURNING f.id, f.emenda, s.tipo_formalizacao, s.recurso
)
SELECT 
  (SELECT COUNT(*) FROM update_data) as atualizados,
  COUNT(DISTINCT emenda) as emendas_afetadas
FROM update_data;

-- 2B) Marcar registros processados
UPDATE formalizacao_recursos_tipos_staging
SET processed = TRUE
WHERE tipo_formalizacao IS NOT NULL OR recurso IS NOT NULL;

COMMIT; -- Confirmar todas as mudanças

-- ============================================================
-- ETAPA 3: VALIDAÇÃO E DIAGNÓSTICO
-- ============================================================

-- 3A) Quantos registros foram atualizados?
SELECT 
  COUNT(*) as staging_processados,
  COUNT(CASE WHEN tipo_formalizacao IS NOT NULL THEN 1 END) as com_tipo,
  COUNT(CASE WHEN recurso IS NOT NULL THEN 1 END) as com_recurso
FROM formalizacao_recursos_tipos_staging
WHERE processed = TRUE;

-- 3B) Registros que NÃO foram encontrados na formalizacao
SELECT s.emenda, s.tipo_formalizacao, s.recurso
FROM formalizacao_recursos_tipos_staging s
LEFT JOIN formalizacao f ON TRIM(f.emenda) = TRIM(s.emenda)
WHERE f.id IS NULL
ORDER BY s.emenda;

-- 3C) Amostra de registros atualizados
SELECT 
  emenda, 
  tipo_formalizacao, 
  recurso, 
  updated_at
FROM formalizacao
WHERE (tipo_formalizacao IS NOT NULL OR recurso IS NOT NULL)
ORDER BY updated_at DESC
LIMIT 10;

-- 3D) Distribuição de tipos de formalização APÓS atualização
SELECT 
  CASE WHEN tipo_formalizacao IS NULL OR TRIM(tipo_formalizacao) = '' THEN '(vazio)'
       ELSE tipo_formalizacao END as tipo,
  COUNT(*) as total
FROM formalizacao
GROUP BY tipo
ORDER BY total DESC;

-- 3E) Distribuição de recursos APÓS atualização
SELECT 
  CASE WHEN recurso IS NULL OR TRIM(recurso) = '' THEN '(vazio)'
       ELSE recurso END as recurso,
  COUNT(*) as total
FROM formalizacao
GROUP BY recurso
ORDER BY total DESC;

-- 3F) RESUMO FINAL
SELECT 
  (SELECT COUNT(*) FROM formalizacao) as total_emendas,
  (SELECT COUNT(*) FROM formalizacao WHERE tipo_formalizacao IS NOT NULL AND TRIM(tipo_formalizacao) != '') as com_tipo_formalizacao,
  (SELECT COUNT(*) FROM formalizacao WHERE recurso IS NOT NULL AND TRIM(recurso) != '') as com_recurso,
  (SELECT COUNT(*) FROM formalizacao WHERE (tipo_formalizacao IS NOT NULL AND TRIM(tipo_formalizacao) != '') AND (recurso IS NOT NULL AND TRIM(recurso) != '')) as com_tipo_e_recurso,
  (SELECT COUNT(*) FROM formalizacao_recursos_tipos_staging WHERE processed = TRUE) as staging_processados;

-- ============================================================
-- ETAPA 4: LIMPEZA (Execute DEPOIS de validar)
-- ============================================================
-- Após confirmar que tudo funcionou corretamente:

-- DROP TABLE formalizacao_recursos_tipos_staging;

-- ============================================================
-- RESUMO DO PROCESSO
-- ============================================================
-- 1. ✅ Tabela staging criada
-- 2. ✅ Dados importados (do CSV para staging)
-- 3. ✅ Atualização realizada (staging → formalizacao)
-- 4. ✅ Validação feita (verificou resultados)
-- 5. ✅ Limpeza (drop table, se necessário)
--
-- BENEFÍCIOS desta abordagem:
-- • Mais rápido (um único UPDATE em batch)
-- • Mais seguro (evita timeouts)
-- • Rastreável (vê exatamente o que foi atualizado)
-- • Reversível (staging fica em memória até você limpar)
-- ============================================================
