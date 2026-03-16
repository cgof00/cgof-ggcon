# 🚀 NOVA ABORDAGEM IMPLEMENTADA - INSTRUÇÕES

## ✅ O que foi feito:

### 1. **Função SQL Nova: `sync_incremental()`**
   - Pega o **ÚLTIMO código de emenda** já importado na tabela `formalizacao`
   - Procura **TODAS as emendas posteriores** na tabela `emendas`
   - **Insere na formalizacao** com as colunas respectivas
   - **Usa `situacao_d`** (Situação Demanda) como `situacao_demandas_sempapel`
   - Ordena por código para inserir sequencialmente

### 2. **API Simplificada**
   - Chama apenas `sync_incremental()`
   - Sem parâmetros complexos
   - Simples, eficiente, sem complicações

### 3. **Frontend Atualizado**
   - Mensagem clara: "Sincronizando novas emendas com formalização..."

---

## 🔴 PASSO OBRIGATÓRIO: Criar a Função no Banco

### ⚠️ IMPORTANTE: Execute isto AGORA no Supabase SQL Editor

**Abra**: https://app.supabase.com → SQL Editor → New query

**Cole TODO este código**:
```sql
DROP FUNCTION IF EXISTS sync_incremental() CASCADE;

CREATE OR REPLACE FUNCTION sync_incremental()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET statement_timeout = '120s'
AS $$
DECLARE 
  v_ultimo_codigo VARCHAR := '';
  v_inserted INTEGER := 0;
BEGIN
  -- PASSO 1: Obter último código de emenda já importado
  SELECT COALESCE(emenda, '') INTO v_ultimo_codigo
  FROM formalizacao
  ORDER BY id DESC
  LIMIT 1;

  RAISE NOTICE 'Último código importado: %', COALESCE(v_ultimo_codigo, '[NENHUM]');

  -- PASSO 2: Inserir TODAS as emendas novas (posteriores ao último código)
  WITH novas_emendas AS (
    INSERT INTO formalizacao (
      ano, parlamentar, partido, emenda, demanda,
      classificacao_emenda_demanda, emendas_agregadoras,
      situacao_demandas_sempapel, numero_convenio, regional,
      municipio, conveniado, objeto, portfolio, valor
    )
    SELECT
      TRIM(COALESCE(e.ano_refer, '')),
      TRIM(COALESCE(e.parlamentar, '')),
      TRIM(COALESCE(e.partido, '')),
      TRIM(COALESCE(e.codigo_num, '')),
      TRIM(COALESCE(e.detalhes, '')),
      TRIM(REGEXP_REPLACE(COALESCE(e.natureza,''), E'[\\x00-\\x1F\\x7F\\xA0]', '', 'g')),
      TRIM(COALESCE(e.num_emenda, '')),
      -- 🎯 IMPORTANTE: Usa situacao_d como situacao_demandas_sempapel
      TRIM(COALESCE(e.situacao_d, '')),
      TRIM(COALESCE(e.num_convenio, '')),
      TRIM(COALESCE(e.regional, '')),
      TRIM(COALESCE(e.municipio, '')),
      TRIM(COALESCE(e.beneficiario, '')),
      TRIM(COALESCE(e.objeto, '')),
      TRIM(COALESCE(e.portfolio, '')),
      COALESCE(e.valor, 0)
    FROM emendas e
    WHERE TRIM(COALESCE(e.codigo_num, '')) > v_ultimo_codigo
      AND e.codigo_num IS NOT NULL
      AND TRIM(e.codigo_num) != ''
    ORDER BY e.codigo_num ASC
    RETURNING id
  )
  SELECT COUNT(*) INTO v_inserted FROM novas_emendas;

  RAISE NOTICE 'Emendas inseridas: %', v_inserted;

  RETURN json_build_object(
    'status', 'success',
    'inserted', v_inserted,
    'ultimo_codigo', v_ultimo_codigo,
    'message', CASE 
      WHEN v_inserted = 0 THEN 'Nenhuma emenda nova para sincronizar'
      WHEN v_inserted = 1 THEN '1 nova emenda foi sincronizada'
      ELSE v_inserted || ' novas emendas foram sincronizadas'
    END
  );

END;
$$;
```

**Clique em `RUN` e aguarde a execução** (deve dizer "Success")

---

## ✅ AGORA TESTE O SISTEMA:

### Teste 1: Importar Novas Emendas
1. Acesse: **https://cgof-ggcon.pages.dev** (em PRIVATE/INCOGNITO para limpar cache)
2. Faça login como ADMIN
3. Vá em: **Importar CSV Emendas**
4. Selecione um arquivo CSV com novas emendas
5. Clique em **IMPORTAR**

### Resultado Esperado:
- ✅ Mensagem: "Sincronizando novas emendas com formalização..."
- ✅ Após sync: "X novas emendas foram sincronizadas"
- ✅ Novas emendas aparecem na tabela Formalização
- ✅ Colunas preenchidas com valores corretos
- ✅ **`situacao_demandas_sempapel`** recebe valor de `situacao_d` do CSV

### Teste 2: Segunda Importação (Incrementalidade)
1. Importe **NOVAMENTE** o mesmo arquivo
2. Sistema deve reconhecer que já tem os códigos
3. Mensagem: "0 novas emendas para sincronizar" (pois já estão todas)
4. **Nenhuma duplicata** é criada

### Teste 3: Importar Novas + Antigas
1. Pega o arquivo anterior
2. **Adiciona 5-10 emendas novas** com códigos maiores
3. Importe o arquivo misto
4. Sistema deve inserir **apenas as novas**, deixar as antigas

---

## 🔍 VERIFICAÇÃO NO BANCO (Optional):

Se quiser verificar que funcionou:

**Supabase SQL Editor - Nova Query:**
```sql
-- Ver últimos registros importados
SELECT id, emenda, ano, parlamentar, situacao_demandas_sempapel 
FROM formalizacao 
ORDER BY id DESC 
LIMIT 10;

-- Contar total
SELECT COUNT(*) FROM formalizacao;

-- Ver se updated_at foi modificado recentemente
SELECT COUNT(*) as registros_atualizados_agora
FROM formalizacao
WHERE updated_at > NOW() - INTERVAL '1 minute';
```

---

## ❓ Dúvidas?

Se algo não funcionar:
1. Executou o comando SQL no Supabase? ✅
2. Está em modo PRIVATE/INCOGNITO? ✅
3. Qual a mensagem de erro? (compartilhe)

**Próximo passo**: Execute o SQL e teste a importação! 🚀
