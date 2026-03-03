-- Adicionar coluna usuario_atribuido_id à tabela formalizacao
-- Esta coluna vai armazenar o ID do usuário (técnico) atribuído

ALTER TABLE formalizacao
ADD COLUMN IF NOT EXISTS usuario_atribuido_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL;

-- Criar índice para melhorar performance nas buscas
CREATE INDEX IF NOT EXISTS idx_formalizacao_usuario_atribuido ON formalizacao(usuario_atribuido_id);

-- Comentário explicativo
COMMENT ON COLUMN formalizacao.usuario_atribuido_id IS 'ID do usuário técnico atribuído a esta formalização';
