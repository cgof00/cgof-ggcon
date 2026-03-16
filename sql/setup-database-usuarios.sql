-- ============================================
-- Gerenciamento de Usuários - Setup Supabase
-- ============================================
-- Este script cria a tabela 'usuarios' e os índices necessários
-- Execute este script no Supabase SQL Editor: https://app.supabase.com/

-- 1. Criar tabela usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'usuario' CHECK (role IN ('admin', 'usuario')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Comentário para documentação
COMMENT ON TABLE usuarios IS 'Tabela de gerenciamento de usuários do sistema';
COMMENT ON COLUMN usuarios.id IS 'ID único sequencial';
COMMENT ON COLUMN usuarios.email IS 'Email único do usuário (used for login)';
COMMENT ON COLUMN usuarios.nome IS 'Nome completo do usuário';
COMMENT ON COLUMN usuarios.senha_hash IS 'Hash SHA256 da senha do usuário';
COMMENT ON COLUMN usuarios.role IS 'Papel do usuário: admin ou usuario';
COMMENT ON COLUMN usuarios.ativo IS 'Flag ativo/inativo - soft delete';
COMMENT ON COLUMN usuarios.created_at IS 'Data/hora de criação';
COMMENT ON COLUMN usuarios.updated_at IS 'Data/hora da última atualização';

-- 2. Criar índices para performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_usuarios_role ON usuarios(role);
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON usuarios(ativo);
CREATE INDEX IF NOT EXISTS idx_usuarios_created_at ON usuarios(created_at DESC);

-- 3. Criar trigger para auto-atualizar updated_at
CREATE OR REPLACE FUNCTION users_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_usuarios_update_timestamp ON usuarios;
CREATE TRIGGER trigger_usuarios_update_timestamp
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION users_update_timestamp();

-- 4. Desabilitar RLS (Row Level Security) - gerenciado pela app
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- 5. Inserir usuário admin padrão
-- IMPORTANTE: Substituir SENHA_ADMI_HASH_AQUI com um hash SHA256 real
-- Use sha256('sua_senha') no seu aplicativo ou hash online
-- Exemplo de hash: 5e884898da28047151d0e56f8dc62927e8d9ffb9d5d15f0d7a14e3b0beeff0de (sha256 de "password")

-- Para gerar um hash SHA256 válido, você pode usar:
-- Node.js: require('crypto').createHash('sha256').update('senha').digest('hex')
-- Python: hashlib.sha256(b'senha').hexdigest()
-- Online: https://www.sha256online.com/

INSERT INTO usuarios (email, nome, senha_hash, role, ativo, created_at, updated_at)
VALUES (
  'admin@seu-dominio.com',
  'Administrador',
  '5e884898da28047151d0e56f8dc62927e8d9ffb9d5d15f0d7a14e3b0beeff0de', -- hash sha256 de "password"
  'admin',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- 6. Verificação - visualizar usuarios criados
-- SELECT * FROM usuarios;
-- SELECT COUNT(*) as total_usuarios FROM usuarios;
-- SELECT COUNT(*) as total_admins FROM usuarios WHERE role = 'admin' AND ativo = true;

-- ============================================
-- PRÓXIMAS ETAPAS NO SEU APLICATIVO:
-- ============================================

-- 1. No seu servidor Node.js, gere senha para o admin:
-- const crypto = require('crypto');
-- const senha = 'sua_senha_forte_aqui';
-- const hash = crypto.createHash('sha256').update(senha).digest('hex');
-- console.log(hash);

-- 2. Update no SQL acima com o hash gerado

-- 3. Teste a conexão:
-- - Abra http://localhost:4000 em seu navegador
-- - Faça login com: admin@seu-dominio.com / sua_senha_forte_aqui

-- 4. Após login bem-sucedido:
-- - Vá para a aba "Admin"
-- - Crie novos usuários conforme necessário

-- ============================================
-- REFERÊNCIA DE SEGURANÇA:
-- ============================================

-- ✅ Senhas são armazenadas como hash SHA256
-- ✅ Cada usuário tem um email único (case-insensitive)
-- ✅ Usuários podem ser desativados sem exclusão (soft delete via ativo=false)
-- ✅ Atualização automática de updated_at em cada modificação
-- ✅ Dois roles disponíveis:
--    - admin: acesso total
--    - usuario: acesso limitado às suas demandas (filtro por tecnico = email)

-- ⚠️ IMPORTANTE:
-- - Não armazene senhas em texto claro!
-- - Sempre use HTTPS em produção
-- - Use senhas fortes (mínimo 12 caracteres com números e símbolos)
-- - Backup regular do banco de dados
-- - Monitore tentativas de login falhadas

-- ============================================
-- QUERIES ÚTEIS DE GERENCIAMENTO:
-- ============================================

-- Listar todos os usuários
-- SELECT id, email, nome, role, ativo, created_at FROM usuarios ORDER BY created_at DESC;

-- Listar apenas admins ativos
-- SELECT id, email, nome FROM usuarios WHERE role = 'admin' AND ativo = true;

-- Listar apenas usuários padrão
-- SELECT id, email, nome FROM usuarios WHERE role = 'usuario' ORDER BY nome;

-- Desativar um usuário
-- UPDATE usuarios SET ativo = false, updated_at = CURRENT_TIMESTAMP WHERE email = 'usuario@example.com';

-- Reativar um usuário
-- UPDATE usuarios SET ativo = true, updated_at = CURRENT_TIMESTAMP WHERE email = 'usuario@example.com';

-- Mudar um usuário para admin
-- UPDATE usuarios SET role = 'admin', updated_at = CURRENT_TIMESTAMP WHERE email = 'usuario@example.com';

-- Contar usuários por role
-- SELECT role, COUNT(*) FROM usuarios GROUP BY role;

-- Ver quantos usuários foram criados por dia
-- SELECT DATE(created_at) as data, COUNT(*) FROM usuarios GROUP BY DATE(created_at) ORDER BY data DESC;

-- Encontrar usuários criados nas últimas 24 horas
-- SELECT * FROM usuarios WHERE created_at > NOW() - INTERVAL '24 hours' ORDER BY created_at DESC;

-- Encontrar usuários que não fazem login
-- SELECT * FROM usuarios WHERE updated_at = created_at AND ativo = true;

-- ============================================
-- TROUBLESHOOTING:
-- ============================================

-- Se receber erro de "table already exists":
-- - Pode ignorar, significa que a tabela já foi criada antes
-- - Execute novamente se quiser atualizar triggers

-- Se usuário admin não consegue fazer login:
-- 1. Verifique se email está corrigido no código de login
-- 2. Verifique se hash da senha está correto
-- 3. Teste a conexão ao Supabase em seu servidor

-- Se erro "permission denied":
-- - Você precisa estar logado no Supabase com permissões de admin
-- - Use a conta proprietária do projeto

-- ============================================
-- DATA DE CRIAÇÃO: 2024
-- VERSÃO: 1.0
-- ============================================
