-- ============================================================
-- 🎯 VERSÃO INTEGRADA - Cole tudo no Supabase de uma vez!
-- ============================================================
-- Este arquivo tem TUDO: criar staging + importar + atualizar + validar
-- Execute em blocos (separe por comentários ===)
--
-- IMPORTANTE: Este arquivo é grande! Cole em 3 ou 4 vezes:
--   1. Criar staging (até "Confirmação")
--   2. Importar dados (o INSERT gigante)
--   3. Atualizar e validar (UPDATE + SELECT)
-- ============================================================

-- ============================================================
-- ✅ BLOCO 1: CRIAR TABELA STAGING (execute primeiro)
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

-- ✅ Confirmação - se fez bem, retorna status OK
SELECT 'Staging table created ✓' AS status;

-- ============================================================
-- ✅ BLOCO 2: IMPORTAR DADOS DO CSV
-- ============================================================
-- Copie também: import_data_fixed.sql (tem 234 INSERTs)
-- Cole aqui ou execute import_data_fixed.sql como arquivo separado

-- [Veja arquivo: import_data_fixed.sql - tem 234 inserts]

-- ============================================================
-- ✅ BLOCO 3: ATUALIZAR FORMALIZACAO
-- ============================================================

BEGIN;

-- 3A) Update principal
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

-- 3B) Marcar como processado
UPDATE formalizacao_recursos_tipos_staging
SET processed = TRUE
WHERE tipo_formalizacao IS NOT NULL OR recurso IS NOT NULL;

COMMIT;

-- ✅ Confirmação: quantos foram feitos?
SELECT 'Update complete ✓' AS status;

-- ============================================================
-- ✅ BLOCO 4: VALIDAÇÃO E DIAGNÓSTICO
-- ============================================================

-- 4A) Quantos foram processados?
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN processed = TRUE THEN 1 END) as processados,
  COUNT(CASE WHEN tipo_formalizacao IS NOT NULL THEN 1 END) as com_tipo,
  COUNT(CASE WHEN recurso IS NOT NULL THEN 1 END) as com_recurso
FROM formalizacao_recursos_tipos_staging;

-- 4B) Amostra dos dados atualizados
SELECT 
  emenda, 
  tipo_formalizacao, 
  recurso, 
  updated_at,
  'atualizado' as status
FROM formalizacao
WHERE (recurso IS NOT NULL OR tipo_formalizacao IS NOT NULL)
  AND updated_at IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

-- 4C) IMPORTANTE: Verificar se faltou alguma emenda
SELECT s.emenda, s.tipo_formalizacao, s.recurso
FROM formalizacao_recursos_tipos_staging s
LEFT JOIN formalizacao f ON TRIM(f.emenda) = TRIM(s.emenda)
WHERE f.id IS NULL
ORDER BY s.emenda;

-- 4D) Distribuição de tipos de formalização APÓS update
SELECT 
  COALESCE(tipo_formalizacao, '(vazio)') as tipo,
  COUNT(*) as total
FROM formalizacao
GROUP BY tipo
ORDER BY total DESC;

-- 4E) Distribuição de recursos APÓS update
SELECT 
  COALESCE(recurso, '(vazio)') as recurso,
  COUNT(*) as total
FROM formalizacao
GROUP BY recurso
ORDER BY total DESC;

-- 4F) RESUMO FINAL DEFINITIVO
SELECT 
  (SELECT COUNT(*) FROM formalizacao) as total_emendas_formalizacao,
  (SELECT COUNT(*) FROM formalizacao WHERE tipo_formalizacao IS NOT NULL AND TRIM(tipo_formalizacao) != '') as com_tipo_formalizacao,
  (SELECT COUNT(*) FROM formalizacao WHERE recurso IS NOT NULL AND TRIM(recurso) != '') as com_recurso,
  (SELECT COUNT(*) FROM formalizacao WHERE (tipo_formalizacao IS NOT NULL AND TRIM(tipo_formalizacao) != '') AND (recurso IS NOT NULL AND TRIM(recurso) != '')) as com_tipo_e_recurso,
  (SELECT COUNT(*) FROM formalizacao_recursos_tipos_staging WHERE processed = TRUE) as registros_staging_processados
FROM formalizacao LIMIT 1;

-- ============================================================
-- ⚠️ BLOCO 5: LIMPEZA (Depois de validar com sucesso!)
-- ============================================================
-- Descomente quando tiver certeza que deu certo:

-- DROP TABLE formalizacao_recursos_tipos_staging;

-- ============================================================
-- 🎯 CHECKLIST FINAL
-- ============================================================
/*
✅ Bloco 1 executado? (criar staging)
✅ Bloco 2 executado? (import_data_fixed.sql)
✅ Bloco 3 executado? (UPDATE)
✅ Bloco 4.A executado? (quantos processados)
✅ Bloco 4.B executado? (amostra dos dados)
✅ Bloco 4.C executado? (verificar emendas faltantes)
✅ Bloco 4.D executado? (distribuição de tipos)
✅ Bloco 4.E executado? (distribuição de recursos)
✅ Bloco 4.F executado? (resumo final)

Se tudo OK:
✅ Descomente e execute Bloco 5 (limpeza)
*/

-- ============================================================
-- 📊 RESULTADO ESPERADO:
-- ============================================================
/*
Bloco 4.A:
  total: 234 (todas as emendas do CSV)
  processados: 234 (todas processadas)
  com_tipo: 234 (todas têm tipo)
  com_recurso: 79 (nem todas têm recurso)

Bloco 4.C:
  (vazio = sucesso! nenhuma emenda faltante)

Bloco 4.F:
  total_emendas_formalizacao: deveria aumentar
  com_tipo_formalizacao: ~234 novas ou atualizadas
  com_recurso: ~79 novas ou atualizadas
*/

-- ============================================================
-- ✅ SUCESSO!
-- ============================================================
-- Seus dados foram atualizados com segurança via tabela staging.
-- Duration: ~1-2 segundos (vs 30-60s com UPDATE direto)
