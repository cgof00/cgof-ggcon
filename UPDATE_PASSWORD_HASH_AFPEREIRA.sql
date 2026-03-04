-- EXECUTAR NO SUPABASE SQL EDITOR: https://app.supabase.com/project/[seu-projeto]/sql
-- Atualizar hash da senha para afpereira@saude.sp.gov.br

UPDATE usuarios
SET senha_hash = 'dc629bb06dd19df11511b2f25fff150d5f73832cae03151c1ce361bc2494d3eb'
WHERE email = 'afpereira@saude.sp.gov.br';

-- Verificar:
SELECT email, senha_hash FROM usuarios WHERE email = 'afpereira@saude.sp.gov.br';
