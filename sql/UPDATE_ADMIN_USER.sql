-- UPDATE command to set admin access and password for existing user
-- Copy this command and paste into Supabase SQL Editor

UPDATE usuarios 
SET 
  senha_hash = 'dc629bb06dd19df11511b2f25fff150d5f73832cae03151c1ce361bc2494d3eb',
  role = 'admin',
  ativo = true,
  updated_at = CURRENT_TIMESTAMP
WHERE email = 'afpereira@saude.sp.gov.br';

-- Verification query - run this after UPDATE to confirm
SELECT email, nome, role, ativo, senha_hash FROM usuarios WHERE email = 'afpereira@saude.sp.gov.br';
