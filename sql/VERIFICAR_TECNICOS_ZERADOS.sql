-- ============================================================
-- ESTADO VERIFICADO EM 26/05/2026:
-- 12805  → NULL  ← RESTAURAR (Rosana Marques De Oliveira Abreu)
-- 35276  → NULL  ← RESTAURAR (Cassia Maria Santos Teles)
-- 35338  → NULL  ← RESTAURAR (Eliana Franco Pereira)
-- 28535, 28976, 29443, 32374, 31236 → Rosana ✅ (corretos)
-- ============================================================

-- EXECUTAR AGORA (os 3 únicos com NULL):

UPDATE formalizacao SET tecnico = 'Rosana Marques De Oliveira Abreu'
WHERE id = 12805 AND (tecnico IS NULL OR tecnico = '');

UPDATE formalizacao SET tecnico = 'Cassia Maria Santos Teles'
WHERE id = 35276 AND (tecnico IS NULL OR tecnico = '');

UPDATE formalizacao SET tecnico = 'Eliana Franco Pereira'
WHERE id = 35338 AND (tecnico IS NULL OR tecnico = '');

-- Confirmar resultado:
SELECT id, demanda, tecnico
FROM formalizacao
WHERE id IN (12805, 35276, 35338)
ORDER BY id;
