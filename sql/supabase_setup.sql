-- Create usuarios table FIRST (antes de outras que a referenciam)
CREATE TABLE IF NOT EXISTS usuarios (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  nome TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'intermediario', 'usuario')),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create emendas table
CREATE TABLE IF NOT EXISTS emendas (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  detalhes TEXT,
  natureza TEXT,
  ano_refer TEXT,
  codigo_num TEXT,
  num_emenda TEXT,
  parecer_ld TEXT,
  situacao_e TEXT,
  situacao_d TEXT,
  data_ult_e TEXT,
  data_ult_d TEXT,
  num_indicacao TEXT,
  parlamentar TEXT,
  partido TEXT,
  tipo_beneficiario TEXT,
  beneficiario TEXT,
  cnpj TEXT,
  municipio TEXT,
  objeto TEXT,
  orgao_entidade TEXT,
  regional TEXT,
  num_convenio TEXT,
  num_processo TEXT,
  data_assinatura TEXT,
  data_publicacao TEXT,
  agencia TEXT,
  conta TEXT,
  valor NUMERIC DEFAULT 0,
  valor_desembolsado NUMERIC DEFAULT 0,
  portfolio TEXT,
  qtd_dias INTEGER DEFAULT 0,
  vigencia TEXT,
  data_prorrogacao TEXT,
  dados_bancarios TEXT,
  status TEXT,
  data_pagamento TEXT,
  num_codigo TEXT,
  notas_empenho TEXT,
  valor_total_empenhado NUMERIC DEFAULT 0,
  notas_liquidacao TEXT,
  valor_total_liquidado NUMERIC DEFAULT 0,
  programa TEXT,
  valor_total_pago NUMERIC DEFAULT 0,
  ordem_bancaria TEXT,
  data_paga TEXT,
  valor_total_ordem_bancaria NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create formalizacao table (depois de usuarios ser criada)
CREATE TABLE IF NOT EXISTS formalizacao (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  ano TEXT,
  parlamentar TEXT,
  partido TEXT,
  emenda TEXT,
  emendas_agregadoras TEXT,
  demanda TEXT,
  demandas_formalizacao TEXT,
  num_convenio TEXT,
  classificacao TEXT,
  tipo_formalizacao TEXT,
  regional TEXT,
  municipio TEXT,
  conveniado TEXT,
  objeto TEXT,
  portfolio TEXT,
  valor NUMERIC DEFAULT 0,
  posicao_anterior TEXT,
  situacao_sempapel TEXT,
  area_estagio TEXT,
  recurso TEXT,
  tecnico TEXT,
  data_liberacao TEXT,
  area_estagio_situacao TEXT,
  situacao_analise TEXT,
  data_analise TEXT,
  motivo_retorno_diligencia TEXT,
  data_retorno_diligencia TEXT,
  conferencista TEXT,
  data_recebimento TEXT,
  data_retorno TEXT,
  obs_motivo_retorno TEXT,
  data_lib_assinatura_conf TEXT,
  data_lib_assinatura TEXT,
  falta_assinatura TEXT,
  assinatura TEXT,
  publicacao TEXT,
  vigencia TEXT,
  encaminhado_em TEXT,
  concluida_em TEXT,
  usuario_atribuido_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE emendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE formalizacao ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating them
DROP POLICY IF EXISTS "Usuarios can view their own profile" ON usuarios;
DROP POLICY IF EXISTS "Allow read emendas" ON emendas;
DROP POLICY IF EXISTS "Allow insert emendas for admin" ON emendas;
DROP POLICY IF EXISTS "Allow update emendas for admin" ON emendas;
DROP POLICY IF EXISTS "Allow delete emendas for admin" ON emendas;
DROP POLICY IF EXISTS "Allow read formalizacao for all authenticated" ON formalizacao;
DROP POLICY IF EXISTS "Allow insert formalizacao for admin" ON formalizacao;
DROP POLICY IF EXISTS "Allow update formalizacao for admin_and_intermediario" ON formalizacao;
DROP POLICY IF EXISTS "Allow delete formalizacao for admin" ON formalizacao;

-- Políticas para usuarios - apenas admins podem ver todos
CREATE POLICY "Usuarios can view their own profile" ON usuarios
  FOR SELECT USING (auth.uid()::text = email OR current_setting('app.user_role') = 'admin');

-- Políticas para emendas - todos podem ler (depois filtro no backend)
CREATE POLICY "Allow read emendas" ON emendas
  FOR SELECT USING (true);

CREATE POLICY "Allow insert emendas for admin" ON emendas
  FOR INSERT WITH CHECK (current_setting('app.user_role') = 'admin');

CREATE POLICY "Allow update emendas for admin" ON emendas
  FOR UPDATE USING (current_setting('app.user_role') = 'admin')
  WITH CHECK (current_setting('app.user_role') = 'admin');

CREATE POLICY "Allow delete emendas for admin" ON emendas
  FOR DELETE USING (current_setting('app.user_role') = 'admin');

-- PASSO 1: Remover políticas antigas antes de modificar a tabela
DROP POLICY IF EXISTS "Allow read formalizacao for all authenticated" ON formalizacao;
DROP POLICY IF EXISTS "Allow insert formalizacao for admin" ON formalizacao;
DROP POLICY IF EXISTS "Allow update formalizacao for admin_and_intermediario" ON formalizacao;
DROP POLICY IF EXISTS "Allow delete formalizacao for admin" ON formalizacao;

-- PASSO 2: Adicionar coluna usuario_atribuido_id se não existir
ALTER TABLE formalizacao
ADD COLUMN IF NOT EXISTS usuario_atribuido_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL;

-- PASSO 3: Recriar políticas para formalizacao com suporte ao usuario_atribuido_id
CREATE POLICY "Allow read formalizacao for all authenticated" ON formalizacao
  FOR SELECT USING (true);

CREATE POLICY "Allow insert formalizacao for admin" ON formalizacao
  FOR INSERT WITH CHECK (current_setting('app.user_role') = 'admin');

CREATE POLICY "Allow update formalizacao for admin_and_intermediario" ON formalizacao
  FOR UPDATE USING (
    current_setting('app.user_role') = 'admin' OR
    current_setting('app.user_role') = 'intermediario' OR
    (current_setting('app.user_role') = 'usuario' AND usuario_atribuido_id = (SELECT id FROM usuarios WHERE email = current_setting('app.user_email')))
  )
  WITH CHECK (
    current_setting('app.user_role') = 'admin' OR
    current_setting('app.user_role') = 'intermediario' OR
    (current_setting('app.user_role') = 'usuario' AND usuario_atribuido_id = (SELECT id FROM usuarios WHERE email = current_setting('app.user_email')))
  );

CREATE POLICY "Allow delete formalizacao for admin" ON formalizacao
  FOR DELETE USING (current_setting('app.user_role') = 'admin');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_role ON usuarios(role);
CREATE INDEX IF NOT EXISTS idx_emendas_parlamentar ON emendas(parlamentar);
CREATE INDEX IF NOT EXISTS idx_emendas_status ON emendas(status);
CREATE INDEX IF NOT EXISTS idx_formalizacao_parlamentar ON formalizacao(parlamentar);
CREATE INDEX IF NOT EXISTS idx_formalizacao_situacao ON formalizacao(situacao_analise);
CREATE INDEX IF NOT EXISTS idx_formalizacao_usuario ON formalizacao(usuario_atribuido_id);

-- Insert initial admin user (senha: admin123 - CHANGE IN PRODUCTION!)
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
