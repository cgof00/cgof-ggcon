# 🚀 Scripts de Otimização e Limpeza de Dados

## 1. Script de Remoção de Duplicatas

**Arquivo:** `remove-duplicates.ts`

Este script remove registros duplicados da tabela `formalizacao` baseado na coluna `emenda`.

### Como usar:

```bash
# Executar o script
npx ts-node remove-duplicates.ts
```

### O que faz:
- ✅ Carrega todos os registros da tabela formalizacao
- ✅ Identifica duplicatas pela coluna "emenda"
- ✅ Mantém o primeiro registro, deleta os duplicados
- ✅ Mostra relatório de registros deletados

### ⚠️ Importante:
- **FAÇA UM BACKUP DE SEUS DADOS ANTES!**
- O script identifica os registros a deletar e mostra a confirmação
- Verá os primeiros 10 IDs a serem deletados antes de executar

---

## 2. Script de Criação de Índices

**Arquivo:** `create-indexes.ts`

Este script gera o SQL para criar índices que melhoram drasticamente a performance.

### Como usar:

```bash
# Gerar o arquivo SQL
npx ts-node create-indexes.ts
```

### O que faz:
- ✅ Gera arquivo `create-indexes.sql` com todos os índices necessários
- ✅ Cria índices em todas as colunas de filtro
- ✅ Cria índices compostos para queries frequentes
- ✅ Pronto para executar no Supabase SQL Editor

### Como aplicar os índices:

1. Acesse: https://supabase.com/dashboard/project/[seu-projeto]/sql
2. Clique em "New Query"
3. Cole o conteúdo do arquivo `create-indexes.sql`
4. Clique em "Run"
5. Aguarde a conclusão (alguns minutos)

### Índices criados:
- `idx_formalizacao_ano` - Coluna ANO
- `idx_formalizacao_area_estagio` - Área de Estágio
- `idx_formalizacao_tecnico` - Técnico
- `idx_formalizacao_situacao` - Situação de Análise
- E mais 15+ outros índices...

---

## 3. Cache Automático no Backend

**Localização:** `server.ts` - Endpoint `/api/formalizacao/filters`

### Melhorias implementadas:
- ✅ **Cache em memória** - Filtros são cacheados por 30 minutos
- ✅ **Primeira requisição** - Busca todos os valores (pode levar 5-10s)
- ✅ **Requisições seguintes** - Retorna do cache (instantâneo)
- ✅ **Auto-renovação** - Cache atualiza automaticamente após 30 minutos
- ✅ **Logging detalhado** - Mostra se está usando cache ou atualizando

### Console output exemplo:
```
⚡ Retornando filtros do cache (45s)
```

---

## 📊 Impacto de Performance Esperado

### Antes das otimizações:
- ⏱️ Filtros levam 5-10 segundos para carregar
- 📈 Cada requisição de filtro faz 75k leituras no banco
- 🔄 Múltiplos usuários = múltiplas requisições lentas

### Depois das otimizações:
- ⚡ Primeira requisição: 5-10 segundos (igual, mas só acontece 1x)
- ⚡ Requisições subsequentes: < 100ms (do cache)
- 🔄 Múltiplos usuários = 1 requisição ao banco a cada 30 minutos
- 📊 Redução de 99% no tempo de resposta para usuários subsequentes

---

## 🎯 Próximos passos recomendados

1. **Execute imediatamente:**
   ```bash
   npx ts-node remove-duplicates.ts
   ```

2. **Aplique os índices no Supabase:**
   - Execute `create-indexes.sql` no SQL Editor

3. **Teste os filtros:**
   - Abra http://localhost:5173
   - Clique em "Filtros Avançados"
   - Primeira vez: demora alguns segundos
   - Segunda vez: deve ser bem rápido (cache)

---

## 📝 Performance checklist

- [ ] Scripts criados (remove-duplicates.ts, create-indexes.ts)
- [ ] Cache implementado no backend (30 min)
- [ ] Script SQL de índices gerado (create-indexes.sql)
- [ ] Índices aplicados no Supabase
- [ ] Duplicatas removidas
- [ ] Filtros testados na aplicação
- [ ] Verificar tempo de resposta no console
