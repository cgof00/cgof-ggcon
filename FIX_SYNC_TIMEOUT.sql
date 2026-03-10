-- ============================================================
-- FIX: Corrige timeout na sincronização emendas → formalização
-- Cole e execute no Supabase SQL Editor
-- ============================================================

-- 1. Índices em expressões (evita full table scan)
CREATE INDEX IF NOT EXISTS idx_emendas_num_convenio ON emendas(num_convenio);
CREATE INDEX IF NOT EXISTS idx_emendas_codigo_num ON emendas(codigo_num);
CREATE INDEX IF NOT EXISTS idx_formalizacao_numero_convenio ON formalizacao(numero_convenio);
CREATE INDEX IF NOT EXISTS idx_formalizacao_emenda ON formalizacao(emenda);

CREATE INDEX IF NOT EXISTS idx_formalizacao_trim_numero_convenio
  ON formalizacao (TRIM(numero_convenio))
  WHERE numero_convenio IS NOT NULL AND numero_convenio != '';

CREATE INDEX IF NOT EXISTS idx_emendas_trim_num_convenio
  ON emendas (TRIM(num_convenio))
  WHERE num_convenio IS NOT NULL AND num_convenio != '';

CREATE INDEX IF NOT EXISTS idx_formalizacao_emenda_digits
  ON formalizacao (TRIM(REGEXP_REPLACE(emenda, '[^0-9]', '', 'g')))
  WHERE emenda IS NOT NULL AND emenda != ''
    AND LENGTH(REGEXP_REPLACE(emenda, '[^0-9]', '', 'g')) >= 8;

CREATE INDEX IF NOT EXISTS idx_emendas_codigo_num_digits
  ON emendas (TRIM(REGEXP_REPLACE(codigo_num, '[^0-9]', '', 'g')))
  WHERE codigo_num IS NOT NULL;

-- 2. Recriar função RPC com timeout de 300s
CREATE OR REPLACE FUNCTION sync_emendas_formalizacao()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '300s'
AS $$
DECLARE
  v_updated INTEGER := 0;
  v_updated2 INTEGER := 0;
  v_inserted INTEGER := 0;
BEGIN
  WITH matched AS (
    UPDATE formalizacao f SET
      demanda = COALESCE(NULLIF(TRIM(f.demanda), ''), e.detalhes),
      classificacao_emenda_demanda = COALESCE(NULLIF(TRIM(f.classificacao_emenda_demanda), ''), e.natureza),
      ano = COALESCE(NULLIF(TRIM(f.ano), ''), e.ano_refer),
      emenda = COALESCE(NULLIF(TRIM(f.emenda), ''), e.codigo_num),
      emendas_agregadoras = COALESCE(NULLIF(TRIM(f.emendas_agregadoras), ''), e.num_emenda),
      situacao_demandas_sempapel = COALESCE(NULLIF(TRIM(f.situacao_demandas_sempapel), ''), e.situacao_d),
      parlamentar = COALESCE(NULLIF(TRIM(f.parlamentar), ''), e.parlamentar),
      partido = COALESCE(NULLIF(TRIM(f.partido), ''), e.partido),
      conveniado = COALESCE(NULLIF(TRIM(f.conveniado), ''), e.beneficiario),
      municipio = COALESCE(NULLIF(TRIM(f.municipio), ''), e.municipio),
      objeto = COALESCE(NULLIF(TRIM(f.objeto), ''), e.objeto),
      regional = COALESCE(NULLIF(TRIM(f.regional), ''), e.regional),
      portfolio = COALESCE(NULLIF(TRIM(f.portfolio), ''), e.portfolio),
      valor = COALESCE(f.valor, e.valor)
    FROM emendas e
    WHERE TRIM(f.numero_convenio) = TRIM(e.num_convenio)
      AND f.numero_convenio IS NOT NULL AND TRIM(f.numero_convenio) != ''
    RETURNING f.id
  )
  SELECT COUNT(*) INTO v_updated FROM matched;

  WITH matched2 AS (
    UPDATE formalizacao f SET
      demanda = COALESCE(NULLIF(TRIM(f.demanda), ''), e.detalhes),
      classificacao_emenda_demanda = COALESCE(NULLIF(TRIM(f.classificacao_emenda_demanda), ''), e.natureza),
      ano = COALESCE(NULLIF(TRIM(f.ano), ''), e.ano_refer),
      emendas_agregadoras = COALESCE(NULLIF(TRIM(f.emendas_agregadoras), ''), e.num_emenda),
      situacao_demandas_sempapel = COALESCE(NULLIF(TRIM(f.situacao_demandas_sempapel), ''), e.situacao_d),
      parlamentar = COALESCE(NULLIF(TRIM(f.parlamentar), ''), e.parlamentar),
      partido = COALESCE(NULLIF(TRIM(f.partido), ''), e.partido),
      conveniado = COALESCE(NULLIF(TRIM(f.conveniado), ''), e.beneficiario),
      municipio = COALESCE(NULLIF(TRIM(f.municipio), ''), e.municipio),
      objeto = COALESCE(NULLIF(TRIM(f.objeto), ''), e.objeto),
      regional = COALESCE(NULLIF(TRIM(f.regional), ''), e.regional),
      portfolio = COALESCE(NULLIF(TRIM(f.portfolio), ''), e.portfolio),
      numero_convenio = COALESCE(NULLIF(TRIM(f.numero_convenio), ''), e.num_convenio),
      valor = COALESCE(f.valor, e.valor)
    FROM emendas e
    WHERE REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g') = REGEXP_REPLACE(e.codigo_num, '[^0-9]', '', 'g')
      AND f.emenda IS NOT NULL AND TRIM(f.emenda) != ''
      AND LENGTH(REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g')) >= 8
    RETURNING f.id
  )
  SELECT COUNT(*) INTO v_updated2 FROM matched2;

  WITH new_records AS (
    INSERT INTO formalizacao (ano, parlamentar, partido, emenda, demanda,
      classificacao_emenda_demanda, numero_convenio, regional, municipio,
      conveniado, objeto, portfolio, valor)
    SELECT e.ano_refer, e.parlamentar, e.partido, e.codigo_num, e.detalhes,
      e.natureza, e.num_convenio, e.regional, e.municipio, e.beneficiario,
      e.objeto, e.portfolio, e.valor
    FROM emendas e
    WHERE NOT EXISTS (
      SELECT 1 FROM formalizacao f WHERE TRIM(f.numero_convenio) = TRIM(e.num_convenio)
        AND e.num_convenio IS NOT NULL AND TRIM(e.num_convenio) != ''
    )
    AND NOT EXISTS (
      SELECT 1 FROM formalizacao f
      WHERE LENGTH(REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g')) >= 8
        AND REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g') = REGEXP_REPLACE(e.codigo_num, '[^0-9]', '', 'g')
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_inserted FROM new_records;

  RETURN json_build_object(
    'updated', v_updated + v_updated2,
    'updated_by_convenio', v_updated,
    'updated_by_emenda', v_updated2,
    'inserted', v_inserted,
    'message', (v_updated + v_updated2) || ' atualizadas, ' || v_inserted || ' inseridas'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION sync_emendas_formalizacao() TO service_role;
NOTIFY pgrst, 'reload schema';
