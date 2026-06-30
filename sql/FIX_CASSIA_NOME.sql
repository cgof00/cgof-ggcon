-- ============================================================
-- CORREÇÃO DEFINITIVA: Normaliza TODOS os nomes de técnicos
-- Corrige capitalização, acentos e pontuação inconsistentes
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Normaliza capitalização e espaços em toda a tabela (INITCAP)
--    Converte: "ELENICE" → "Elenice", "cassia..." → "Cassia...", etc.
UPDATE formalizacao
SET tecnico = INITCAP(TRIM(tecnico))
WHERE tecnico IS NOT NULL
  AND tecnico != INITCAP(TRIM(tecnico));

UPDATE usuarios
SET nome = INITCAP(TRIM(nome))
WHERE nome IS NOT NULL
  AND nome != INITCAP(TRIM(nome));

-- ============================================================
-- 2. Corrige acentos e pontuação que INITCAP não resolve
-- ============================================================

-- Fundação Zerbini (sem acento → com acento)
UPDATE formalizacao SET tecnico = 'Fundação Zerbini'
WHERE tecnico = 'Fundacao Zerbini';

-- Hc – São Paulo (travessão → hífen, padrão dos outros HCs)
UPDATE formalizacao SET tecnico = 'Hc - São Paulo'
WHERE tecnico = 'Hc – São Paulo';

-- José Luiz Dos Santos Moreira (sem acento → com acento)
UPDATE formalizacao SET tecnico = 'José Luiz Dos Santos Moreira'
WHERE tecnico = 'Jose Luiz Dos Santos Moreira';

-- José Romão Batista (sem acentos → com acentos)
UPDATE formalizacao SET tecnico = 'José Romão Batista'
WHERE tecnico = 'Jose Romao Batista';

-- Marta Conceição De Moura (sem cedilha → com cedilha)
UPDATE formalizacao SET tecnico = 'Marta Conceição De Moura'
WHERE tecnico = 'Marta Conceicao De Moura';

-- Luiz Andrade / Luiz Andrade Junior → usa o nome cadastrado no sistema
UPDATE formalizacao SET tecnico = (
  SELECT nome FROM usuarios
  WHERE LOWER(nome) LIKE '%luiz andrade%'
  ORDER BY LENGTH(nome) DESC
  LIMIT 1
)
WHERE tecnico IN ('Luiz Andrade', 'Luiz Andrade Junior');

-- Rita De Cássia (sem acento → com acento no "Cássia")
UPDATE formalizacao SET tecnico = 'Rita De Cássia Lourenço Shiga Caetano'
WHERE tecnico = 'Rita De Cassia Lourenço Shiga Caetano';

UPDATE usuarios SET nome = 'Rita De Cássia Lourenço Shiga Caetano'
WHERE LOWER(nome) LIKE '%rita de cassia%' AND nome != 'Rita De Cássia Lourenço Shiga Caetano';

-- ============================================================
-- 3. Resultado final — deve mostrar lista limpa sem duplicatas
-- ============================================================
SELECT
  tecnico,
  COUNT(*) AS total_demandas
FROM formalizacao
WHERE tecnico IS NOT NULL
GROUP BY tecnico
ORDER BY tecnico;
