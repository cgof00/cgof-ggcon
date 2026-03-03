# 🔐 Sistema de Autenticação e Controle de Acesso

## Visão Geral

O sistema agora possui autenticação completa com 3 níveis de acesso:

### 📋 Roles (Papéis)

| Role | Descrição | Permissões |
|------|-----------|-----------|
| **Admin** | Administrador do sistema | Controle total - criar, editar, deletar emendas e formalizações, gerenciar usuários |
| **Intermediário** | Supervisor técnico | Visualizar tudo, editar formalizações, gerenciar demandas |
| **Usuário** | Técnico padrão | Acesso apenas às demandas atribuídas a ele |

---

## ✅ Banco de Dados - Tabela de Usuários

```sql
CREATE TABLE usuarios (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  nome TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'intermediario', 'usuario')),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Usuário Padrão (Pré-criado)

```
Email: admin@gestor-emendas.com
Senha: admin123
Role: admin
```

⚠️ **IMPORTANTE**: Mude a senha padrão em produção!

---

## 🚀 Configuração Inicial

### 1. Executar Script SQL no Supabase

1. Acesse: https://app.supabase.com/project/dvziqcgjuidtkihoeqdc/sql/new
2. Copie TODO o conteúdo de `supabase_setup.sql`
3. Cole no SQL Editor do Supabase
4. Clique em **Run**

✅ Isto criará:
- Tabela: `usuarios`
- Tabela: `emendas` (atualizada)
- Tabela: `formalizacao` (com campo `usuario_atribuido_id`)
- Usuário admin padrão
- Políticas de Row Level Security (RLS)
- Índices para performance

### 2. Iniciar Aplicação

```bash
npm run dev
```

Acesse: http://localhost:3001

---

## 🔑 Como Usar

### Login

1. Acesse a página de login
2. Digite o email: `admin@gestor-emendas.com`
3. Digite a senha: `admin123`
4. Clique em "Entrar"

### Fluxo de Autenticação

```
Login (Email + Senha)
        ↓
Token JWT gerado
        ↓
Token armazenado no localStorage
        ↓
Usuário redirecionado para App
        ↓
Token enviado em cada requisição (Header: Authorization)
```

---

## 👤 Funcionalidades por Role

### ✅ Admin

- ✓ Ver todas as emendas
- ✓ Criar emendas
- ✓ Editar emendas
- ✓ Deletar emendas
- ✓ Ver todas as formalizações
- ✓ Criar formalizações
- ✓ Editar formalizações
- ✓ Deletar formalizações
- ✓ Gerenciar usuários (criar, editar role, ativar/desativar)
- ✓ Importar CSV

### ✅ Intermediário

- ✓ Ver todas as emendas (somente leitura)
- ✓ Ver todas as formalizações
- ✓ Editar formalizações (sem deletar)
- ✓ Criar demandas
- ✓ Atribuir demandas a usuários
- ✓ Importar CSV

### ✅ Usuário Padrão

- ✓ Visualizar demandas atribuídas a ele
- ✓ Editar campos técnicos nas demandas atribuídas:
  - Área - Estágio
  - Recurso Técnico
  - Data da Liberação
  - Situação da Demanda
  - Data - Análise Demanda
  - Motivo do Retorno da Diligência
  - Data do Retorno da Diligência
  - Conferencista
  - Data de Recebimento
  - Data do Retorno
  - Obs. - Motivo do Retorno
  - Datas de Liberação de Assinatura
  - Publicação, Vigência, Encaminhado em, Concluída em
- ✗ Não pode ver demandas de outros usuários
- ✗ Não pode deletar registros

---

## 🔧 Endpoints da API

### Autenticação

```
POST /api/auth/login
  Body: { email, senha }
  Response: { token, user: { id, email, nome, role } }

POST /api/auth/register
  Body: { email, senha, nome, role? }
  Response: { token, user: { id, email, nome, role } }

GET /api/auth/me
  Headers: { Authorization: "Bearer <token>" }
  Response: { user: { userId, email, role, iat, exp } }
```

### Usuários (Admin only)

```
GET /api/usuarios
  Headers: { Authorization: "Bearer <token>" }
  Response: { id, email, nome, role, ativo, created_at }[]

PUT /api/usuarios/:id
  Headers: { Authorization: "Bearer <token>" }
  Body: { role, ativo }
  Response: { success: true }
```

### Emendas

```
GET /api/emendas
  Headers: { Authorization: "Bearer <token>" }

POST /api/emendas
  Headers: { Authorization: "Bearer <token>", Content-Type: "application/json" }
  Body: { ...dados }

PUT /api/emendas/:id
  Headers: { Authorization: "Bearer <token>" }
  Body: { ...dados }

DELETE /api/emendas/:id
  Headers: { Authorization: "Bearer <token>" }

POST /api/emendas/bulk
  Headers: { Authorization: "Bearer <token>" }
  Body: [{ ...dados }, ...]
```

### Formalizações

```
GET /api/formalizacao
  Headers: { Authorization: "Bearer <token>" }

POST /api/formalizacao
  Headers: { Authorization: "Bearer <token>" }
  Body: { ...dados, usuario_atribuido_id? }

PUT /api/formalizacao/:id
  Headers: { Authorization: "Bearer <token>" }
  Body: { ...dados }

DELETE /api/formalizacao/:id
  Headers: { Authorization: "Bearer <token>" }
```

---

## 🔒 Segurança

### Row Level Security (RLS) - Supabase

As políticas de RLS garantem que:

- **Admin**: Acesso total a todas as tabelas
- **Intermediário**: Leitura de todos, escrita em formalizações
- **Usuário**: Apenas demandas atribuídas a ele

### Token JWT

```json
{
  "userId": 1,
  "email": "user@example.com",
  "role": "admin",
  "iat": 1772116401,
  "exp": 1772202801
}
```

**Expiração**: 24 horas

**Armazenamento**: localStorage (cliente)

---

## 📝 Como Adicionar Novo Usuário

### Via Interface (Admin)

1. Login como Admin
2. Acesse a seção de Usuários (futura)
3. Clique em "Novo Usuário"
4. Preencha: Email, Nome, Senha, Role
5. Clique em "Criar"

### Via SQL (Direto no Supabase)

```sql
INSERT INTO usuarios (email, senha_hash, nome, role, ativo)
VALUES (
  'user@example.com',
  SHA256('password123'),
  'João Silva',
  'usuario',
  true
);
```

---

## 🚨 Troubleshooting

### Erro: "Token inválido ou expirado"

- ✓ Faça login novamente
- ✓ Verifique se o localStorage está habilitado
- ✓ Limpe o cache do navegador

### Erro: "Acesso negado"

- ✓ Verifique seu role: Admin > Intermediário > Usuário
- ✓ Se for Usuário, verifique se a demanda foi atribuída a você

### Erro: "Email ou senha inválidos"

- ✓ Verifique se o usuário existe
- ✓ Verifique se o usuário está ativo
- ✓ Verifique a senha (senha_hash no banco)

### Formalizações vazias para Usuário

- ✓ Admin ou Intermediário deve atribuir demandas
- ✓ Verifique se `usuario_atribuido_id` está preenchido

---

## 📊 Próximas Implementações

- [ ] Interface de Gerenciamento de Usuários
- [ ] Resetar Senha
- [ ] Two-Factor Authentication (2FA)
- [ ] Logs de Auditoria
- [ ] Permissões Customizáveis
- [ ] OAuth (Google, Microsoft)

---

## 🤝 Suporte

Para dúvidas ou problemas, verifique:
1. Console do navegador (F12)
2. Terminal do servidor
3. Logs do Supabase > Auth > Logs

