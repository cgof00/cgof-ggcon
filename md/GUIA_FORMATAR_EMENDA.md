# 🎯 Formatar Emenda para Padrão "0000"."000"."00000"

## 📊 O Que Faz

Converte as emendas de:
```
202.600.580.418
202.007.316.400
```

Para:
```
0202.600.00580
0202.007.00316
```

Padrão: **0000.000.00000** (4 dígitos . 3 dígitos . 5 dígitos)

---

## ✅ Passo a Passo

### 1️⃣ Execute no Supabase SQL Editor:

```sql
FORMATAR_EMENDA_PATTERN.sql
```

Ele vai fazer:
- ✅ Criar função de formatação
- ✅ Testar com 20 registros
- ✅ Atualizar TODAS as emendas
- ✅ Fazer UPDATE na tabela formalizacao
- ✅ Mostrar amostra dos resultados

---

## 📈 Progresso

A cada seção, você verá:

**Seção 1** - Função criada ✓
```
formato_emenda_pattern(emenda_value)
```

**Seção 2** - Teste de formatação (20 amostra)
```
202.600.580.418  →  0202.600.00580
202.007.316.400  →  0202.007.00316
```

**Seção 3** - Atualização completa
```
UPDATE: 32.199 registros formatados
```

**Seção 4** - Verificação final
```
✅ Emendas formatadas corretamente
✅ Formalizacao atualizada com tipo e recurso
```

---

## 🧪 Testar Antes de Aplicar

Se quiser testar só a formatação SEM atualizar:

```sql
SELECT 
  emenda,
  format_emenda_pattern(emenda) as novo_formato
FROM formalizacao_recursos_tipos_staging
LIMIT 20;
```

---

## 🚀 Quick Start

Copie e cole NO SUPABASE:

```
1. Abra: SQL Editor
2. Cole: FORMATAR_EMENDA_PATTERN.sql
3. Execute
4. Aguarde ~5 segundos
5. ✅ Pronto!
```

---

## ⚠️ Importante

- A função formatará usando `LPAD` (adiciona zeros à esquerda)
- Segue o padrão: **0000.000.00000**
- Todos os 32.199 registros serão atualizados
- A tabela `formalizacao` receberá o tipo e recurso

---

## 📝 Resultado Esperado

Na tabela `formalizacao_recursos_tipos_staging`:
```
id | emenda           | tipo_formalizacao           | recurso | processed | created_at
1  | 0202.600.00580   | Repasse fundo a fundo       | NULL    | FALSE     | 2026-03-16
2  | 0202.600.00580   | Repasse fundo a fundo       | NULL    | FALSE     | 2026-03-16
3  | 0202.600.00580   | Repasse fundo a fundo       | NULL    | FALSE     | 2026-03-16
...
```

Na tabela `formalizacao`:
```
emenda       | tipo_formalizacao           | recurso  | updated_at
0202.600.00580 | Repasse fundo a fundo       | NULL     | 2026-03-16 11:15:30
0202.007.00316 | Convênio normal             | SIM      | 2026-03-16 11:15:31
...
```

✅ Sucesso!
