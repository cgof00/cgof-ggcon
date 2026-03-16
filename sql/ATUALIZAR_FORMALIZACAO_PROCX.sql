-- ATUALIZAR FORMALIZACAO COM DADOS DA STAGING (PROCX / VLOOKUP)
-- Equivalente ao PROCX do Excel: busca tipo_formalizacao e recurso na staging table

-- 1. VISUALIZAR DADOS ANTES
SELECT 
  emenda,
  tipo_formalizacao,
  recurso
FROM formalizacao
LIMIT 10;

-- 2. FAZER O LOOKUP (PROCX)
-- Atualiza formalizacao com dados da staging table fazendo match por emenda
BEGIN;

UPDATE formalizacao f
SET
  tipo_formalizacao = s.tipo_formalizacao,
  recurso = s.recurso,
  updated_at = NOW()
FROM (
  -- DISTINCT ON pega apenas o primeiro registro por emenda (caso haja duplicatas)
  SELECT DISTINCT ON (emenda) 
    emenda, 
    tipo_formalizacao, 
    recurso
  FROM formalizacao_recursos_tipos_staging
  WHERE tipo_formalizacao IS NOT NULL OR recurso IS NOT NULL
  ORDER BY emenda, id
) s
WHERE TRIM(f.emenda) = TRIM(s.emenda);

COMMIT;

-- 3. VERIFICAR QUANTOS FORAM ATUALIZADOS
SELECT COUNT(*) as total_atualizados 
FROM formalizacao 
WHERE updated_at = NOW();

-- 4. VER AMOSTRA DOS RESULTADOS
SELECT 
  emenda,
  tipo_formalizacao,
  recurso,
  updated_at
FROM formalizacao
WHERE updated_at = NOW()
LIMIT 20;

-- 5. COMPARAR: STAGING vs FORMALIZACAO (verificar se matchou correto)
SELECT 
  f.emenda,
  f.tipo_formalizacao as formalizacao_tipo,
  s.tipo_formalizacao as staging_tipo,
  f.recurso as formalizacao_recurso,
  s.recurso as staging_recurso
FROM formalizacao f
LEFT JOIN (
  SELECT DISTINCT ON (emenda) emenda, tipo_formalizacao, recurso
  FROM formalizacao_recursos_tipos_staging
  ORDER BY emenda, id
) s ON TRIM(f.emenda) = TRIM(s.emenda)
WHERE f.updated_at = NOW()
LIMIT 10;

-- ============================================================
-- ATUALIZAR FORMALIZAÇÃO VIA 5 ÚLTIMOS DÍGITOS
-- Fonte: Tabela 'formalizacao_recursos'
-- Regra: Preencher apenas campos vazios (não sobrescreve dados existentes)
-- Segurança: Matche apenas se os 5 últimos dígitos forem únicos na fonte
-- ============================================================

BEGIN;

/* CTE 1: PREPARAR DADOS DA FONTE (Normalizar e detectar duplicatas) */
WITH source_data AS (
  SELECT 
    emenda AS emenda_original,
    -- Extrair apenas dígitos e pegar os 5 últimos
    RIGHT(REGEXP_REPLACE(emenda, '[^0-9]', '', 'g'), 5) AS emenda_5_digitos,
    NULLIF(TRIM(tipo_formalizacao), '') AS novo_tipo,
    NULLIF(TRIM(recurso), '') AS novo_recurso
  FROM formalizacao_recursos
  WHERE 
    (tipo_formalizacao IS NOT NULL AND TRIM(tipo_formalizacao) != '') OR 
    (recurso IS NOT NULL AND TRIM(recurso) != '')
),
/* CTE 2: FILTRAR APENAS AS CHAVES ÚNICAS (Sem colisão) */
source_unique AS (
  SELECT 
    emenda_5_digitos,
    MAX(novo_tipo) AS tipo_final,
    MAX(novo_recurso) AS recurso_final
  FROM source_data
  GROUP BY emenda_5_digitos
  HAVING COUNT(*) = 1 -- Garante que não há 2 emendas com mesmo final 5, evitando erro
)
/* EXECUTAR UPDATE */
UPDATE formalizacao f
SET
  -- Usa COALESCE para manter o valor atual se não estiver vazio
  tipo_formalizacao = COALESCE(NULLIF(TRIM(f.tipo_formalizacao), ''), s.tipo_final, f.tipo_formalizacao),
  recurso = COALESCE(NULLIF(TRIM(f.recurso), ''), s.recurso_final, f.recurso),
  updated_at = NOW()
FROM source_unique s
WHERE 
  -- Match: Comparar pelos últimos 5 dígitos da emenda destino
  RIGHT(REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g'), 5) = s.emenda_5_digitos
  AND (
    -- Só atualizar se o campo destino estiver vazio E fonte tiver valor
    (NULLIF(TRIM(f.tipo_formalizacao), '') IS NULL AND s.tipo_final IS NOT NULL) OR
    (NULLIF(TRIM(f.recurso), '') IS NULL AND s.recurso_final IS NOT NULL)
  );

COMMIT;

-- ============================================================
-- VERIFICAÇÃO (Executar após o COMMIT)
-- ============================================================

-- 1. Quantos foram afetados recentemente
SELECT COUNT(*) AS total_atualizados_recentemente 
FROM formalizacao 
WHERE updated_at >= NOW() - INTERVAL '1 minute';

-- 2. Amostra de comparação
SELECT 
  f.emenda, 
  f.tipo_formalizacao AS atual, 
  s.tipo_formalizacao AS fonte_tipo,
  f.recurso AS atual_recurso,
  s.recurso AS fonte_recurso
FROM formalizacao f
JOIN formalizacao_recursos s 
  ON RIGHT(REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g'), 5) = RIGHT(REGEXP_REPLACE(s.emenda, '[^0-9]', '', 'g'), 5)
WHERE f.updated_at >= NOW() - INTERVAL '1 minute'
LIMIT 10;

-- ============================================================
-- SCRIPT MESTRE: CORREÇÃO E ATUALIZAÇÃO SEGURA (PROCX)
-- ============================================================
-- 1. Remove duplicatas da tabela base
-- 2. Adiciona trava de segurança (UNIQUE)
-- 3. Atualiza dados cruzando tabelas (PROCX via 5 dígitos)
-- ============================================================

-- ⚠️ ATENÇÃO
-- Os passos abaixo (DELETE duplicatas / UNIQUE constraint) podem causar impacto permanente.
-- Se seu objetivo é APENAS atualizar tipo_formalizacao/recurso, prefira o script:
--   ATUALIZAR_FORMALIZACAO_TIPO_RECURSO_2023_2026_LAST5.sql
-- e NÃO execute os passos de remoção/constraint sem validação prévia.

BEGIN;

-- ============================================================
-- PASSO 1: REMOVER DUPLICATAS (Mantém o mais recente)
-- ============================================================
DELETE FROM formalizacao
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY emenda 
        ORDER BY id DESC
      ) as rn
    FROM formalizacao
  ) sub
  WHERE rn > 1
);

-- ============================================================
-- PASSO 2: CRIAR TRAVA DE SEGURANÇA (Constraint UNIQUE)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'formalizacao_emenda_key') THEN
    ALTER TABLE formalizacao ADD CONSTRAINT formalizacao_emenda_key UNIQUE (emenda);
  END IF;
END $$;

-- ============================================================
-- PASSO 3: PROCX - ATUALIZAR DADOS (5 ÚLTIMOS DÍGITOS)
-- ============================================================
WITH source_data AS (
  SELECT 
    emenda,
    -- Extrai apenas números e pega os 5 últimos
    RIGHT(REGEXP_REPLACE(emenda, '[^0-9]', '', 'g'), 5) as emenda_5_digitos,
    NULLIF(TRIM(tipo_formalizacao), '') as novo_tipo,
    NULLIF(TRIM(recurso), '') as novo_recurso
  FROM formalizacao_recursos
  WHERE 
    (tipo_formalizacao IS NOT NULL AND TRIM(tipo_formalizacao) != '') OR 
    (recurso IS NOT NULL AND TRIM(recurso) != '')
),
source_unique AS (
  -- Filtra apenas as chaves que são únicas nos 5 dígitos
  SELECT 
    emenda_5_digitos,
    MAX(novo_tipo) as tipo_final,
    MAX(novo_recurso) as recurso_final
  FROM source_data
  GROUP BY emenda_5_digitos
  HAVING COUNT(*) = 1 
)
UPDATE formalizacao f
SET
  tipo_formalizacao = COALESCE(NULLIF(TRIM(f.tipo_formalizacao), ''), s.tipo_final, f.tipo_formalizacao),
  recurso = COALESCE(NULLIF(TRIM(f.recurso), ''), s.recurso_final, f.recurso),
  updated_at = NOW()
FROM source_unique s
WHERE 
  RIGHT(REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g'), 5) = s.emenda_5_digitos
  AND (
    (NULLIF(TRIM(f.tipo_formalizacao), '') IS NULL AND s.tipo_final IS NOT NULL) OR
    (NULLIF(TRIM(f.recurso), '') IS NULL AND s.recurso_final IS NOT NULL)
  );

COMMIT;

-- ============================================================
-- PASSO 4: VERIFICAÇÃO FINAL
-- ============================================================
SELECT 
  (SELECT COUNT(*) FROM formalizacao) as total_registros,
  (SELECT COUNT(DISTINCT emenda) FROM formalizacao) as emendas_unicas,
  (SELECT COUNT(*) FROM formalizacao WHERE updated_at >= NOW() - INTERVAL '1 minute') as atualizados_agora;
