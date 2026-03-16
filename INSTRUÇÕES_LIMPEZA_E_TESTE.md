# 🔧 Instruções: Limpar Banco + Testar Sistema

## ✅ Correções Já Implementadas

A lógica de sincronização foi **COMPLETAMENTE CORRIGIDA**:

### Problema que foi encontrado e resolvido:
```
ANTES (❌ NÃO FUNCIONAVA):
- App.tsx enviava { onlyNew: true }
- sync-emendas.ts tinha default { onlyNew: true }
- Condição: if (!onlyNew) === if (!true) === if (false)
- Resultado: UPDATE NUNCA executava

DEPOIS (✅ CORRIGIDO):
- App.tsx envia { onlyNew: false }
- sync-emendas.ts default é { onlyNew: false }
- Condição: if (!onlyNew) === if (!false) === if (true)
- Resultado: UPDATE executa normalmente
```

### O que os RPC fazem agora:
1. **`sync_formalizacao_atualizar()`** - Atualiza TODAS as colunas de emendas existentes
   - Match por: `codigo_num` (coluna `emenda`) OU `num_convenio`
   - Atualiza: demanda, natureza, ano, parlamentar, partido, beneficiário, etc.
   
2. **`sync_formalizacao_novas()`** - Insere apenas novas emendas
   - Verifica: Não existe por código + Não existe por convênio
   - Insere: Apenas registros realmente novos

---

## 🛠️ Passo 1: Limpar o Banco de Dados

O banco tem ~67k registros (deveria ter ~38k). Vamos remover os ~29k duplicados.

### Opção A: Executar via Supabase SQL Editor (RECOMENDADO)

1. **Abra o Supabase**: https://app.supabase.com
2. **Vá em**: SQL Editor → New query
3. **Cole este código**:

```sql
-- 🚨 PASSO 1: Contar duplicatas antes de limpar
SELECT COUNT(*) as total_antes FROM formalizacao;

SELECT 
  COUNT(*) as registros_duplicados
FROM (
  SELECT 
    COALESCE(TRIM(emenda), TRIM(numero_convenio)) as chave,
    COUNT(*) 
  FROM formalizacao
  GROUP BY COALESCE(TRIM(emenda), TRIM(numero_convenio))
  HAVING COUNT(*) > 1
) sub;

-- 🚨 PASSO 2: Deletar duplicatas (mantém apenas o primeiro)
DELETE FROM formalizacao
WHERE id NOT IN (
  SELECT MIN(id)
  FROM formalizacao
  GROUP BY COALESCE(TRIM(emenda), TRIM(numero_convenio))
);

-- 🚨 PASSO 3: Verificar resultado
SELECT COUNT(*) as total_depois FROM formalizacao;
```

4. **Clique em `Run`** e aguarde a execução

### Resultado esperado:
```
33000-38000 registros após limpeza (ao invés dos 67k atuais)
```

---

## 📥 Passo 2: Preparar Dados de Teste

### Opção 1: Usar os dados que você enviou
Se você já possui um arquivo CSV/Excel com emendas para testar, prepare assim:
- Certifique-se que tem a coluna `Código/Nº Emenda` (ex: `2026.256.86142`)
- Certifique-se que tem a coluna `Nº de Convênio`
- Inclua pelo menos 5-10 emendas para testar

### Opção 2: Usar dados de teste
Crie um arquivo `teste-importacao.csv` com este conteúdo:

```csv
Código/Nº Emenda,Nº de Convênio,Nº Emenda Agregadora,Parlamentar,Partido,Natureza,Detalhes da Demanda,Beneficiário,Município,Objeto,Órgão Entidade/Responsável,Regional,Portfólio,Ano Referência,Valor,Situação Emenda,Situação Demanda
2026.999.00001,2024001,001,João Silva,PT,Saúde Pública,Construção de Posto de Saúde,Prefeitura de Brasília,Brasília,Construção de Posto de Saúde,Secretaria Municipal de Saúde,Centro,Infraestrutura,2026,500000.00,Aprovada,Em Processamento
2026.999.00002,2024002,002,Maria Santos,PSDB,Educação Básica,Reforma de Escola Estadual,Secretaria de Educação,BeloHorizonte,Reforma de Escola,Secretaria Estadual de Educação,Nordeste,Desenvolvimento,2026,300000.00,Aprovada,Em Processamento
2026.999.00003,2024003,003,Pedro Costa,PSD,Infraestrutura,Pavimentação de Rodovia,Governo do Estado,Salvador,Pavimentação,Secretaria de Infraestrutura,Nordeste,Infraestrutura,2026,1000000.00,Aprovada,Finalizado
```

---

## 🎯 Passo 3: Testar o Sistema

### Teste 1: Importar Novas Emendas
1. Acesse: https://cgof-ggcon.pages.dev
2. Faça login como ADMIN
3. Vá em: **Importar CSV Emendas** (botão no menu)
4. Selecione o arquivo de teste
5. Clique em **IMPORTAR**
6. Aguarde: "Sincronizando emendas com formalizações (NOVAS + ATUALIZAÇÕES)..."

### Resultado Esperado:
- ✅ Novas emendas aparecem na tabela Formalização
- ✅ Mensagem: "3 linhas importadas com sucesso"
- ✅ Mensagem de sync: "3 novas inseridas"

### Teste 2: Atualizar Coluna de Emenda Existente
1. **Modifique** um valor em uma emenda já importada (ex: mude `Parlamentar`)
2. **Importe novamente** o arquivo com a mudança
3. Aguarde o sync completar

### Resultado Esperado:
- ✅ O valor da coluna é atualizado na Formalização
- ✅ Mensagem de sync: "1 atualizada, 0 novas inseridas"

### Teste 3: Misturar Novas + Atualizações
1. **Mantenha** algumas emendas antigas (para atualizar)
2. **Adicione** algumas novas emendas (novas linhas)
3. **Importe o arquivo misto**

### Resultado Esperado:
- ✅ Novas emendas são inseridas
- ✅ Emendas existentes são atualizadas
- ✅ Mensagem: "2 atualizada, 3 novas inseridas" (exemplo)

---

## 🔍 Verificação de Sucesso

### No Sistema (Frontend)
```
✅ Mensagem de Sucesso aparece após sync
✅ Novos registros visível na tabela Formalização
✅ Coluna "Parlamentar" atualizada com novo valor (se modificou)
✅ Sem mensagens de erro no console (F12)
```

### No Banco (Supabase Terminal)
Execute isto para verificar:
```sql
-- Ver contagem final
SELECT COUNT(*) FROM formalizacao;

-- Ver últimos registros inseridos
SELECT id, emenda, numero_convenio, ano, parlamentar FROM formalizacao 
ORDER BY created_at DESC LIMIT 5;

-- Verificar que não há mais duplicatas
SELECT COUNT(*) as duplicatas
FROM (
  SELECT COALESCE(TRIM(emenda), TRIM(numero_convenio)) as chave
  FROM formalizacao
  GROUP BY chave
  HAVING COUNT(*) > 1
) sub;
-- Deve retornar: 0 (zero duplicatas)
```

---

## 🐛 Se Algo Não Funcionar

### Se novas emendas NÃO aparecem:
1. Abra o Console (F12 → Network)
2. Procure por request `/api/admin/sync-emendas`
3. Clique nela → Response
4. Procure por `"inserted": 0` ou erro
5. Se tiver erro, compartilhe a mensagem

### Se colunas NÃO são atualizadas:
1. Verifique que o `codigo_num` (Código/Nº Emenda) está igual
2. Verifique que o `num_convenio` (Nº de Convênio) está igual
3. Se trocou o código, o sistema trata como NOVA (não como atualização)

### Se o banco não "limpou":
1. Volte ao Passo 1
2. Execute novamente o script SQL
3. Verifique o `COUNT(*)` antes e depois

---

## 📊 Fluxo Completo Resumido

```
1. Banco Limpo (67k → 38k)
   ↓
2. Arquivo com 5-10 emendas de TESTE  
   ↓
3. Clica IMPORTAR CSV EMENDAS
   ↓
4. Sistema:
   - UPSERT (emendas table) ✅
   - sync_formalizacao_atualizar() ✅ ← AGORA FUNCIONA!
   - sync_formalizacao_novas() ✅     ← AGORA FUNCIONA!
   ↓
5. Resultado:
   - Novas emendas em Formalização ✅
   - Colunas atualizadas ✅
   - Sem duplicatas ✅
```

---

## ❓ Dúvidas?

Se algo não funcionar conforme esperado:
1. Compartilhe mensagem de erro (se houver)
2. Compartilhe o CSV de teste
3. Confirme: Banco foi limpo? (Conte registros)

**Sistema está em produção**: https://cgof-ggcon.pages.dev (código novo já deployado)

---

**Próximo passo**: Execute o Passo 1 (Limpeza) e depois o Passo 2 (Teste)
