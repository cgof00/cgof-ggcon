-- ============================================================
-- 🎯 ARQUIVO DE CONTROLE - Execute nesta ordem
-- ============================================================
-- Total de 234 registros em 1 chunk(s)
-- ============================================================

-- PASSO 1: CRIAR TABELA STAGING
DROP TABLE IF EXISTS formalizacao_recursos_tipos_staging CASCADE;

CREATE TABLE formalizacao_recursos_tipos_staging (
  emenda TEXT PRIMARY KEY,
  tipo_formalizacao TEXT,
  recurso TEXT,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staging_emenda ON formalizacao_recursos_tipos_staging(emenda);

SELECT 'Staging table created ✓' AS status;

-- PASSO 2: EXECUTAR OS CHUNKS EM ORDEM
-- Cole e execute cada arquivo na ordem:

-- 2.1) Chunk 1 de 1
-- Cole: import_data_chunk_01_de_01.sql


-- PASSO 3: ATUALIZAR FORMALIZACAO (DEPOIS DE TODOS OS CHUNKS)
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

SELECT 'Update complete ✓' AS status;

-- PASSO 4: VALIDAÇÃO
SELECT 
  COUNT(*) as total_staging,
  COUNT(CASE WHEN processed = TRUE THEN 1 END) as processados,
  COUNT(CASE WHEN tipo_formalizacao IS NOT NULL THEN 1 END) as com_tipo,
  COUNT(CASE WHEN recurso IS NOT NULL THEN 1 END) as com_recurso
FROM formalizacao_recursos_tipos_staging;

-- PASSO 5: LIMPEZA (Depois de confirmar sucesso)
-- DROP TABLE formalizacao_recursos_tipos_staging;
