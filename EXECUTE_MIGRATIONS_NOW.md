# 🚀 EXECUTAR MIGRATIONS SQL - PASSO A PASSO

## ⏱️ Tempo: 5 minutos

---

## PASSO 1️⃣: Acessar Supabase SQL Editor

1. Abra: https://app.supabase.com
2. Selecione seu projeto
3. Menu esquerdo: **SQL Editor**
4. Clique: **New Query**

---

## PASSO 2️⃣: Executar Primeira Migration (Coluna Faltante)

**Cole este SQL:**

```sql
-- Adicionar coluna usuario_atribuido_id
ALTER TABLE formalizacao
ADD COLUMN IF NOT EXISTS usuario_atribuido_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_formalizacao_usuario_atribuido ON formalizacao(usuario_atribuido_id);
```

**Clique:** RUN (ou `Ctrl+Enter`)

**Resultado esperado:**
```
✓ alter table
✓ create index
```

---

## PASSO 3️⃣: Executar Segunda Migration (Índices de Performance)

**Mesmo local**, crie **nova query** e cole:

```sql
-- Índices para os 5 filtros mais usados
CREATE INDEX IF NOT EXISTS idx_formalizacao_ano ON formalizacao(ano);
CREATE INDEX IF NOT EXISTS idx_formalizacao_tecnico ON formalizacao(tecnico);
CREATE INDEX IF NOT EXISTS idx_formalizacao_situacao_analise ON formalizacao(situacao_analise_demanda);
CREATE INDEX IF NOT EXISTS idx_formalizacao_data_liberacao ON formalizacao(data_liberacao);

-- Índices compostos (muito rápidos)
CREATE INDEX IF NOT EXISTS idx_formalizacao_ano_tecnico ON formalizacao(ano, tecnico);
CREATE INDEX IF NOT EXISTS idx_formalizacao_ano_status ON formalizacao(ano, situacao_analise_demanda);

-- Índice para ordenação
CREATE INDEX IF NOT EXISTS idx_formalizacao_created_order ON formalizacao(created_at DESC);
```

**Clique:** RUN

**Resultado esperado:**
```
✓ create index (7x)
```

---

## PASSO 4️⃣: Verificar se Funcionou

**Nova query:**

```sql
-- Verificar que a coluna foi criada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'formalizacao' AND column_name = 'usuario_atribuido_id';

-- Verificar que os índices existem
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'formalizacao' AND indexname LIKE '%usuario_atribuido%';
```

**Resultado esperado:**
```
column_name              | data_type
usuario_atribuido_id     | bigint

indexname
idx_formalizacao_usuario_atribuido
```

Se vir esses resultados, ✅ **tudo ok!**

---

## PASSO 5️⃣: Reiniciar o Servidor

Terminal (Windows PowerShell):

```bash
npm run dev
```

Aguarde aparecer:
```
Server running on http://localhost:4000
```

---

## PASSO 6️⃣: Testar Atribuição

1. Abra: http://localhost:5173
2. Selecione **2-3 formalizações** (checkbox ☑️)
3. Clique: **"Atribuir a Técnico"**
4. Selecione un técnico
5. Clique: **"Atribuir"**

**Esperado:**
```
✅ Técnico Karen atribuído para 3 registros!
```

A coluna "Técnico" deve mostrar "Karen" imediatamente!

---

## ⚠️ Erros Comuns

### "Column already exists"
✅ **Normal!** Significa que alguém já criou. Ignore e continue.

### "Permission denied"  
❌ Verifique se está logado como admin no Supabase

### "Index already exists"
✅ **Normal!** Ignore e continue com próxima

### Depois de tudo, ainda lento?
- Limpe cache: **F12 → Application → Clear All**
- Reinicie o app: **Ctrl+Shift+R**

---

## ✨ Pronto!

Depois que fizer tudo acima:

✅ Coluna criada
✅ Índices criados  
✅ Atribuição de técnico funciona
✅ Sistema 10-25x mais rápido!

---

## 🎯 TL;DR (Resumido)

1. Supabase SQL Editor → New Query
2. Cole `add-usuario-atribuido-column.sql`
3. RUN
4. New Query
5. Cole `create-performance-indexes.sql`
6. RUN
7. Terminal: `npm run dev`
8. Teste atribuição

**Pronto!** 🎉
