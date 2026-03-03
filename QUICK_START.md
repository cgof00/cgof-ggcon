# 🚀 Quick Start - User Management System

## 5-Minuto Setup

### 1️⃣ Criar Tabela no Supabase (2 min)
```bash
# 1. Abra https://app.supabase.com → SQL Editor
# 2. Copie de: setup-database-usuarios.sql
# 3. Troque HASH_AQUI para:
npx ts-node hash-generator.ts
# 4. Execute query
```

### 2️⃣ Iniciar Servidor (1 min)
```bash
npm run dev
# Server rodando em http://localhost:4000
```

### 3️⃣ Fazer Login (1 min)
```
URL: http://localhost:5173
Email: admin@seu-dominio.com
Password: <a que você usou no hash-generator>
```

### 4️⃣ Acessar Admin Panel (1 min)
- Clique na aba "Admin" (apenas para admins)
- Crie novo usuário
- Copie senha temporária
- Logout e teste com novo usuário

---

## 📝 Comandos Úteis

### Gerar Hash SHA256
```bash
npx ts-node hash-generator.ts
```

### Testar Todos Endpoints
```bash
npx ts-node test-users-endpoints.ts
```

### Ver Usuários no Supabase
```sql
SELECT * FROM usuarios ORDER BY created_at DESC;
```

### Desativar Usuário Manualmente
```sql
UPDATE usuarios SET ativo = false WHERE email = 'user@example.com';
```

### Listar Admins Ativos
```sql
SELECT * FROM usuarios WHERE role = 'admin' AND ativo = true;
```

---

## 🔑 Endpoints Principais

### Login
```bash
POST /api/login
{
  "email": "admin@seu-dominio.com",
  "senha": "password"
}
```

### Criar Usuário
```bash
POST /api/admin/usuarios
Authorization: Bearer <token>
{
  "email": "novo@empresa.com",
  "nome": "Novo User",
  "role": "usuario"
}
```

### Listar Usuários
```bash
GET /api/usuarios
Authorization: Bearer <token>
```

### Atualizar Usuário
```bash
PUT /api/usuarios/:id
Authorization: Bearer <token>
{
  "nome": "New Name",
  "role": "admin",
  "ativo": true
}
```

### Deletar Usuário
```bash
DELETE /api/admin/usuarios/:id
Authorization: Bearer <token>
```

---

## 🧪 JavaScript Fetch Examples

### Login e Obter Token
```javascript
const res = await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@seu-dominio.com',
    senha: 'password'
  })
});
const { token } = await res.json();
localStorage.setItem('token', token);
```

### Listar Usuários
```javascript
const users = await fetch('/api/usuarios', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
console.log(await users.json());
```

### Criar Usuário
```javascript
const res = await fetch('/api/admin/usuarios', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  },
  body: JSON.stringify({
    email: 'novo@empresa.com',
    nome: 'Novo Usuário',
    role: 'usuario'
  })
});
const { usuario, senhaTemporaria } = await res.json();
alert(`Senha: ${senhaTemporaria}`);
```

---

## 🎯 Workflow Comum

1. **Admin Login**
   ```
   http://localhost:5173 → email/password → Entra
   ```

2. **Criar Técnico**
   ```
   Admin Tab → Novo Usuário → Preench dados → Cria → Copia senha
   ```

3. **Técnico Recebe Senha**
   ```
   Email/WhatsApp: "Usuário: joao@empresa.com | Senha: x9k2M7pQrL"
   ```

4. **Técnico Faz Login**
   ```
   http://localhost:5173 → joao@empresa.com / x9k2M7pQrL → Entra
   ```

5. **Técnico Vê Demandas**
   ```
   Formalizações → Vê apenas demandas onde tecnico="joao@empresa.com"
   ```

6. **Admin Gerencia**
   ```
   Admin → Encontra técnico → Ativa/Desativa/Muda role
   ```

---

## 🚨 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| 401 Unauthorized | Faça login novamente, token pode ter expirado |
| 403 Forbidden | Você não é admin, use conta admin |
| Email duplicado | Use email único ou delete o antiga |
| Senha não funciona | Verifique se hash está correto no banco |
| Não vê aba Admin | Você não é admin, mude role no banco |

---

## 📊 Arquitetura

```
┌─────────────────────┐
│   React Frontend    │
│  (AdminPanel.tsx)   │
└──────────┬──────────┘
           │ /api/usuarios
           │ /api/formalizacao
           ▼
┌─────────────────────┐
│   Express Server    │
│  (server.ts)        │
│ ┌─────────────────┐ │
│ │authMiddleware   │ │
│ │ (JWT validate)  │ │
│ └─────────────────┘ │
└──────────┬──────────┘
           │ Supabase
           ▼
┌─────────────────────┐
│  PostgreSQL         │
│  (usuarios table)   │
└─────────────────────┘
```

---

## 🔒 Segurança

✅ Implementado:
- JWT token autenticação
- Middleware em endpoints protegidos
- SHA256 password hashing
- Role-based access control
- Soft delete (audit trail)

⚠️ TODO Produção:
- [ ] HTTPS/TLS
- [ ] Rate limiting
- [ ] 2FA
- [ ] CORS restriction
- [ ] Bcrypt passwords
- [ ] Refresh tokens

---

## 📞 Referências Rápidas

- **Documentação Detalhada**: `USER_MANAGEMENT_GUIDE.md`
- **Setup Passo-a-Passo**: `SETUP_USUARIOS_PASSO_A_PASSO.md`
- **Referência API**: `API_REFERENCE.md`
- **Resumo Implementação**: `IMPLEMENTATION_SUMMARY.md`
- **SQL Schema**: `setup-database-usuarios.sql`
- **Hash Generator**: `hash-generator.ts`
- **Teste Endpoints**: `test-users-endpoints.ts`

---

## ✨ Features

✅ Create User
✅ Read Users
✅ Update User
✅ Delete User (soft)
✅ Admin Panel
✅ Role-based Access
✅ Admin/Usuario roles
✅ Tecnico filtering
✅ JWT tokens
✅ Password hashing
✅ Auto expiry (24h)

---

## 🎬 Exemplo Real: Criar Admin Secondary

```bash
# 1. Gerar hash
npx ts-node hash-generator.ts
# Saída: hash aqui

# 2. SQL no supabase
INSERT INTO usuarios 
  (email, nome, senha_hash, role, ativo) 
VALUES 
  ('admin2@empresa.com', 'Admin 2', 'HASH_AQUI', 'admin', true);

# 3. Login com nova senha
email: admin2@empresa.com
password: <que você usou para hash>

# 4. Verificar no Painel Admin
GET /api/usuarios → deve aparecer ambos admins
```

---

## 📱 Mobile/Postman Testing

### Postman Collection
```json
{
  "info": { "name": "User Management API" },
  "item": [
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "url": "http://localhost:4000/api/login",
        "body": {
          "email": "admin@seu-dominio.com",
          "senha": "password"
        }
      }
    },
    {
      "name": "Get Users",
      "request": {
        "method": "GET",
        "url": "http://localhost:4000/api/usuarios",
        "header": {
          "Authorization": "Bearer {{token}}"
        }
      }
    }
  ]
}
```

---

## 🎯 Success Checklist

- [ ] Server rodando
- [ ] Admin consegue fazer login
- [ ] Painel Admin aparece
- [ ] Consegue criar novo usuário
- [ ] Novo usuário consegue login
- [ ] Senha temporária funciona
- [ ] Filtro de técnico funciona
- [ ] Soft delete funciona
- [ ] Sem erros 401/403 inesperados

---

**Status:** ✅ PRONTO  
**Version:** 1.0  
**Last Updated:** 2024
