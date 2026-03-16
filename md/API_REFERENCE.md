# 📚 API Reference - User Management System

## Índice
1. [Autenticação](#autenticação)
2. [Endpoints de Usuários](#endpoints-de-usuários)
3. [Endpoints de Dados Protegidos](#endpoints-de-dados-protegidos)
4. [Códigos de Erro](#códigos-de-erro)
5. [Exemplos de Uso](#exemplos-de-uso)

---

## Autenticação

### POST /api/login
Realiza login e retorna um JWT token.

**Request:**
```bash
POST /api/login
Content-Type: application/json

{
  "email": "user@example.com",
  "senha": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "userId": 1,
    "email": "user@example.com",
    "role": "admin"
  }
}
```

**Headers necessários em requisições subsequentes:**
```
Authorization: Bearer <token_aqui>
```

---

## Endpoints de Usuários

### GET /api/usuarios
Lista todos os usuários (apenas admin).

**Request:**
```bash
GET /api/usuarios
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "id": 1,
    "email": "admin@example.com",
    "nome": "Admin",
    "role": "admin",
    "ativo": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

**Erros:**
- `401` - Token não fornecido ou inválido
- `403` - Usuário não é admin

---

### POST /api/admin/usuarios
Cria um novo usuário (apenas admin).

**Request:**
```bash
POST /api/admin/usuarios
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "novo@example.com",
  "nome": "Novo Usuário",
  "role": "usuario"
}
```

**Response (201):**
```json
{
  "usuario": {
    "id": 2,
    "email": "novo@example.com",
    "nome": "Novo Usuário",
    "role": "usuario",
    "ativo": true,
    "created_at": "2024-01-16T14:20:00Z"
  },
  "senhaTemporaria": "x9k2M7pQrL"
}
```

**Validações:**
- Email deve ser único
- Email e nome obrigatórios
- Role: "admin" ou "usuario"

**Erros:**
- `400` - Email duplicado ou dados inválidos
- `401` - Token não fornecido ou inválido
- `403` - Usuário não é admin

---

### PUT /api/usuarios/:id
Atualiza informações de um usuário (apenas admin).

**Request:**
```bash
PUT /api/usuarios/2
Authorization: Bearer <token>
Content-Type: application/json

{
  "nome": "Novo Nome",
  "role": "admin",
  "ativo": true
}
```

**Response (200):**
```json
{
  "success": true,
  "usuario": {
    "id": 2,
    "email": "novo@example.com",
    "nome": "Novo Nome",
    "role": "admin",
    "ativo": true,
    "created_at": "2024-01-16T14:20:00Z",
    "updated_at": "2024-01-17T11:45:00Z"
  }
}
```

**Campos atualizáveis:**
- `nome` - String
- `role` - "admin" ou "usuario"
- `ativo` - Boolean

**Erros:**
- `400` - ID não encontrado
- `401` - Token não fornecido ou inválido
- `403` - Usuário não é admin

---

### DELETE /api/admin/usuarios/:id
Deleta um usuário - soft delete (apenas admin).

**Request:**
```bash
DELETE /api/admin/usuarios/2
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Usuário deletado com sucesso",
  "usuario": {
    "id": 2,
    "email": "novo@example.com",
    "nome": "Novo Usuário",
    "role": "usuario",
    "ativo": false
  }
}
```

**Nota:** Usa soft delete - usuário marca como inativo, não é removido do banco.

**Erros:**
- `400` - ID não encontrado
- `401` - Token não fornecido ou inválido
- `403` - Usuário não é admin

---

### GET /api/auth/me
Retorna informações do usuário logado.

**Request:**
```bash
GET /api/auth/me
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "userId": 1,
  "email": "user@example.com",
  "role": "admin",
  "iat": 1700000000,
  "exp": 1700086400
}
```

**Erros:**
- `401` - Token não fornecido ou inválido
- `401` - Token expirado

---

## Endpoints de Dados Protegidos

Todos os endpoints abaixo exigem autenticação válida (`Authorization: Bearer <token>`).

### GET /api/formalizacao
Retorna formalizações. Se usuário padrão: apenas as onde tecnico = seu email.

**Query Parameters:**
- `skip` - Número de registros para pular (default: 0)
- `limit` - Número de registros para retornar (default: 50)

**Response (200):**
```json
[
  {
    "id": 1,
    "emenda": "Emendamento 001",
    "tecnico": "joao@example.com",
    "status": "em_andamento",
    ...
  }
]
```

---

### GET /api/formalizacao/page/:pageNum
Pagina resultados de formalizações.

**Response (200):**
```json
{
  "data": [...],
  "total": 150,
  "page": 0,
  "per_page": 50,
  "total_pages": 3
}
```

---

### GET /api/formalizacao/search
Busca formalizações (com filtro de tecnico se usuário padrão).

**Query Parameters:**
- `q` - Termo de busca

**Response (200):**
```json
[...]
```

---

### GET /api/formalizacao/filters-cascata
Retorna filtros disponíveis. Usuários padrão veem apenas opções de suas demandas.

**Response (200):**
```json
{
  "emendas": [...],
  "status": [...],
  "tecnicos": [...]
}
```

---

### GET /api/emendas
Retorna todas as emendas. Requer autenticação.

**Response (200):**
```json
[
  {
    "id": 1,
    "nome": "Emenda 001",
    "descricao": "...",
    ...
  }
]
```

---

## Códigos de Erro

| Código | Descrição | Solução |
|--------|-----------|---------|
| `200` | Sucesso | Operação completada |
| `201` | Criado | Recurso criado com sucesso |
| `400` | Bad Request | Verifique o body da request |
| `401` | Unauthorized | Token ausente, inválido ou expirado |
| `403` | Forbidden | Permissão insuficiente |
| `404` | Not Found | Recurso não encontrado |
| `500` | Server Error | Erro interno - verifique logs |

---

## Exemplos de Uso

### Exemplo 1: Flow Completo de Login e Acesso

```bash
# 1. Login
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@seu-dominio.com",
    "senha": "AdminSeguro2024!"
  }'

# Resposta:
# {
#   "token": "eyJhbGc...",
#   "user": { "userId": 1, "email": "...", "role": "admin" }
# }

# 2. Guardar token em variável
TOKEN="eyJhbGc..."

# 3. Usar token em requisições
curl -X GET http://localhost:4000/api/usuarios \
  -H "Authorization: Bearer $TOKEN"
```

### Exemplo 2: Criar Novo Usuário

```bash
TOKEN="seu_token_aqui"

curl -X POST http://localhost:4000/api/admin/usuarios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "email": "novo.tecnico@empresa.com",
    "nome": "Técnico Silva",
    "role": "usuario"
  }'
```

### Exemplo 3: Atualizar Usuário

```bash
TOKEN="seu_token_aqui"
USER_ID="2"

curl -X PUT http://localhost:4000/api/usuarios/$USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "nome": "Novo Nome",
    "role": "admin"
  }'
```

### Exemplo 4: Deletar Usuário

```bash
TOKEN="seu_token_aqui"
USER_ID="2"

curl -X DELETE http://localhost:4000/api/admin/usuarios/$USER_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Exemplo 5: JavaScript/Fetch

```javascript
// Fazer login
const loginRes = await fetch('http://localhost:4000/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@seu-dominio.com',
    senha: 'AdminSeguro2024!'
  })
});

const { token } = await loginRes.json();
localStorage.setItem('token', token);

// Usar token em requisições posteriores
const usuariosRes = await fetch('http://localhost:4000/api/usuarios', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});

const usuarios = await usuariosRes.json();
console.log(usuarios);
```

---

## Fluxo de Autenticação Detalhado

```
1. Cliente faz POST /api/login com email + senha
   ↓
2. Servidor valida credenciais no banco
   ↓
3. Servidor gera JWT token com payload:
   {
     "userId": 1,
     "email": "user@example.com",
     "role": "admin",
     "iat": 1700000000,        // Issued at
     "exp": 1700086400         // Expira em 24h
   }
   ↓
4. Cliente recebe token e armazena em localStorage
   ↓
5. Cliente inclui token em header: Authorization: Bearer <token>
   ↓
6. Middleware authMiddleware valida:
   - Token presente?
   - Token pode ser decodificado (base64)?
   - Token não expirou? (exp > now)
   ↓ Se válido:
7. Server fornece acesso com user info em req.user
   ↓ Se inválido:
7. Server retorna 401 Unauthorized
```

---

## Checklist de Integração

- [ ] Endpoint `/api/login` retorna token válido
- [ ] Tokens funcionam em header `Authorization: Bearer <token>`
- [ ] Token expira em 24h (403 após expiração)
- [ ] `GET /api/usuarios` retorna 200 para admin, 403 para não-admin
- [ ] `POST /api/admin/usuarios` cria novo usuário
- [ ] Novo usuário consegue fazer login com senha temporária
- [ ] `PUT /api/usuarios/:id` atualiza dados
- [ ] `DELETE /api/admin/usuarios/:id` soft-deleta (ativo=false)
- [ ] Usuários padrão veem apenas suas demandas (filtro por tecnico)
- [ ] Admins veem todos os dados

---

## Notas de Segurança

⚠️ **Em Desenvolvimento:**
- Tokens são simples base64 (não é JWT real)
- Senhas são SHA256 com salt (melhorar em produção com bcrypt)
- CORS não está configurado (adicionar em produção)
- HTTPS não está ativo (adicionar em produção)

✅ **Para Produção:**
1. Usar JWT real com RS256 (RSA)
2. Usar bcrypt para hashing de senhas
3. Configurar CORS restritivamente
4. Ativar HTTPS/TLS
5. Rate limiting em endpoints de auth
6. 2FA (Two-Factor Authentication)
7. Auditoria de acessos
8. Renovação de tokens (refresh tokens)

---

## Status do Desenvolvimento

✅ Funcionalidades Implementadas:
- [x] Sistema base de autenticação com JWT
- [x] CRUD completo de usuários
- [x] Roles e controle de acesso (RBAC)
- [x] Filtro de dados por tecnico para usuários padrão
- [x] AdminPanel React para gerenciamento
- [x] Senhas temporárias para novos usuários
- [x] Soft delete (marcar como inativo)
- [x] Endpoints protegidos com middleware

⏳ Futuro:
- [ ] Mudança de senha pelo usuário
- [ ] Recuperação de senha por email
- [ ] 2FA (Two-Factor Authentication)
- [ ] Histórico de acessos (auditoria)
- [ ] Limite de tentativas de login
- [ ] Sincronização com Active Directory/LDAP

---

**Versão:** 1.0  
**Última atualização:** 2024  
**Status:** ✅ Pronto para Desenvolvimento
