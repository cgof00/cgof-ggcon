# 🔧 FIX: Problema de Duplicação na Importação de Emendas

**Data:** 16/03/2026  
**Problema:** Ao importar emendas, em vez de atualizar apenas as novas, o sistema estava adicionando TODAS, criando duplicatas.  
**⚠️ Crítico:** A tabela `emendas` sincroniza automaticamente com `formalizacao` - duplicatas em uma afetam a outra!

---

## 📋 Causa Raiz do Problema

O endponit de UPSERT (`/api/admin/import-emendas`) usa o comando Supabase:

```sql
POST {SUPABASE_URL}/rest/v1/emendas?on_conflict=codigo_num
Prefer: resolution=merge-duplicates,return=minimal
```

**O problema:** O Supabase **só consegue fazer UPSERT (UPDATE ou INSERT)** se existe uma restrição `UNIQUE` na coluna especificada. Sem ela:
- ❌ Não detecta conflito de chave
- ❌ Cria sempre um novo registro (INSERT)
- ❌ Ignora completamente o `on_conflict=codigo_num`
- ⚠️ **Duplicatas em `emendas` causam sincronização errada em `formalizacao`**

**Configuração atual da tabela:**
```sql
CREATE TABLE emendas (
  id BIGINT PRIMARY KEY,
  codigo_num TEXT,  -- ❌ Sem UNIQUE constraint!
  num_convenio TEXT,  -- LINKAGEM: conecta com formalizacao.numero_convenio
  ...
)
```

---

## 🔗 Relação Crítica: Emendas ↔ Formalizacao

**Quando você importa emendas, automaticamente:**

```
1. POST /api/admin/import-emendas
   └─ UPSERT em tabela emendas (por codigo_num)

2. POST /api/admin/sync-emendas  
   └─ Sincroniza tabela formalizacao:
      • RPC sync_step1: UPDATE formalizacao pelo numero_convenio
      • RPC sync_step2: UPDATE formalizacao pelo emenda (codigo_num)
      • RPC sync_step3: INSERT novas formalizacoes
```

**Problema SEM UNIQUE constraint (codigo_num):**

```
❌ Múltiplos registros em emendas com mesmo numero_convenio
   ↓
❌ sync_step1 atualiza formalizacao várias vezes (dados inconsistentes)
   ↓
❌ sync_step2 também encontra múltiplas emendas (conflito)
   ↓
❌ sync_step3 pode inserir duplicatas em formalizacao
   ↓
❌ Tabela formalizacao fica corrompida/inconsistente
```

**Com UNIQUE constraint (codigo_num) - ✅ CORRETO:**

```
✅ Máximo 1 registro em emendas por codigo_num
   ↓
✅ sync_step1 encontra exatamente 1 formalizacao para atualizar
   ↓
✅ sync_step2 encontra exatamente 1 formalizacao para atualizar
   ↓
✅ sync_step3 insere apenas novas formalizacoes
   ↓
✅ Integridade garantida entre as duas tabelas
```

---

## 🎯 Solução Completa

**Configuração atual da tabela:**
```sql
CREATE TABLE emendas (
  id BIGINT PRIMARY KEY,
  codigo_num TEXT,  -- ❌ Sem UNIQUE constraint!
  ...
)
```

### PASSO 1: Executar Script SQL para Adicionar Constraint UNIQUE

**Arquivo:** [`sql/FIX_DUPLICATE_IMPORTS.sql`](../sql/FIX_DUPLICATE_IMPORTS.sql)

Este script:
1. Remove duplicatas existentes (mantém o último registro)
2. Adiciona constraint `UNIQUE` ao campo `codigo_num`
3. Valida o resultado

**Como executar no Supabase:**

1. Abra o [Console SQL do Supabase](https://app.supabase.com/project/_/sql)
2. Copie todo o conteúdo de `sql/FIX_DUPLICATE_IMPORTS.sql`
3. Cole no editor SQL
4. Clique em ▶ **Run** (ou `Ctrl+Enter`)

**Saída esperada:**
```
Deleted N rows (duplicatas removidas)
ALTER TABLE ... (constraint criada)

Messages:
- Constriant criado com sucesso
- 0 duplicatas remanescentes (tabela limpa)
- XXX total emendas
```

### PASSO 2: Verificar a Implementação (Já Feita! ✅)

As seguintes melhorias foram implementadas no código:

#### ✅ Frontend Melhorado (`src/App.tsx`)
- **Deduplicação robusta:** Map com `codigo_num` como chave
- **Feedback detalhado:** Mostra quantas duplicatas foram removidas do arquivo
- **Logging:** Console mostra: "X linhas → Y mapeadas → Z únicas"
- **Mensagem final:** Exibe estatísticas completas de import + sync

**Antes:**
```
Importação concluída! 500 emendas importadas e sincronizadas.
```

**Depois:**
```
✅ Importação Concluída!
• 500 emendas processadas (UPSERT)
• 120 registros duplicados ignorados
• 45 + 85 formalizações atualizadas
• 20 novas formalizações inseridas
```

#### ✅ API Melhorada (`functions/api/admin/import-emendas.ts`)
- **Validação robusta:** Remove registros com `codigo_num` vazio
- **Deduplicação na API:** Garante que só envia registros únicos
- **Logging detalhado:** Mostra quantas foram deduplicadas
- **Resposta clara:** Retorna `imported` + `deduped` para o frontend
- **Tratamento de erro:** Detecta if UNIQUE violations

---

## 🧪 Teste de Verificação

Após executar o script SQL, verifique se tudo funcionou:

```sql
-- Deve retornar 0 (nenhuma duplicata)
SELECT codigo_num, COUNT(*) as duplicatas
FROM emendas
WHERE codigo_num IS NOT NULL AND codigo_num != ''
GROUP BY codigo_num
HAVING COUNT(*) > 1;

-- Verificar constraint
SELECT constraint_name, constraint_type
FROM information_schema.constraint_column_usage
WHERE table_name = 'emendas' AND column_name = 'codigo_num';
```

---

## 📚 Como Funciona Agora

### Fluxo de Importação (Corrigido com Sincronização)

```
1. Usuário seleciona arquivo (CSV/XLS/XLSX/XML)
   ↓
2. FRONTEND: 500 linhas do arquivo
   ├─ Mapear colunas
   ├─ Filtrar válidos = 480 registros
   └─ Deduplicar (Map<codigo_num>) = 400 únicos
   ↓
3. FRONTEND: Envia em lotes para API
   ↓
4. API /api/admin/import-emendas:
   ├─ Recebe 400 registros
   ├─ Re-valida (validação defensiva)
   ├─ Re-deduplica (segurança extra)
   └─ UPSERT (on_conflict=codigo_num)
   
   Porque existe UNIQUE constraint:
   ├─ Se codigo_num já existe → UPDATE ✅
   └─ Se novo → INSERT ✅
   ↓
5. TABELA emendas:
   └─ Atualizada com 400 registros únicos
      (CRITICAL: Cada codigo_num → máximo 1 registro)
   ↓
6. API /api/admin/sync-emendas: (SINCRONIZAÇÃO COM FORMALIZACAO!)
   ├─ sync_step1_update_convenio
   │  └─ UPDATE formalizacao WHERE numero_convenio IN (emendas.num_convenio)
   │     → 45 formalizacoes atualizadas
   │
   ├─ sync_step2_update_emenda
   │  └─ UPDATE formalizacao WHERE emenda IN (emendas.codigo_num)
   │     → 85 formalizacoes atualizadas
   │
   └─ sync_step3_insert_novas
      └─ INSERT novas formalizacoes para emendas sem match
         → 20 novas formalizacoes criadas
   ↓
7. TABELA formalizacao:
   └─ Sincronizada com dados de emendas
      (GARANTIA: Dados consistentes entre as duas tabelas)
   ↓
8. FRONTEND: Mostra resultado final
   └─ "✅ Importação Concluída!
       • 400 emendas processadas (UPSERT)
       • 100 registros duplicados ignorados
       • 45 + 85 formalizações atualizadas
       • 20 novas formalizações inseridas"
```

**Resumo da Sincronização:**
- ✅ Tabela `emendas`: 400 registros únicos (garantido por UNIQUE constraint)
- ✅ Tabela `formalizacao`: 150 atualizadas + 20 inseridas (totalmente sincronizadas)
- ✅ Integridade garantida entre as duas tabelas
- ✅ Sem dados inconsistentes ou duplicados em formalizacao

---

### Operação UPSERT (Agora Funcional ✅)

Com a constraint `UNIQUE (codigo_num)`, o Supabase:

```sql
-- Supabase REST API (Cloudflare Functions)
POST /rest/v1/emendas?on_conflict=codigo_num
{
  "codigo_num": "12345",
  "parlamentar": "João Silva",
  ...
}

-- BDD interpreta como:
INSERT INTO emendas (codigo_num, parlamentar, ...) 
VALUES ('12345', 'João Silva', ...)
ON CONFLICT (codigo_num) 
DO UPDATE SET parlamentar='João Silva', ...;
```

**Se `codigo_num='12345'` já existe:** Atualiza ✅  
**Se `codigo_num='12345'` é novo:** Insere ✅

---

## 🚀 Próximas Importações

**Não precisa fazer nada mais!** Após executar o script SQL uma vez:

1. O sistema agora detecta automaticamente duplicatas
2. Não duplica mais registros
3. Mostra feedback claro sobre o que foi importado
4. Atualiza registros existentes ao re-importar o mesmo arquivo

---

## ⚠️ Rollback (Se Necessário)

Se algo der errado e precisar desfazer:

```sql
-- Remover a constraint
ALTER TABLE emendas
DROP CONSTRAINT IF EXISTS emendas_codigo_num_unique;

-- Mas cuidado: sem ela, a duplicação voltará!
```

---

## 📊 Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `sql/FIX_DUPLICATE_IMPORTS.sql` | ✨ **NOVO** - Script para adicionar constraint |
| `functions/api/admin/import-emendas.ts` | 🔧 Melhorado - Validação + logging detalhado |
| `src/App.tsx` | 🔧 Melhorado - Deduplicação + feedback |

---

## ✅ Checklist de Implementação

- [ ] **PASSO 1:** Executar script SQL `FIX_DUPLICATE_IMPORTS.sql`
- [ ] **PASSO 2:** Verificar constraint com queries de teste
- [ ] **PASSO 3:** Recarregar o aplicativo no navegador (F5)
- [ ] **PASSO 4:** Fazer uma importação de teste com um arquivo pequeno
- [ ] **PASSO 5:** Verificar se não há duplicatas criadas
- [ ] **PASSO 6:** Importar o mesmo arquivo novamente (deve fazer UPDATE, não INSERT)

---

## 🐛 Se Ainda Tiver Problemas

1. **Erro: "duplicate key value violates unique constraint"**
   - Significa a constraint foi criada ✅
   - Verifique se `codigo_num` não tem valores vazios
   - Limpe manualmente duplicatas antes de reimportar

2. **Importação ainda cria duplicatas**
   - Verifique se constraint foi realmente criada:
     ```sql
     SELECT * FROM information_schema.table_constraints 
     WHERE table_name='emendas' AND constraint_type='UNIQUE';
     ```
   - Se vazio, execute o script SQL novamente

3. **Erro na sincronização após import**
   - Normal se houver muitos registros (timeout de 120s)
   - O import mesmo assim terá sucesso
   - Tente sincronizar novamente via endpoint `/api/admin/sync-emendas`

---

**Última atualização:** 16/03/2026
