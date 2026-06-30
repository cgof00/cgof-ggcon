-- ============================================================
-- RESTAURAÇÃO DE TÉCNICO BASEADA NO LOG DE AUDITORIA
-- Execute no SQL Editor do Supabase
-- Origem: log_atribuicoes consultado em 2026-05-26
-- ============================================================

-- Preview: ver estado atual dos registros afetados ANTES de restaurar
SELECT id, emenda, demanda, tecnico, falta_assinatura
FROM formalizacao
WHERE id IN (35338, 35276, 31236, 12805, 32374, 29443, 28976, 28535)
ORDER BY id;

-- ============================================================
-- RESTAURAR (descomente após confirmar o preview acima)
-- ============================================================

-- 35338: kdelfino zerou "Eliana Franco Pereira" em 22/05
-- UPDATE formalizacao SET tecnico = 'Eliana Franco Pereira' WHERE id = 35338 AND tecnico IS NULL;

-- 35276: kdelfino zerou "Cassia Maria Santos Teles" em 21/05
-- UPDATE formalizacao SET tecnico = 'Cassia Maria Santos Teles' WHERE id = 35276 AND tecnico IS NULL;

-- 12805: kdelfino zerou "Rosana Marques De Oliveira Abreu" em 21/05
-- UPDATE formalizacao SET tecnico = 'Rosana Marques De Oliveira Abreu' WHERE id = 12805 AND tecnico IS NULL;

-- 32374: kdelfino zerou "José Romão Batista" em 21/05
-- UPDATE formalizacao SET tecnico = 'José Romão Batista' WHERE id = 32374 AND tecnico IS NULL;

-- 29443: kdelfino zerou "José Romão Batista" em 21/05
-- UPDATE formalizacao SET tecnico = 'José Romão Batista' WHERE id = 29443 AND tecnico IS NULL;

-- 28976: kdelfino zerou "José Romão Batista" em 21/05
-- UPDATE formalizacao SET tecnico = 'José Romão Batista' WHERE id = 28976 AND tecnico IS NULL;

-- 28535: kdelfino zerou "José Romão Batista" em 21/05
-- UPDATE formalizacao SET tecnico = 'José Romão Batista' WHERE id = 28535 AND tecnico IS NULL;

-- 31236: kdelfino trocou "Rosana Marques De Oliveira Abreu" → "Paula Araujo Peixoto"
-- Atenção: este registro foi intencionalmente alterado (ou foi bug)?
-- Se foi bug, descomente:
-- UPDATE formalizacao SET tecnico = 'Rosana Marques De Oliveira Abreu' WHERE id = 31236 AND tecnico = 'Paula Araujo Peixoto';

-- ============================================================
-- RESTAURAR TUDO DE UMA VEZ (só use se tiver certeza)
-- ============================================================
/*
UPDATE formalizacao SET tecnico = 'Eliana Franco Pereira'           WHERE id = 35338 AND tecnico IS NULL;
UPDATE formalizacao SET tecnico = 'Cassia Maria Santos Teles'       WHERE id = 35276 AND tecnico IS NULL;
UPDATE formalizacao SET tecnico = 'Rosana Marques De Oliveira Abreu' WHERE id = 12805 AND tecnico IS NULL;
UPDATE formalizacao SET tecnico = 'José Romão Batista'              WHERE id = 32374 AND tecnico IS NULL;
UPDATE formalizacao SET tecnico = 'José Romão Batista'              WHERE id = 29443 AND tecnico IS NULL;
UPDATE formalizacao SET tecnico = 'José Romão Batista'              WHERE id = 28976 AND tecnico IS NULL;
UPDATE formalizacao SET tecnico = 'José Romão Batista'              WHERE id = 28535 AND tecnico IS NULL;
*/
