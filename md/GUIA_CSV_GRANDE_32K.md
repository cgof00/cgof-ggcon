# 🚀 Solução para CSV Grande (32k+ registros)

## 📊 Cenários Suportados

### Cenário 1: CSV Pequeno (< 10k registros)
✅ **Arquivo atual**: 234 registros  
→ Use: `import_data_chunk_01_de_01.sql`  
→ Tempo: ~1 segundo  

### Cenário 2: CSV Grande (10k - 100k registros)
⚠️ **Seu CSV real**: ~32.000 registros  
→ Use: `process_large_csv.py` com chunks  
→ Gera: ~16 arquivos SQL (2000 registros cada)  
→ Tempo: ~5-10 segundos total  

### Cenário 3: CSV Muito Grande (> 100k)
❌ **Não recomendado ainda**  
→ Use: Dividir manualmente em múltiplos CSVs  
→ Ou: Usar COPY direto do arquivo  

---

## 🎯 Se Seu CSV Real Tem 32k Registros

### Opção 1: Automatizado (Recomendado)

```bash
python3 process_large_csv.py seu_arquivo_32k.csv 2000
```

Isso vai gerar:
- `import_data_chunk_01_de_16.sql` (2000 registros cada)
- `import_data_chunk_02_de_16.sql`
- ... até 16 arquivos
- `00_CONTROLE_CHUNKS.sql` (instruções)

**Tempo**: ~5 segundos no Supabase

### Opção 2: Com Chunks Maiores (Mais Rápido)

```bash
python3 process_large_csv.py seu_arquivo_32k.csv 5000
```

Isso gera:
- ~7 arquivos (5000 registros cada)
- **Tempo**: ~3 segundos

### Opção 3: Um Arquivo Único (Menos Seguro)

```bash
python3 process_large_csv.py seu_arquivo_32k.csv 32000
```

Isso gera:
- 1 arquivo único (32000 registros)
- ⚠️ Risco: Pode ultrapassar limite de REQUEST do Supabase
- **Tempo**: ~5-10 segundos

---

## 📖 Como Usar Para 32k Registros

### Passo 1: Prepara o arquivo
Certifique-se que seu CSV tem as colunas exatas:
```
Emenda;Tipo de formalização;Com ou Sem Recurso
202.600.580.418;Repasse fundo a fundo;
202.600.580.419;Repasse fundo a fundo;NÃO
...
```

### Passo 2: Processar CSV em chunks
```bash
cd seu_workspace
python3 process_large_csv.py seu_arquivo_32k.csv 2000
```

Aparece:
```
✓ Total de registros: 32000
✓ 32000 registros válidos
📦 Dividindo em 16 arquivo(s)...
  ✅ import_data_chunk_01_de_16.sql
  ✅ import_data_chunk_02_de_16.sql
  ... etc
✅ Arquivo de controle: 00_CONTROLE_CHUNKS.sql
```

### Passo 3: Ir ao Supabase

No **Supabase SQL Editor**:

1. **Cole o arquivo de controle** (PASSO 1 - Criar Staging):
   ```
   00_CONTROLE_CHUNKS.sql
   ```
   Execute até a linha que diz "PASSO 2: EXECUTAR OS CHUNKS"

2. **Para cada chunk, em ordem**:
   ```
   import_data_chunk_01_de_16.sql  → Execute
   import_data_chunk_02_de_16.sql  → Execute
   import_data_chunk_03_de_16.sql  → Execute
   ... (execute todos os 16)
   ```

   ⏱️ Cada chunk leva ~1 segundo

3. **Depois dos chunks**, execute o resto do arquivo de controle:
   ```
   PASSO 3: ATUALIZAR FORMALIZACAO
   PASSO 4: VALIDAÇÃO
   ```

4. **Confirme sucesso**, depois opcionalmente:
   ```
   PASSO 5: LIMPEZA (DROP TABLE)
   ```

---

## ✅ Checklist para 32k Registros

```
✅ Arquivo CSV preparado com 3 colunas corretas
✅ Rodou: python3 process_large_csv.py seu_arquivo.csv 2000
✅ Gerou ~16 arquivos import_data_chunk_XX.sql
✅ Abriu Supabase SQL Editor
✅ Executou: 00_CONTROLE_CHUNKS.sql (PASSO 1)
✅ Executou TODOS os chunks em ordem
✅ Executou: 00_CONTROLE_CHUNKS.sql (PASSO 3 E 4)
✅ Validou resultados no PASSO 4
✅ Se OK, executou PASSO 5 (limpeza)
```

---

## 📈 Performance para 32k

| Ação | Tempo Esperado |
|------|---|
| Processar CSV | 0,1s |
| Criar staging | 0,1s |
| Executar 16 chunks | ~16s |
| UPDATE batch | ~5s |
| Validação | ~2s |
| **Total** | **~23 segundos** |

vs UPDATE direto: ~5-10 **minutos** ❌

---

## 🛠️ Troubleshooting

### Problem: "Erro ao executar chunk 5"
**Solução**: Aguarde alguns segundos e tente de novo. Supabase pode ter rate limit.

### Problem: "Staging table not found"
**Solução**: Você pulou o PASSO 1. Execute `00_CONTROLE_CHUNKS.sql` do início.

### Problem: "0 registros importados"
**Solução**: Verifique se os nomes das colunas estão corretos:
- Deve ser: `Emenda`, `Tipo de formalização`, `Com ou Sem Recurso`
- Não pode ser: `emenda`, `tipo_formalizacao`, etc

### Problem: "Preciso atualizar 32k registros novamente"
**Solução**: Rodepython3 process_large_csv.py` de novo com seu novo CSV. Gera novos chunks.

---

## 🎓 Conceitos

### Por Que Chunks?

```
Arquivo CSV 32k
    ↓
Python split em 16 chunks de 2k
    ↓
16 × INSERT (cada um cabe no limite do Supabase)
    ↓
1 × UPDATE batch gigante (mais rápido)
    ↓
Formalizacao atualizada!
```

### Por Que Mais Rápido?

- **Chunks**: Cada INSERT é independente, sem RLS overhead repetido
- **Batch UPDATE**: Um único UPDATE toca todas as linhas de uma vez
- **Sem timeout**: RPC não vai timeout pois cada chunk é pequeno

---

## 💡 Dicas

1. **Manter logs**: Salve os nomes dos chunks usados
2. **Verificar antes**: Rodepython3 check_csv_cols.py` antes de processar
3. **Testar com poucos**: Use chunk_size=100 para testar antes de 2000
4. **Backup**: Faça screenshot dos resultados da PASSO 4 para auditoria

---

## 🚀 Comece Agora

**Se seu CSV tem 234 registros** (atual):
→ Já está pronto! Veja: `00_CONTROLE_CHUNKS.sql` e `import_data_chunk_01_de_01.sql`

**Se seu CSV tem 32.000 registros** (real):
→ Coloque o arquivo aqui e rode: `python3 process_large_csv.py seu_arquivo.csv 2000`

---

**Qual é seu arquivo real? Tem 234 ou 32.000?** 📊
