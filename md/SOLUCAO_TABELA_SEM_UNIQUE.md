# 🚀 Solução: Tabela SEM Constraint UNIQUE

## O Problema
A tabela antiga tinha `emenda` como PRIMARY KEY (UNIQUE), causando erro se tivesse registros duplicados.

## A Solução
Nova tabela **sem UNIQUE** em `emenda` → permite duplicatas!

---

## ✅ Passo a Passo

### 1️⃣ Limpar e Criar Nova Tabela

Execute no **Supabase SQL Editor**:

```sql
CRIAR_TABELA_SEM_UNIQUE.sql
```

Output esperado:
```
✅ Nova tabela criada ✓ (sem UNIQUE constraint)
```

### 2️⃣ Fazer Upload do CSV Novamente

Na interface do Supabase:
- Table: `formalizacao_recursos_tipos_staging`
- Upload CSV
- **Sem conflitos agora!** ✓

Deve mostrar: **"32.199 rows will be added"**

### 3️⃣ Verificar Dados Importados

```sql
SELECT COUNT(*) as total FROM formalizacao_recursos_tipos_staging;
```

Esperado: `32.199`

### 4️⃣ Atualizar Tabela FORMALIZACAO

Depois que os dados estiverem no staging:

```sql
BEGIN;

-- Se tem emendas duplicadas, faça UPDATE para a primeira ocorrência
UPDATE formalizacao f
SET
  tipo_formalizacao = COALESCE(
    NULLIF(TRIM(s.tipo_formalizacao), ''),
    f.tipo_formalizacao
  ),
  recurso = COALESCE(
    NULLIF(TRIM(s.recurso), ''),
    f.recurso
  ),
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (emenda) 
    id, emenda, tipo_formalizacao, recurso
  FROM formalizacao_recursos_tipos_staging
  ORDER BY emenda, id
) s
WHERE TRIM(f.emenda) = TRIM(s.emenda)
  AND (s.tipo_formalizacao IS NOT NULL OR s.recurso IS NOT NULL);

COMMIT;

SELECT 'Update complete ✓' AS status;
```

### 5️⃣ Validar

```sql
-- Quantos foram atualizados?
SELECT COUNT(*) FROM formalizacao WHERE updated_at = NOW();

-- Ver amostra
SELECT emenda, tipo_formalizacao, recurso 
FROM formalizacao 
WHERE recurso IS NOT NULL OR tipo_formalizacao IS NOT NULL
LIMIT 10;
```

---

## 📊 Diferenças

| Aspecto | Tabela Antiga | Tabela Nova |
|---------|--------------|------------|
| emenda como UNIQUE | ❌ Sim (causa erro) | ✅ Não (permite duplicatas) |
| PRIMARY KEY | `emenda` | `id` (auto) |
| Upload CSV | Falha se duplicada | ✅ Sucesso |
| Registros únicos | Só 1 por emenda | Múltiplos por emenda |

---

## 🎯 Se Tiver Duplicatas

Quando fizer UPDATE:

```sql
-- Usa DISTINCT ON para pegar só a primeira ocorrência
SELECT DISTINCT ON (emenda) 
  emenda, tipo_formalizacao, recurso
FROM formalizacao_recursos_tipos_staging
ORDER BY emenda, id;
```

Isso garante que cada emenda seja atualizada uma única vez.

---

## 🚀 Quick Start

1. Execute: `CRIAR_TABELA_SEM_UNIQUE.sql`
2. Upload seu CSV no Supabase
3. Execute o UPDATE acima
4. ✅ Pronto!

