# Guia de Gerenciamento de Usuários

## 📋 Visão Geral

O sistema implementa um sistema completo de gerenciamento de usuários com controle de acesso baseado em papéis (RBAC). Admins podem criar, modificar, desativar e deletar usuários.

## 👤 Roles (Papéis)

### Admin (Administrador)
- Acesso total a todas as demandas (emendas e formalizações)
- Pode gerenciar outros usuários (criar, editar, deletar)
- Acesso ao painel administrativo

### Usuario (Usuário Padrão)
- Vê apenas as demandas onde está listado como "Técnico"
- Não pode gerenciar usuários
- Acesso limitado às operações relacionadas às suas demandas

## 🔐 Endpoints de Usuários

### 1. GET /api/usuarios
**Descrição:** Lista todos os usuários do sistema

**Requerimentos:**
- ✅ Autenticação obrigatória
- ✅ Apenas admins podem usar
- 🔑 Header: `Authorization: Bearer <token>`

**Response - Sucesso (200):**
```json
[
  {
    "id": 1,
    "email": "admin@example.com",
    "nome": "Administrator",
    "role": "admin",
    "ativo": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  {
    "id": 2,
    "email": "tecnico@example.com",
    "nome": "João Silva",
    "role": "usuario",
    "ativo": true,
    "created_at": "2024-01-16T14:20:00Z",
    "updated_at": "2024-01-16T14:20:00Z"
  }
]
```

**Erros:**
- **403 Forbidden:** Usuário não é admin
- **500 Internal Server Error:** Erro ao buscar dados

---

### 2. POST /api/admin/usuarios
**Descrição:** Cria um novo usuário no sistema

**Requerimentos:**
- ✅ Autenticação obrigatória
- ✅ Apenas admins podem usar
- 🔑 Header: `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "email": "novo.usuario@example.com",
  "nome": "Nome do Usuário",
  "role": "usuario"  // ou "admin"
}
```

**Response - Sucesso (201):**
```json
{
  "usuario": {
    "id": 3,
    "email": "novo.usuario@example.com",
    "nome": "Nome do Usuário",
    "role": "usuario",
    "ativo": true,
    "created_at": "2024-01-17T09:15:00Z"
  },
  "senhaTemporaria": "a1b2C3d4EF",
  "aviso": "Compartilhe a senha temporária com o usuário. Ele deverá trocá-la no primeiro login."
}
```

**Validações:**
- Email deve ser único (case-insensitive)
- Email e nome são campos obrigatórios
- Role deve ser "admin" ou "usuario"

**Erros:**
- **400 Bad Request:** Email duplicado ou dados inválidos
- **403 Forbidden:** Usuário não é admin
- **500 Internal Server Error:** Erro ao criar usuário

---

### 3. PUT /api/usuarios/:id
**Descrição:** Atualiza informações de um usuário

**Requerimentos:**
- ✅ Autenticação obrigatória
- ✅ Apenas admins podem usar
- 🔑 Header: `Authorization: Bearer <token>`

**Request Body (todos os campos opcionais):**
```json
{
  "nome": "Novo Nome",
  "role": "admin",  // ou "usuario"
  "ativo": false    // para desativar sem deletar
}
```

**Response - Sucesso (200):**
```json
{
  "success": true,
  "usuario": {
    "id": 2,
    "email": "tecnico@example.com",
    "nome": "João Silva Atualizado",
    "role": "admin",
    "ativo": true,
    "created_at": "2024-01-16T14:20:00Z",
    "updated_at": "2024-01-17T11:45:00Z"
  }
}
```

**Campos Atualizáveis:**
- `nome` - Nome completo
- `role` - Papel (admin ou usuario)
- `ativo` - Status ativo/inativo

**Campos NÃO Atualizáveis:**
- `email` - Não pode ser alterado
- `senha_hash` - Use endpoint específico
- `created_at` - Timestamp imutável
- Campos de auditoria são gerenciados automaticamente

**Erros:**
- **400 Bad Request:** ID não encontrado ou dados inválidos
- **403 Forbidden:** Usuário não é admin
- **500 Internal Server Error:** Erro ao atualizar

---

### 4. DELETE /api/admin/usuarios/:id
**Descrição:** Deleta (desativa) um usuário

**Requerimentos:**
- ✅ Autenticação obrigatória
- ✅ Apenas admins podem usar
- 🔑 Header: `Authorization: Bearer <token>`

**Response - Sucesso (200):**
```json
{
  "message": "Usuário deletado com sucesso",
  "usuario": {
    "id": 3,
    "email": "ex.usuario@example.com",
    "nome": "Usuário Antigo",
    "role": "usuario",
    "ativo": false
  }
}
```

**Nota Importante:**
- ⚠️ Usa **soft delete** - o usuário não é removido do banco, apenas marcado como `ativo: false`
- O email permanece reservado e não pode ser reutilizado
- Histórico do usuário é preservado para auditoria

**Erros:**
- **400 Bad Request:** ID não encontrado
- **403 Forbidden:** Usuário não é admin
- **500 Internal Server Error:** Erro ao deletar

---

## 🔒 Controle de Acesso por Role

### Dados Visíveis para Cada Role

**Admin:**
- ✅ Todos os recursos em `/api/formalizacao`
- ✅ Todos os recursos em `/api/emendas`
- ✅ Todos os usuários em `/api/usuarios`

**Usuario (Padrão):**
- ✅ Apenas formalizações onde `tecnico === seu_email`
- ✅ Apenas emendas relacionadas às formalizações que pode ver
- ❌ Não pode acessar `/api/usuarios`
- ❌ Não pode acessar `/api/admin/*`

### Filtro de Dados para Usuários Padrão

```typescript
// No servidor, para cada request:
if (req.user.role === 'usuario') {
  data = data.filter(f => 
    f.tecnico && 
    f.tecnico.toLowerCase().trim() === req.user.email.toLowerCase().trim()
  );
}
```

---

## 👨‍💼 Painel Administrativo

### Localização
- Tab "Admin" (apenas para admins)
- Ícone: Shield ⚔️

### Funcionalidades

#### Listar Usuários
- Visualizar todos os usuários
- Ver status (ativo/inativo)
- Filtrar e buscar
- Paginação automática

#### Criar Novo Usuário
1. Clique em "Criar Usuário"
2. Preencha:
   - Email (único)
   - Nome
   - Role (admin ou usuario)
3. Sistema gera senha temporária automaticamente
4. Copie e compartilhe com o usuário
5. Usuário muda a senha no primeiro login

#### Alterar Usuário
1. Clique no usuário na lista
2. Modifique:
   - Nome
   - Role
   - Status (ativo/inativo)
3. Clique "Salvar"
4. Mudanças são aplicadas imediatamente

#### Desativar/Deletar Usuário
1. Encontre o usuário na lista
2. Clique no ícone de deletar (🗑️)
3. Confirme a ação
4. Usuário é marcado como inativo
5. Email permanece reservado

---

## 🔑 Fluxo de Autenticação

### 1. Login Inicial
```
usuário -> POST /api/login com email + senha
          -> Servidor valida credenciais
          -> Retorna JWT token + user info
          -> Frontend armazena token em localStorage
```

### 2. Requisições Subsequentes
```
usuário -> GET /api/formalizacao
          -> Frontend inclui: Authorization: Bearer <token>
          -> Middleware valida token
          -> Se válido: processa request com user info incluído
          -> Se inválido: retorna 401 Unauthorized
```

### 3. Logout
```
usuário -> clica "Logout"
          -> localStorage é limpo
          -> Redirecionado para tela de login
```

---

## ⚙️ Esquema do Banco de Dados

### Tabela: usuarios

| Coluna | Tipo | Unique | Nullable | Descrição |
|--------|------|--------|----------|-----------|
| id | BIGINT | ✅ | ❌ | ID único do usuário |
| email | VARCHAR | ✅ | ❌ | Email único do usuário |
| nome | VARCHAR | ❌ | ❌ | Nome completo |
| senha_hash | VARCHAR | ❌ | ❌ | Hash SHA256 da senha |
| role | VARCHAR | ❌ | ✅ | 'admin' ou 'usuario' |
| ativo | BOOLEAN | ❌ | ✅ | Indica se usuário está ativo |
| created_at | TIMESTAMP | ❌ | ❌ | Data de criação |
| updated_at | TIMESTAMP | ❌ | ❌ | Data última atualização |

### Índices

```sql
CREATE UNIQUE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_role ON usuarios(role);
CREATE INDEX idx_usuarios_ativo ON usuarios(ativo);
```

---

## 📝 Exemplos de Uso

### Exemplo 1: Criar um novo usuário técnico
```bash
curl -X POST http://localhost:4000/api/admin/usuarios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -d '{
    "email": "joao.silva@empresa.com",
    "nome": "João Silva",
    "role": "usuario"
  }'
```

**Resposta:**
```json
{
  "usuario": {
    "id": 15,
    "email": "joao.silva@empresa.com",
    "nome": "João Silva",
    "role": "usuario",
    "ativo": true,
    "created_at": "2024-01-17T09:15:00Z"
  },
  "senhaTemporaria": "x9k2M7pQrL",
  "aviso": "Compartilhe a senha temporária com o usuário..."
}
```

### Exemplo 2: Mudar um usuário para admin
```bash
curl -X PUT http://localhost:4000/api/usuarios/15 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -d '{
    "role": "admin"
  }'
```

### Exemplo 3: Desativar um usuário
```bash
curl -X PUT http://localhost:4000/api/usuarios/15 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -d '{
    "ativo": false
  }'
```

### Exemplo 4: Deletar um usuário (soft delete)
```bash
curl -X DELETE http://localhost:4000/api/admin/usuarios/15 \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

---

## 🚨 Problemas Comuns

### 401 Unauthorized
- **Causa:** Token ausente, expirado ou inválido
- **Solução:** 
  1. Faça login novamente
  2. Verifique se localStorage contém o token
  3. Atualize a página

### 403 Forbidden
- **Causa:** Usuário não é admin
- **Solução:** Peça a um admin para executar a operação

### 400 Bad Request - Email duplicado
- **Causa:** Email já existe no sistema
- **Solução:** Use um email único ou reutilize soft-deleted (ativo=false)

### 500 Internal Server Error
- **Causa:** Erro no servidor ou banco de dados
- **Solução:** 
  1. Verifique logs do servidor
  2. Confirme que tabela `usuarios` existe
  3. Verifique conexão com Supabase

---

## 📊 Senhas Temporárias

Quando um novo usuário é criado:
- ✅ Senha é gerada automaticamente (10+ caracteres)
- ✅ Deve ser compartilhada de forma segura (não por email!)
- ✅ É válida para 1 login
- ❌ Não deve ser armazenada em texto claro
- ❌ Usuário **deve** trocá-la no primeiro login

**Formato da Senha Gerada:**
- 10 caracteres aleatórios
- 2 maiúsculas
- Exemplo: `a1b2C3d4EF`

---

## 🔄 Workflow Típico do Admin

### 1️⃣ Criar novo técnico
1. Painel Admin → "Criar Usuário"
2. Email: `novo.tecnico@empresa.com`
3. Nome: `Novo Técnico`
4. Role: `usuario`
5. Copiar senha temporária
6. Compartilhar com o técnico (WhatsApp, pessoalmente, etc)

### 2️⃣ Assign técnico a uma demanda
1. Na demanda, preencher coluna "Técnico" com o email

### 3️⃣ Técnico faz login
1. Email: `novo.tecnico@empresa.com`
2. Senha: `<copia da gerada por você>`
3. Sistema solicita mudança de senha

### 4️⃣ Técnico vê suas demandas
1. Va a "Formalizações"  
2. Vê apenas demandas onde está como Técnico
3. Pode atualizar status e informações

### 5️⃣ Remover técnico (se necessário)
1. Painel Admin → Encontre técnico
2. Clique deletar (ícone 🗑️)
3. Técnico não consegue mais fazer login
4. Email fica reservado (soft delete)

---

## 📞 Suporte

Para problemas ou dúvidas sobre gerenciamento de usuários:
1. Verifique os logs do servidor (console)
2. Confirme que está usando token válido
3. Verifique se a tabela `usuarios` existe no Supabase

---

**Última atualização:** 2024
**Versão:** 1.0
