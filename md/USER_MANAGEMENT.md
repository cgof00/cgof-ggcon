# Sistema de Gerenciamento de Usuários - Documentação

## Visão Geral
Implementado sistema completo de gerenciamento de usuários com dois níveis de acesso:
- **Administrador**: Acesso total ao sistema e gerenciamento de usuários
- **Usuário Padrão**: Acesso apenas às demandas onde é técnico (coluna "Técnico")

## Funcionalidades Implementadas

### 1. **Painel de Administração**
- Localizado em: `src/AdminPanel.tsx`
- Apenas admins conseguem acessar
- Gerenciamento completo de usuários:
  - ✅ Criar novos usuários (com senha temporária gerada automaticamente)
  - ✅ Visualizar lista de todos os usuários
  - ✅ Ativar/desativar usuários
  - ✅ Deletar usuários (desativação)
  - ✅ Copiar senha temporária para compartilhar com novo usuário

### 2. **Autenticação e Autorização**
Endpoints protegidos com middleware de autenticação:
- Token JWT com expiração de 24 horas
- Validação em todas as requisições

**Tipos de usuários:**
- `admin`: Acesso total
- `usuario`: Acesso restrito

### 3. **Endpoints de API**

#### Gerenciamento de Usuários
```
POST /api/admin/usuarios
- Criar novo usuário
- Apenas admins podem acessar
- Gera senha temporária aleatória
- Retorna: dados do usuário + senha temporária

GET /api/usuarios
- Listar todos os usuários
- Apenas admins podem acessar
- Retorna: lista de usuários com dados

PUT /api/usuarios/:id
- Atualizar status (ativo/inativo) de usuário
- Apenas admins podem acessar

DELETE /api/admin/usuarios/:id
- Desativar usuário
- Apenas admins podem acessar
```

#### Endpoints de Dados com Filtragem por Usuário
```
GET /api/formalizacao
- Retorna formalizações
- Se usuário é "usuario": filtra apenas demandas onde tecnico = email do usuário
- Se usuário é "admin": retorna todas

GET /api/formalizacao/page/:pageNum
- Paginação de formalizações
- Mesmo filtro de técnico para usuários padrão

GET /api/formalizacao/search
- Busca com filtros
- Mesmo filtro de técnico para usuários padrão

GET /api/formalizacao/filters-cascata
- Obtém opções de filtros
- Filtra opções também baseado no técnico para usuários padrão

GET /api/emendas
- Lista emendas
- Protegido por autenticação
```

### 4. **Interface do Usuário**

#### Aba de Admin
- Visível apenas para usuários com `role = 'admin'`
- Localização: Navbar superior (próximo a "Emendas" e "Formalização")
- Ícone de escudo para identificação

#### Componentes de Gerenciamento
- Listagem de usuários com filtros
- Modal para criar novo usuário
- Campos: Nome, Email, Role (Admin/Padrão)
- Exibição de senha temporária com botão "Copiar"
- Status de ativo/inativo com toggle
- Mensagens de sucesso/erro

## Fluxo de Criação de Usuário

1. Admin acessa a aba "Admin" 
2. Clica em "Novo Usuário"
3. Preenche: Nome, Email, Role
4. Sistema gera password temporária aleatória
5. Usuário é criado com `ativo = true`
6. Admin copia a senha e compartilha com o novo usuário
7. Novo usuário faz login com email + senha temporária
8. Usuário pode trocar a senha (usar endpoint de change password se implementar)

## Restrições por Tipo de Usuário

### Usuário Admin
- ✅ Acesso total a todas as emendas
- ✅ Acesso total a todas as formalizações
- ✅ Gerenciar usuários
- ✅ Criar, editar, deletar registros

### Usuário Padrão
- ✅ Acesso apenas às formalizações onde está na coluna "Técnico"
- ✅ Filtros cascata mostram apenas opções relevantes
- ✅ Não pode gerenciar usuários
- ❌ Não pode ver dados de outros técnicos

## Validações Implementadas

1. **Email único**: Não permite criar dois usuários com mesmo email
2. **Campos obrigatórios**: Nome e email são necessários
3. **Role válido**: Apenas 'admin' e 'usuario' são aceitos
4. **Autenticação**: Todos os endpoints estão protegidos com verificação de token
5. **Autorização**: Endpoints de admin verificam se user.role === 'admin'

## Bancos de Dados - Tabela `usuarios`

```sql
CREATE TABLE usuarios (
  id BIGINT PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  nome VARCHAR NOT NULL,
  senha_hash VARCHAR NOT NULL,
  role VARCHAR DEFAULT 'usuario', -- 'admin' ou 'usuario'
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Índices recomendados:
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_role ON usuarios(role);
CREATE INDEX idx_usuarios_ativo ON usuarios(ativo);
```

## Testes Recomendados

1. **Criar usuário como admin**
   - Criar um novo usuário padrão
   - Verificar se senha temporária foi gerada
   - Verify se aparece na lista

2. **Login com usuário padrão**
   - Fazer login com credenciais do novo usuário
   - Verificar se vê apenas suas demandas

3. **Login com admin**
   - Fazer login com admin
   - Verificar se vê todas as demandas
   - Acessar aba de Admin

4. **Filtração de dados**
   - Como admin: ver todas as opções de filtro
   - Como usuário padrão: ver apenas opções de suas demandas

5. **Ativar/Desativar**
   - Desativar um usuário
   - Tentar fazer login com usuário desativado
   - Verificar que retorna erro

## Segurança

- Senhas sempre hasheadas com SHA256 + salt
- Tokens JWT com expiração
- Middleware de autenticação em todos os endpoints protegidos
- Validação de role em operações administrativas
- Dados filtrados no servidor (não apenas no cliente)

## Melhorias Futuras Sugeridas

1. Implementar endpoint de "Trocar Senha"
2. Adicionar email de confirmação ao criar usuário
3. Implementar 2FA (Two-Factor Authentication)
4. Adicionar logs de auditoria
5. Implementar sistema de permissões mais granular
6. Adicionar funcionalidade de "reset de senha"
7. Implementar rate limiting em endpoints de autenticação
