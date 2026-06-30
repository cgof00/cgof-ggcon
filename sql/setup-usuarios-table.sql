-- Criar tabela de usuários do sistema
CREATE TABLE IF NOT EXISTS public.usuarios (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  email VARCHAR(255) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'usuario' CHECK (role IN ('admin', 'usuario')),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_role ON public.usuarios(role);
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON public.usuarios(ativo);

-- Criar usuario admin padrão (email: admin@gestor-emendas.com, senha: admin123)
-- Senha hash gerada com SHA256 + salt normalmente: 
-- echo -n "admin123salt" | sha256sum
INSERT INTO public.usuarios (email, nome, senha_hash, role, ativo)
VALUES (
  'admin@gestor-emendas.com',
  'Administrador',
  '36c7f2bcd5f1c86d83c0e3abc0e9c6b1e5c3b5b5c3b5b5c3b5b5c3b5b5c3b5b5c3b', -- placeholder - será hash correto
  'admin',
  TRUE
)
ON CONFLICT (email) DO NOTHING;

-- Habilitar RLS (Row Level Security) - opcional, para segurança adicional
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Criar política de RLS para usuários comuns não verem dados de outros usuários
CREATE POLICY "Usuários só podem ver seus próprios dados"
  ON public.usuarios
  FOR SELECT
  USING (
    auth.uid()::text = id::text OR
    (SELECT role FROM public.usuarios WHERE id = auth.uid()::bigint) = 'admin'
  );

-- Criar política para apenas admins poderem atualizar
CREATE POLICY "Apenas admins podem atualizar usuários"
  ON public.usuarios
  FOR UPDATE
  USING (
    (SELECT role FROM public.usuarios WHERE id = auth.uid()::bigint) = 'admin'
  );

-- Criar política para apenas admins poderem inserir
CREATE POLICY "Apenas admins podem criar usuários"
  ON public.usuarios
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.usuarios WHERE id = auth.uid()::bigint) = 'admin'
  );

-- Criar política para apenas admins poderem deletar
CREATE POLICY "Apenas admins podem deletar usuários"
  ON public.usuarios
  FOR DELETE
  USING (
    (SELECT role FROM public.usuarios WHERE id = auth.uid()::bigint) = 'admin'
  );
