# GUIA: Garantindo Importação SEM DUPLICATAS

## 📋 Resumo Executivo

Foram criados 3 componentes para garantir que importações de novas emendas **NUNCA dupliquem registros** na tabela `formalizacao`:

1. **01_REMOVER_DUPLICATAS.sql** - Remove duplicatas existentes e cria proteção
2. **02_IMPORTACAO_SEGURA_NOVAS_EMENDAS.sql** - Funções SQL para importação segura
3. **importar-formalizacao-safe.py** - Script Python melhorado sem perda de dados

---

## 🚀 PASSO 1: Remover Duplicatas Existentes

### 1️⃣ Abra o SQL Editor do Supabase
- Acesse: https://supabase.com/dashboard
- Selecione seu projeto
- Vá para **SQL Editor**

### 2️⃣ Execute o script de diagnóstico
Abra `01_REMOVER_DUPLICATAS.sql` e execute APENAS a seção **PASSO 1**:

```sql
-- PASSO 1: Diagnosticar duplicatas existentes
SELECT 
  emenda,
  COUNT(*) as qtd_duplicadas,
  STRING_AGG(DISTINCT id::text, ', ') as ids
FROM formalizacao
GROUP BY emenda
HAVING COUNT(*) > 1
ORDER BY qtd_duplicadas DESC;
```

**Resultado esperado:**
- Se houver duplicatas, você verá uma lista como:
  ```
  emenda          | qtd_duplicadas | ids
  2026.005.80418  | 3              | 1001, 2045, 5432
  2026.005.85565  | 2              | 1500, 3001
  ```

### 3️⃣ Se houver duplicatas, execute a remoção
Execute a seção **PASSO 3** do arquivo:

```sql
BEGIN;

DELETE FROM formalizacao
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY emenda 
        ORDER BY updated_at DESC, id DESC
      ) as rn
    FROM formalizacao
  ) sub
  WHERE rn > 1
);

COMMIT;
```

**O que acontece:**
- ✅ Mantém o registro **mais recente** para cada emenda
- ✅ Deleta todas as cópias duplicadas
- ✅ Transação atômica (tudo ou nada)

### 4️⃣ Criar Constraint UNIQUE (Proteção Permanente)

Execute a seção **PASSO 5**:

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'formalizacao_emenda_unique'
  ) THEN
    ALTER TABLE formalizacao 
    ADD CONSTRAINT formalizacao_emenda_unique UNIQUE (emenda);
    RAISE NOTICE 'Constraint UNIQUE criada com sucesso';
  END IF;
END $$;
```

**Resultado:**
- 🔒 Agora a tabela rejeita automaticamente duplicatas
- 📌 Erro ao tentar inserir emenda duplicada

---

## 🔄 PASSO 2: Importar Novas Emendas SEGURAMENTE

Você tem 2 opções:

### OPÇÃO A: SQL Puro (Recomendado para CSVs pequenos)

Abra `02_IMPORTACAO_SEGURA_NOVAS_EMENDAS.sql` e procure pela seção **EXEMPLO 1**:

```sql
INSERT INTO formalizacao (
  emenda,
  parlamentar,
  partido,
  demanda,
  -- ... mais campos ...
)
VALUES
  ('2026.005.NEW001', 'PARLAMENTAR 1', 'PARTIDO 1', ...),
  ('2026.005.NEW002', 'PARLAMENTAR 2', 'PARTIDO 2', ...)

ON CONFLICT (emenda) DO UPDATE SET
  parlamentar = COALESCE(EXCLUDED.parlamentar, formalizacao.parlamentar),
  partido = COALESCE(EXCLUDED.partido, formalizacao.partido),
  -- ... atualizar outros campos também ...
  updated_at = NOW();
```

**Vantagens:**
- ✅ Sintaxe SQL padrão PostgreSQL
- ✅ Muito rápido
- ✅ Controle total
- ✅ Transacional

**Como usar:**
1. Tenha seu CSV ou dados prontos
2. Converta para INSERT VALUES
3. Copie o `ON CONFLICT ... DO UPDATE ...` do template
4. Execute no SQL Editor

---

### OPÇÃO B: Python Script (Recomendado para CSVs grandes)

Use o novo script `importar-formalizacao-safe.py`:

#### Configuração Inicial (uma vez):

```bash
# 1. Abra terminalpythonnel
cd c:\Users\afpereira\Downloads\gestor-de-emendas-e-convênios

# 2. Ative o virtual environment
.\.venv\Scripts\Activate.ps1

# 3. Instale dependências
pip install requests python-dotenv
```

#### Uso:

```bash
# Modo 1: APENAS adiciona novos (não atualiza existentes)
python importar-formalizacao-safe.py append

# Modo 2: Adiciona NOVOS + ATUALIZA existentes (recomendado)
python importar-formalizacao-safe.py merge
```

**Antes de executar:**

1. Edite o arquivo `importar-formalizacao-safe.py`, linha ~40:
   ```python
   CSV_FILE = r'C:\Users\afpereira\Downloads\geral.csv'  # Seu CSV aqui
   MODO = 'merge'  # ou 'append'
   ```

2. Garanta que `.env.local` existe com:
   ```
   SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=seu_service_role_key_aqui
   ```

#### Saída esperada:

```
======================================================================
  IMPORTAR FORMALIZAÇÃO SEGURA (SEM DUPLICATAS)
  Modo: MERGE
======================================================================

📄 Arquivo:      C:\Users\...\geral.csv
📦 Tamanho:      12.5 MB
🔄 Modo:         merge (Atualiza + adiciona)

🔗 Supabase URL: https://seu-projeto.supabase.co

📖 PASSO 1: Lendo CSV...
   Encoding: utf-8 ✓
   Delimitador: ';'
   📊 Lidos 45230 registros válidos de 45231 linhas

🔒 PASSO 2: Verificando constraint UNIQUE na coluna 'emenda'...
   ✓ Constraint UNIQUE existente: formalizacao_emenda_unique

📥 PASSO 3: Importando 45230 registros (500/batch)...
   [100.0%] 45230 inseridos | 0 erros | 2156 reg/s

======================================================================
  RESULTADO FINAL
======================================================================
   ✅ Inseridos/Atualizados: 45230
   ❌ Erros:                 0
   ⏱️  Tempo:                21.0s

   🎉 SUCESSO! Todos os registros foram processados sem duplicatas!
```

---

## 🛡️ Como Funciona a Proteção

### Constraint UNIQUE
```sql
ALTER TABLE formalizacao ADD CONSTRAINT formalizacao_emenda_unique UNIQUE (emenda);
```

- Garante que **nenhuma emenda se repita** na tabela
- É **automático** - o banco rejeita inserções duplicadas

### INSERT ... ON CONFLICT
```sql
INSERT INTO formalizacao (...) VALUES (...)
ON CONFLICT (emenda) DO UPDATE SET campo1 = valor1, ...;
```

- Se emenda já existe: **ATUALIZA** os campos
- Se emenda é nova: **INSERE**
- **Sem duplicatas** em nenhum caso

---

## 🚨 Cenários de Erro e Soluções

### Erro: "Duplicate key value violates unique constraint"
**Causa:** Constraint UNIQUE foi violado
**Solução:** Execute `01_REMOVER_DUPLICATAS.sql` PASSO 5 novamente

### Erro: "Column 'emenda' does not exist"
**Causa:** Estrutura da tabela foi alterada
**Solução:** Verifique o arquivo de migrations

### Problema: "ImportError: requests not installed"
**Solução:**
```bash
pip install requests python-dotenv
```

### Problema: "SUPABASE_URL not found"
**Solução:** Crie `.env.local` na pasta do projeto com as credenciais

---

## 📊 Monitorar Importações

### View para ver atualizações recentes
```sql
SELECT * FROM vw_formalizacao_updates;
```

Mostra:
- Emendas novas importadas
- Emendas atualizadas
- Data da última mudança

### Verificar integridade dos dados
```sql
SELECT 
  COUNT(*) as total_registros,
  COUNT(DISTINCT emenda) as emendas_unicas,
  CASE 
    WHEN COUNT(*) = COUNT(DISTINCT emenda) THEN '✓ SEM DUPLICATAS'
    ELSE '✗ AINDA HÁ DUPLICATAS'
  END as status
FROM formalizacao;
```

---

## ✅ Checklist de Implementação

- [ ] Executei `01_REMOVER_DUPLICATAS.sql` PASSO 1 para diagnosticar
- [ ] Se havia duplicatas, executei PASSO 3 para remover
- [ ] Executei PASSO 5 para criar Constraint UNIQUE
- [ ] Verifiquei que o Constraint foi criado com sucesso
- [ ] Testei uma importação pequena com `importar-formalizacao-safe.py append`
- [ ] Testei uma importação com update com `importar-formalizacao-safe.py merge`
- [ ] Criei backup do banco (SE POSSÍVEL antes de PASSO 3)
- [ ] Documentei a data/hora/modo da última importação

---

## 📝 Resumo das Diferenças

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Proteção contra duplicatas** | ❌ Nenhuma | ✅ Constraint UNIQUE |
| **Import mode** | ❌ TRUNCATE (perde tudo) | ✅ INSERT ... ON CONFLICT (preserva) |
| **Atualização** | ❌ Manual | ✅ Automática |
| **Segurança** | ❌ Baixa | ✅ Alta |
| **Velocidade** | 🐢 Lenta (reimporta tudo) | 🚀 Rápida (merge) |

---

## 🔗 Referências

- [PostgreSQL ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html)
- [Supabase REST API](https://supabase.com/docs/guides/api)
- [SQLAlchemy ORM (se usar)](https://docs.sqlalchemy.org/en/20/)

---

## 💬 Suporte

Se encontrar problemas:

1. Verifique que a Constraint UNIQUE existe:
   ```sql
   SELECT constraint_name FROM pg_constraint 
   WHERE table_name = 'formalizacao' AND constraint_type = 'UNIQUE';
   ```

2. Verifique que não há NULLs em 'emenda':
   ```sql
   SELECT COUNT(*) FROM formalizacao WHERE emenda IS NULL;
   ```

3. Consulte os logs do Supabase para mais detalhes

---

**Última atualização:** 16 de Março de 2026
**Status:** ✅ Pronto para produção
