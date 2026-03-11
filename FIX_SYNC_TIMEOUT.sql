-- ============================================================
-- FIX: Sincronização emendas → formalização em 3 etapas
-- Cole e execute no Supabase SQL Editor
-- ============================================================

-- 1. Índices para performance
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

-- ============================================================
-- ETAPA 1: UPDATE por numero_convenio
-- ============================================================
CREATE OR REPLACE FUNCTION sync_step1_update_convenio()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET statement_timeout = '120s'
AS $$
DECLARE v_updated INTEGER := 0;
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
  RETURN json_build_object('updated', v_updated);
END;
$$;

-- ============================================================
-- ETAPA 2: UPDATE por emenda/codigo_num (dígitos)
-- ============================================================
CREATE OR REPLACE FUNCTION sync_step2_update_emenda()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET statement_timeout = '120s'
AS $$
DECLARE v_updated INTEGER := 0;
BEGIN
  WITH matched AS (
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
    WHERE f.emenda = e.codigo_num
      AND f.emenda IS NOT NULL AND TRIM(f.emenda) != ''
    RETURNING f.id
  )
  SELECT COUNT(*) INTO v_updated FROM matched;
  RETURN json_build_object('updated', v_updated);
END;
$$;

-- ============================================================
-- ETAPA 3: INSERT novas emendas que NÃO existem na formalização
-- Compara por valor EXATO de codigo_num e por numero_convenio
-- ============================================================
CREATE OR REPLACE FUNCTION sync_step3_insert_novas()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET statement_timeout = '120s'
AS $$
DECLARE v_inserted INTEGER := 0;
BEGIN
  WITH new_records AS (
    INSERT INTO formalizacao (
      ano, parlamentar, partido, emenda, demanda,
      classificacao_emenda_demanda, numero_convenio, regional,
      municipio, conveniado, objeto, portfolio, valor
    )
    SELECT
      e.ano_refer, e.parlamentar, e.partido, e.codigo_num, e.detalhes,
      e.natureza, e.num_convenio, e.regional,
      e.municipio, e.beneficiario, e.objeto, e.portfolio, e.valor
    FROM emendas e
    WHERE e.codigo_num IS NOT NULL
      AND TRIM(e.codigo_num) != ''
      -- Não existe na formalização por emenda (match exato)
      AND NOT EXISTS (
        SELECT 1 FROM formalizacao f WHERE f.emenda = e.codigo_num
      )
      -- Não existe na formalização por numero_convenio
      AND NOT EXISTS (
        SELECT 1 FROM formalizacao f
        WHERE TRIM(f.numero_convenio) = TRIM(e.num_convenio)
          AND e.num_convenio IS NOT NULL
          AND TRIM(e.num_convenio) != ''
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_inserted FROM new_records;
  RETURN json_build_object('inserted', v_inserted);
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION sync_step1_update_convenio() TO service_role;
GRANT EXECUTE ON FUNCTION sync_step2_update_emenda() TO service_role;
GRANT EXECUTE ON FUNCTION sync_step3_insert_novas() TO service_role;
NOTIFY pgrst, 'reload schema';
