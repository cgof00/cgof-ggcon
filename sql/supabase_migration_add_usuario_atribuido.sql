-- Adicionar coluna usuario_atribuido_id à tabela formalizacao existente
ALTER TABLE formalizacao 
ADD COLUMN usuario_atribuido_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_formalizacao_usuario ON formalizacao(usuario_atribuido_id);

-- Atualizar políticas existentes (remover as antigas primeiro)
DROP POLICY IF EXISTS "Allow update formalizacao for admin_and_intermediario" ON formalizacao;
DROP POLICY IF EXISTS "Allow insert formalizacao for admin" ON formalizacao;

-- Criar novas políticas com suporte ao usuario_atribuido_id
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
