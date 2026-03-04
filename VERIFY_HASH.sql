-- COPIAR E EXECUTAR NO SUPABASE SQL EDITOR PARA VERIFICAR O HASH ATUALIZADO
-- https://app.supabase.com/project/[seu-projeto]/sql/new

SELECT 
  email,
  senha_hash,
  LENGTH(senha_hash) as hash_length,
  CASE 
    WHEN LENGTH(senha_hash) = 64 THEN '✅ SHA256 (64 chars) - CORRETO'
    WHEN LENGTH(senha_hash) = 8 THEN '❌ Formato antigo (8 chars)'
    ELSE '❓ Formato desconhecido'
  END as status
FROM usuarios 
WHERE email = 'afpereira@saude.sp.gov.br';
