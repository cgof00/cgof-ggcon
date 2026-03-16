-- FORMATAR COLUNA EMENDA PARA PADRÃO: 0000.000.00000
-- Exemplo: 202.600.580.418 -> 0202.600.00580

-- 1. VISUALIZAR DADOS ATUAIS
SELECT 
  emenda,
  LENGTH(emenda) as tamanho
FROM formalizacao_recursos_tipos_staging
LIMIT 20;

-- 2. CRIAR FUNCAO DE FORMATACAO
CREATE OR REPLACE FUNCTION format_emenda_pattern(emenda_value TEXT)
RETURNS TEXT AS $$
DECLARE
  parts TEXT[];
  formatted TEXT;
BEGIN
  -- Separar por ponto
  parts := string_to_array(TRIM(emenda_value), '.');
  
  -- Formatar: 0000.000.00000
  -- Pega primeiro 4 dígitos (com zeros à esquerda), depois 3, depois 5
  formatted := 
    LPAD(COALESCE(parts[1], '0'), 4, '0') || '.' ||
    LPAD(COALESCE(parts[2], '0'), 3, '0') || '.' ||
    LPAD(COALESCE(parts[3], '0'), 5, '0');
  
  RETURN formatted;
END;
$$ LANGUAGE plpgsql;

-- TEST: Verificar formatação
SELECT 
  emenda,
  format_emenda_pattern(emenda) as emenda_formatada
FROM formalizacao_recursos_tipos_staging
LIMIT 20;

-- 3. ATUALIZAR COLUNA EMENDA
BEGIN;

UPDATE formalizacao_recursos_tipos_staging
SET emenda = format_emenda_pattern(emenda)
WHERE emenda IS NOT NULL AND TRIM(emenda) != '';

COMMIT;

-- CHECK: Verificar resultado
SELECT emenda, COUNT(*) as qtd
FROM formalizacao_recursos_tipos_staging
GROUP BY emenda
LIMIT 20;

-- 4. FAZER UPDATE NA TABELA FORMALIZACAO
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
FROM (
  SELECT DISTINCT ON (emenda) 
    id, emenda, tipo_formalizacao, recurso
  FROM formalizacao_recursos_tipos_staging
  ORDER BY emenda, id
) s
WHERE TRIM(f.emenda) = TRIM(s.emenda)
  AND (s.tipo_formalizacao IS NOT NULL OR s.recurso IS NOT NULL);

COMMIT;

-- VERIFY: Verificar atualizacoes
SELECT COUNT(*) as atualizados FROM formalizacao WHERE updated_at = NOW();

-- SAMPLE: Ver amostra
SELECT 
  emenda, 
  tipo_formalizacao, 
  recurso,
  updated_at
FROM formalizacao 
WHERE updated_at = NOW()
LIMIT 10;

-- CLEANUP (opcional)
-- DROP FUNCTION format_emenda_pattern(TEXT);
