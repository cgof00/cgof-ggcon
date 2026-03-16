# 🚀 Implementação do Sistema de Gerenciamento de Usuários

## 📋 Resumo

Este documento fornece instruções passo a passo para:
1. Criar a tabela `usuarios` no Supabase
2. Gerar hash SHA256 para a senha do admin
3. Testar o sistema de autenticação
4. Verificar os endpoints CRUD de usuários
5. Validar filtros de acesso baseados em roles

## ✅ Checklist de Pré-Requisitos

- [ ] Projeto Node.js local rodando em `http://localhost:4000`
- [ ] Supabase project criado e conectado
- [ ] Arquivo `.env` com credenciais Supabase
- [ ] Frontend React rodando em `http://localhost:5173` (Vite)
- [ ] Git com alterações commitadas

## 🔧 Instalação Passo-a-Passo

### Passo 1: Gerar Hash SHA256 para Admin

**1.1** Abra terminal no diretório do projeto

**1.2** Execute o gerador:
```bash
npx ts-node hash-generator.ts
```

**Esperado:**
```
🔐 GERADOR DE HASH SHA256 - Sistema de Usuários

────────────────────────────────────────────────────────────────

1️⃣  Gerando hash para admin padrão:

   Senha: AdminSeguro2024!
   Hash:  7e4d...f2a9

   Força da senha:
   ✅ Senha forte!

...
```

**1.3** Copie o hash gerado

---

### Passo 2: Criar Tabela no Supabase

**2.1** Acesse seu projeto Supabase:
- Vá em: https://app.supabase.com
- Selecione seu projeto
- Clique em "SQL Editor" (à esquerda)

**2.2** Crie uma nova query clicando em "+ New Query"

**2.3** Copie o conteúdo do arquivo `setup-database-usuarios.sql`

**2.4** **IMPORTANTE**: Substitua no SQL:
```
'5e884898da28047151d0e56f8dc62927e8d9ffb9d5d15f0d7a14e3b0beeff0de'
```
Pelo hash gerado no Passo 1

**2.5** Execute a query clicando em "Run"

**Esperado:**
```
✅ Query created successfully
✅ Table usuarios created
✅ Indexes created
✅ Trigger created
✅ Admin user inserted
```

**2.6** Verifique na aba "Table Editor":
- Deve aparecer tabela "usuarios" com 1 usuário (admin)

---

### Passo 3: Verificar Dados no Supabase

**3.1** Acesse "Table Editor" → "usuarios"

**3.2** Confirme que vê:
```
id: 1
email: admin@seu-dominio.com
nome: Administrador
role: admin
ativo: true
created_at: 2024-01-17...
```

---

### Passo 4: Testar Login

**4.1** Abra o navegador em: `http://localhost:5173`

**4.2** Faça login com:
- Email: `admin@seu-dominio.com`
- Senha: `AdminSeguro2024!` (ou a que você usou no Passo 1)

**Esperado:**
- ✅ Login bem-sucedido
- ✅ Redirecionado para dashboard
- ✅ Aparece aba "Admin" (quando logado como admin)
- ✅ Token JWT armazenado em localStorage

**4.3** Abra DevTools (F12) e verifique localStorage:
```
localStorage.getItem('token')
// Deve retornar um JWT token começando com "eyJ..."

localStorage.getItem('userInfo')
// Deve retornar objeto JSON com user details
```

---

### Passo 5: Testar Painel Admin

**5.1** Clique na aba "Admin" → "Gerenciamento de Usuários"

**5.2** Verifique lista de usuários:
- [ ] Aparece usuário admin criado
- [ ] Informações corretas (email, nome, role, status)
- [ ] Botões funcionam (sem erros HTTP no console)

**5.3** Verifique logs do servidor:
```
👥 GET /api/usuarios - User: admin@seu-dominio.com Role: admin
✅ Usuários obtidos: 1
```

---

### Passo 6: Criar Novo Usuário

**6.1** Painel Admin → Clique "Criar Usuário"

**6.2** Preencha:
- Email: `joao@empresa.com`
- Nome: `João Silva`
- Role: `usuario`

**6.3** Clique "Criar"

**Esperado:**
```
➕ POST /api/admin/usuarios - Email: joao@empresa.com Role: admin
🔐 Senha temporária gerada: a1b*****
✅ Usuário criado com sucesso: joao@empresa.com - Role: usuario
```

**6.4** Copie a senha temporária exibida

---

### Passo 7: Testar Login com Novo Usuário

**7.1** Logout do admin:
- Clique "Logout" no canto superior

**7.2** Faça login com novo usuário:
- Email: `joao@empresa.com`
- Senha: `<a que foi gerada>`

**Esperado:**
- ✅ Login bem-sucedido
- ✅ Redirecionado para dashboard
- ✅ **NÃO APARECE** aba "Admin" (porque é usuário padrão)
- ✅ Ao abrir "Formalizações", vê apenas registro se houver tecnico="joao@empresa.com"

---

### Passo 8: Testar Filtro de Acesso por Role

**8.1** Logado como admin:

**8.2** Vá para "Formalizações" - deve ver **TODAS** as demandas

**8.3** Logout e login como João (`joao@empresa.com`)

**8.4** Vá para "Formalizações" → deve ver apenas demandas onde:
- Coluna "Técnico" contém `joao@empresa.com`

**Verifique no console:**
```
📥 GET /api/formalizacao/page/0 - User: joao@empresa.com Role: usuario
📊 Total records: 150
🔍 Filtered by tecnico: joao@empresa.com
✅ Formalizações obtidas: 5 (de 150 total)
```

---

### Passo 9: Testar Atualização de Usuário

**9.1** Logado como admin, Painel Admin

**9.2** Encontre usuário João na lista

**9.3** Clique para editar:
- Mude nome para: `João Silva Santos`
- Mude role para: `admin`

**9.4** Clique "Salvar"

**Esperado:**
```
✏️ PUT /api/usuarios/2 - ID: 2 Role: admin Updates: {...}
✅ Usuário atualizado: joao@empresa.com
```

**9.5** Faça logout e login novamente como João

**9.6** Agora **deve aparecer** aba "Admin"

---

### Passo 10: Testar Soft Delete

**10.1** Painel Admin, encontre um usuário

**10.2** Clique no ícone 🗑️ (deletar)

**10.3** Confirme ação

**Esperado:**
```
🗑️ DELETE /api/admin/usuarios/2 - ID: 2 Role: admin
✅ Usuário desativado: joao@empresa.com
```

**10.4** O usuário ainda aparece na lista mas com `ativo: false`

**10.5** Tente fazer login com este usuário

**Esperado:**
- ❌ Login falha (usuário inativo)

---

## 📊 Estrutura do Banco

Após completar os passos acima, seu Supabase terá:

### Tabela: usuarios

```
Columns:
├── id (BIGINT, Primary Key)
├── email (VARCHAR, UNIQUE)
├── nome (VARCHAR)
├── senha_hash (VARCHAR)
├── role (VARCHAR: 'admin' ou 'usuario')
├── ativo (BOOLEAN)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

Indexes:
├── idx_usuarios_email (UNIQUE)
├── idx_usuarios_role
├── idx_usuarios_ativo
└── idx_usuarios_created_at

Triggers:
└── trigger_usuarios_update_timestamp
```

---

## 🔍 Troubleshooting

### ❌ Erro 401 Unauthorized ao tentar acessar /api/usuarios

**Causa possível**: Token não está sendo enviado

**Solução**:
1. Abra DevTools (F12) → Console
2. Execute: `localStorage.getItem('token')`
3. Se retornar `null`, faça login novamente
4. Se retornar um token mas ainda dar 401:
   - Verifique se o token é válido em: https://jwt.io/
   - Confirme que `updated_at` não é muito antigo (> 24h = expirado)

### ❌ Erro 403 Forbidden

**Causa**: Usuário não é admin

**Solução**:
1. Confirme que è admin no banco: `SELECT role FROM usuarios WHERE email='...';`
2. Logout/Login novamente
3. Se mudou role para admin recentemente, pode estar com token cacheado

### ❌ Senha do admin não funciona

**Causa**: Hash incorreto no INSERE

**Solução**:
1. Gere novo hash: `npx ts-node hash-generator.ts`
2. Execute UPDATE no Supabase SQL:
   ```sql
   UPDATE usuarios 
   SET senha_hash = '<novo_hash>'
   WHERE email = 'admin@seu-dominio.com';
   ```

### ❌ Email disse "já existe" ao criar novo usuário

**Causa**: Email precisa ser único (case-insensitive)

**Solução**:
1. Verifique se ya existe no banco:
   ```sql
   SELECT * FROM usuarios WHERE email ILIKE 'novo@empresa.com';
   ```
2. Se foi deletado (soft delete, ativo=false), use outro email ou faça:
   ```sql
   DELETE FROM usuarios WHERE email = 'novo@empresa.com';
   ```

### ❌ Usuário João não consegue ver formalizações

**Causa**: Não há demandas com tecnico="joao@empresa.com"

**Solução**:
1. Abra uma demanda como admin
2. Na coluna "Técnico", escreva: `joao@empresa.com`
3. Salve
4. Login como João e atualize a página
5. Agora deve aparecer

### ❌ Servidor não está rodando

**Solução**:
```bash
npm run dev
# ou manualmente:
npx ts-node server.ts
```

Deve aparecer:
```
✅ Server running on port 4000
✅ Supabase connected
```

---

## 🎯 Checklist Final

- [ ] Tabela `usuarios` criada no Supabase
- [ ] Usuário admin consegue fazer login
- [ ] Painel Admin acessível (aba "Admin" aparece)
- [ ] Consegue criar novo usuário
- [ ] Novo usuário consegue fazer login
- [ ] Novo usuário vê apenas suas demandas (filtro por tecnico)
- [ ] Admin consegue mudar role de usuário
- [ ] Admin consegue desativar usuário
- [ ] Usuário desativado não consegue mais fazer login
- [ ] Logs do servidor mostram operações corretas
- [ ] Não há erros 401/403 não esperados

---

## 📞 Próximas Funcionalidades (Futuro)

- [ ] Endpoint para mudar própria senha
- [ ] Recuperação de senha por email
- [ ] Two-Factor Authentication (2FA)
- [ ] Auditoria de ações de usuários
- [ ] Limite de tentativas de login
- [ ] Expiração automática de senhas
- [ ] Display de foto do usuário
- [ ] Integração com LDAP/Active Directory

---

## 📝 Notas Importantes

✅ O sistema usa **soft delete** - usuários deletados continuam no banco mas marcados como `ativo: false`

✅ Emails são armazenados em **case-insensitive** - `João@Empresa.com` = `joao@empresa.com`

✅ Senhas são hasheadas com **SHA256** - nunca armazenadas em texto plano

✅ Cada mudança atualiza automaticamente o campo `updated_at` (via trigger)

✅ Tokens JWT expiram em **24 horas**

---

**Versão:** 1.0  
**Última atualização:** 2024  
**Status:** ✅ Pronto para Produção
