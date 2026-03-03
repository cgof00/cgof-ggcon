# 🔧 Executar Migração - Adicionar usuario_atribuido_id

O erro que você recebeu indica que a coluna `usuario_atribuido_id` não existe na tabela `formalizacao` do Supabase.

## ✅ Solução Rápida (Supabase SQL Editor)

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá para **SQL Editor** no menu esquerdo
4. Clique em **New Query**
5. **Cole o conteúdo abaixo:**

```sql
-- Adicionar coluna usuario_atribuido_id à tabela formalizacao
ALTER TABLE formalizacao
ADD COLUMN IF NOT EXISTS usuario_atribuido_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_formalizacao_usuario_atribuido ON formalizacao(usuario_atribuido_id);

-- Comentário explicativo
COMMENT ON COLUMN formalizacao.usuario_atribuido_id IS 'ID do usuário técnico atribuído a esta formalização';
```

6. Clique em **Executar** (ou atalho `Ctrl+Enter`)
7. Aguarde a confirmação ✅

## 📝 O que verá após executar:

```
✓ alter table
✓ create index
✓ comment on column
```

## ✨ Após a migração:

- A coluna `usuario_atribuido_id` será criada na tabela `formalizacao`
- Um índice será criado para melhorar performance nas buscas
- A atribuição de técnicos funcionará perfeitamente em:
  - **Frontend**: Seleção via modal com lista de técnicos do banco
  - **Backend**: Armazenamento correto do ID do usuário

## 🔄 Testando após migração:

1. Volte para a aplicação (atualizar a página: `F5`)
2. Selecione formalizações
3. Clique em "Atribuir a Técnico"
4. Selecione um técnico
5. Clique em "Atribuir"
6. ✅ Deve funcionar agora!

## ❓ Dúvidas?

Se tiver erro:
- **"Column already exists"**: Significa que já foi criada (tudo ok!)
- **"Permission denied"**: Certifique-se de usar a conta correta no Supabase
- Outro erro: Verifique que a tabela `usuarios` existe e tem a coluna `id`
