-- SQL INSERT command to create admin user in Supabase
-- Copy this entire command and paste into Supabase SQL Editor

INSERT INTO usuarios 
  (email, nome, senha_hash, role, ativo, created_at, updated_at)
VALUES 
  (
    'afpereira@saude.sp.gov.br',
    'A. Pereira',
    'dc629bb06dd19df11511b2f25fff150d5f73832cae03151c1ce361bc2494d3eb',
    'admin',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

-- Verification query - run this after INSERT to confirm
SELECT email, nome, role, ativo FROM usuarios WHERE email = 'afpereira@saude.sp.gov.br';
