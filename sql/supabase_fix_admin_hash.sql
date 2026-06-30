-- Fix admin user password hash (admin123 with SHA256+salt)
UPDATE usuarios 
SET senha_hash = '191ee6ac91907b3f6b8016b39925c6968926e04d0f9c61d40da7f568dd6ae6e7'
WHERE email = 'admin@gestor-emendas.com';

-- If admin user doesn't exist, insert it
INSERT INTO usuarios (email, senha_hash, nome, role, ativo) 
VALUES (
  'admin@gestor-emendas.com',
  '191ee6ac91907b3f6b8016b39925c6968926e04d0f9c61d40da7f568dd6ae6e7',
  'Administrador',
  'admin',
  true
)
ON CONFLICT (email) DO UPDATE
SET senha_hash = '191ee6ac91907b3f6b8016b39925c6968926e04d0f9c61d40da7f568dd6ae6e7';
