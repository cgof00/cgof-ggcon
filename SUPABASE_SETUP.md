# 🚀 Setup Supabase - Gestor de Emendas

## Passo 1: Executar Script SQL no Supabase

1. Acesse sua conta Supabase: https://app.supabase.com
2. Clique no seu projeto **dvziqcgjuidtkihoeqdc**
3. Abra a aba **SQL Editor** no menu lateral
4. Clique em **New Query**
5. Copie e cole TODO o conteúdo do arquivo `supabase_setup.sql` (neste repositório)
6. Clique em **Run** para executar

✅ **Resultado esperado:** Duas tabelas serão criadas: `emendas` e `formalizacao`

---

## Passo 2: Configurar Variáveis de Ambiente

Seu arquivo `.env.local` já foi criado com as credenciais:

```env
SUPABASE_URL=https://dvziqcgjuidtkihoeqdc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Passo 3: Iniciar a Aplicação

Execute o comando:

```bash
npm run dev
```

A aplicação será iniciada em: **http://localhost:3000**

---

## ✨ Funcionalidades Ativadas

Após executar o script SQL:

✅ **Tabela Emendas**
- Armazenar dados de emendas parlamentares
- Importação via CSV
- Editar campos individuais
- Deletar registros

✅ **Tabela Formalizações**
- Gerenciar demandas técnicas
- Campos editáveis para técnicos:
  - Área - Estágio
  - Recurso Técnico
  - Data da Liberação
  - Situação da Demanda
  - Situação - Análise Demanda
  - Data - Análise Demanda
  - Motivo do Retorno da Diligência
  - Data do Retorno da Diligência
  - Conferencista
  - Data recebimento demanda
  - Data do Retorno
  - Observação - Motivo do Retorno
  - Data liberação da Assinatura - Conferencista
  - Data liberação de Assinatura
  - Falta assinatura
  - Assinatura
  - Publicação
  - Vigência
  - Encaminhado em
  - Concluída em

---

## 🔧 Usando a Aplicação

### Importar Dados via CSV
1. Clique em **Importar CSV**
2. Selecione um arquivo .csv com seus dados
3. O sistema mapeará automaticamente as colunas
4. Os dados serão salvos no Supabase

### Editar Formalizações
1. Navegue à aba **Formalizações**
2. Clique em um registro para visualizar os detalhes
3. Clique no botão **Edit** (lápis)
4. Preencha os campos desejados
5. Clique em **Atualizar Registro**

### Deletar Registros
1. Visualize um registro
2. Clique no botão **Delete** (lixeira)
3. Confirme a exclusão

---

## 🆘 Troubleshooting

### Erro: "Tabelas não encontradas"
- Certifique-se de que executou o script SQL completo no Supabase

### Erro: "Chaves inválidas"
- Verifique se `.env.local` contém as credenciais corretas
- Copie novamente do Supabase > Settings > API

### Dados não aparecem após importar
- Aguarde alguns segundos (sincronização em tempo real)
- Recarregue a página (F5)

---

## 📚 Próximos Passos Opcionais

### Fazer Backup dos Dados
```bash
# Exportar dados do Supabase
# Via Admin Panel > Backups
```

### Configurar Autenticação
- Vá em Supabase > Authentication > Providers
- Configure e-mail/senha ou OAuth

### Limitar Acesso aos Dados
- Altere as políticas RLS em Supabase > Authentication > Policies
- Remova a política "Allow all" e crie regras específicas

---

**✅ Sucesso!** Sua aplicação está pronta com Supabase. 🎉
