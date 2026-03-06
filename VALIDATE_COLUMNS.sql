-- VALIDAÇÃO: Verificar quais colunas existem na tabela
-- Execute ISSO PRIMEIRO para descobrir a estrutura real

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'formalizacao'
ORDER BY ordinal_position;

-- Resultado esperado: lista de todas as colunas e seus tipos
-- Se não aparecer nada, a tabela pode ter outro nome ou schema
