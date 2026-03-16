-- ============================================================
-- 🚀 QUICK START - Cole e execute no Supabase SQL Editor
-- ============================================================
-- Este arquivo tem os comandos importantes em ordem de execução

-- ============================================================
-- PASSO 1: CRIAR TABELA STAGING
-- ============================================================
DROP TABLE IF EXISTS formalizacao_recursos_tipos_staging CASCADE;

CREATE TABLE formalizacao_recursos_tipos_staging (
  emenda TEXT PRIMARY KEY,
  tipo_formalizacao TEXT,
  recurso TEXT,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staging_emenda ON formalizacao_recursos_tipos_staging(emenda);

-- ✅ Confirmação
SELECT 'Staging table created ✓' AS status;

-- ============================================================
-- PASSO 2: IMPORTAR DADOS DO CSV
-- ============================================================
-- Cole aqui o conteúdo de: import_data_fixed.sql
-- (são 234 registros)

-- INÍCIO DO import_data_fixed.sql - COPIE E COLE:
-- [Aqui vai o conteúdo do import_data_fixed.sql]
-- FIM DO import_data_fixed.sql

-- ============================================================
-- PASSO 3: ATUALIZAR FORMALIZACAO
-- ============================================================
BEGIN;

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
  AND (s.tipo_formalizacao IS NOT NULL OR s.recurso IS NOT NULL);

UPDATE formalizacao_recursos_tipos_staging
SET processed = TRUE
WHERE tipo_formalizacao IS NOT NULL OR recurso IS NOT NULL;

COMMIT;

-- ============================================================
-- PASSO 4: VALIDAR RESULTADOS
-- ============================================================

-- 4.1) Quantos foram atualizados?
SELECT 
  COUNT(CASE WHEN processed = TRUE THEN 1 END) as total_processados,
  COUNT(CASE WHEN tipo_formalizacao IS NOT NULL THEN 1 END) as com_tipo,
  COUNT(CASE WHEN recurso IS NOT NULL THEN 1 END) as com_recurso
FROM formalizacao_recursos_tipos_staging;

-- 4.2) Amostra dos dados atualizados
SELECT emenda, tipo_formalizacao, recurso, updated_at
FROM formalizacao
WHERE recurso IS NOT NULL OR tipo_formalizacao IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;

-- 4.3) Emendas não encontradas?
SELECT s.emenda, s.tipo_formalizacao, s.recurso
FROM formalizacao_recursos_tipos_staging s
LEFT JOIN formalizacao f ON TRIM(f.emenda) = TRIM(s.emenda)
WHERE f.id IS NULL
LIMIT 10;

-- 4.4) Resumo final
SELECT 
  (SELECT COUNT(*) FROM formalizacao) as total_emendas,
  (SELECT COUNT(*) FROM formalizacao WHERE tipo_formalizacao IS NOT NULL AND TRIM(tipo_formalizacao) != '') as com_tipo,
  (SELECT COUNT(*) FROM formalizacao WHERE recurso IS NOT NULL AND TRIM(recurso) != '') as com_recurso
FROM formalizacao LIMIT 1;

-- ============================================================
-- PASSO 5: LIMPEZA (DEPOIS de confirmar que está OK)
-- ============================================================
-- DROP TABLE formalizacao_recursos_tipos_staging;

-- ============================================================
-- 📊 RESULTADO ESPERADO
-- ============================================================
/*
Total de emendas: ~234 com atualizações
Com tipo_formalizacao: ~234 registros
Com recurso: ~79 registros

Tipos encontrados:
- Repasse fundo a fundo (maioria)
- Convênio normal
- Cancelada
- Impedida Tecnicamente

Recursos encontrados:
- NÃO (maioria)
- Cancelada
- Impedida Tecnicamente
*/

-- ============================================================
-- ✅ SUCESSO!
-- ============================================================
