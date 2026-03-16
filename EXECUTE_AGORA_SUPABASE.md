# 🚨 EXECUTE ISTO AGORA NO SUPABASE (Uma única vez)

## 1️⃣ Abra: https://app.supabase.com

## 2️⃣ Vá em: SQL Editor → New Query

## 3️⃣ LIMPE O EDITOR E COLE EXATAMENTE ISTO:

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
  SELECT COALESCE(emenda, '') INTO v_ultimo_codigo
  FROM formalizacao
  ORDER BY id DESC
  LIMIT 1;

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

## 4️⃣ Clique no botão `RUN` 

Vai aparecer: **"Success"** ✅ ou erro

---

## ✅ DEPOIS DISSO:

Acesse: **https://cgof-ggcon.pages.dev**

- Login como ADMIN
- Importar CSV Emendas
- Depois vem a SINCRONIZAÇÃO automática
- Vai funcionar!

---

**📌 CRÍTICO**: Sem executar este SQL, nada funciona. A função precisa estar no banco.

Se tiver erro ao executar: compartilhe a mensagem de erro com print screen.
