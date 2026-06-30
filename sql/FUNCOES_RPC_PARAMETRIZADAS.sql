-- ============================================================================
-- FUNÇÕES RPC PARAMETRIZADAS COM FILTRO DE ANOS
-- ============================================================================
-- Versão parametrizada das funções RPC que aceitam lista de anos
-- Permite sincronizar apenas anos específicos enquanto importa CSV
-- ============================================================================

-- ============================================================
-- ETAPA 1: UPDATE por numero_convenio (com parâmetro de anos)
-- ============================================================
CREATE OR REPLACE FUNCTION sync_step1_update_convenio_with_years(p_years TEXT[] = ARRAY['2024', '2025', '2026'])
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET statement_timeout = '120s'
AS $$
DECLARE v_updated INTEGER := 0;
BEGIN
  WITH matched AS (
    UPDATE formalizacao f SET
      demanda = CASE WHEN e.detalhes IS NOT NULL AND TRIM(e.detalhes) != '' THEN TRIM(e.detalhes) ELSE f.demanda END,
      classificacao_emenda_demanda = CASE WHEN e.natureza IS NOT NULL AND TRIM(REGEXP_REPLACE(COALESCE(e.natureza,''), E'[\\x00-\\x1F\\x7F\\xA0]', '', 'g')) != '' THEN TRIM(REGEXP_REPLACE(e.natureza, E'[\\x00-\\x1F\\x7F\\xA0]', '', 'g')) ELSE f.classificacao_emenda_demanda END,
      ano = CASE WHEN e.ano_refer IS NOT NULL AND TRIM(e.ano_refer) != '' THEN TRIM(e.ano_refer) ELSE f.ano END,
      emenda = CASE WHEN e.codigo_num IS NOT NULL AND TRIM(e.codigo_num) != '' THEN TRIM(e.codigo_num) ELSE f.emenda END,
      emendas_agregadoras = CASE WHEN e.num_emenda IS NOT NULL AND TRIM(e.num_emenda) != '' THEN TRIM(e.num_emenda) ELSE f.emendas_agregadoras END,
      situacao_demandas_sempapel = CASE WHEN e.situacao_d IS NOT NULL AND TRIM(e.situacao_d) != '' THEN TRIM(e.situacao_d) ELSE f.situacao_demandas_sempapel END,
      parlamentar = CASE WHEN e.parlamentar IS NOT NULL AND TRIM(e.parlamentar) != '' THEN TRIM(e.parlamentar) ELSE f.parlamentar END,
      partido = CASE WHEN e.partido IS NOT NULL AND TRIM(e.partido) != '' THEN TRIM(e.partido) ELSE f.partido END,
      conveniado = CASE WHEN e.beneficiario IS NOT NULL AND TRIM(e.beneficiario) != '' THEN TRIM(e.beneficiario) ELSE f.conveniado END,
      municipio = CASE WHEN e.municipio IS NOT NULL AND TRIM(e.municipio) != '' THEN TRIM(e.municipio) ELSE f.municipio END,
      objeto = CASE WHEN e.objeto IS NOT NULL AND TRIM(e.objeto) != '' THEN TRIM(e.objeto) ELSE f.objeto END,
      regional = CASE WHEN e.regional IS NOT NULL AND TRIM(e.regional) != '' THEN TRIM(e.regional) ELSE f.regional END,
      portfolio = CASE WHEN e.portfolio IS NOT NULL AND TRIM(e.portfolio) != '' THEN TRIM(e.portfolio) ELSE f.portfolio END,
      valor = CASE WHEN e.valor IS NOT NULL THEN e.valor ELSE f.valor END
    FROM emendas e
    WHERE TRIM(f.numero_convenio) = TRIM(e.num_convenio)
      AND f.numero_convenio IS NOT NULL AND TRIM(f.numero_convenio) != ''
      AND e.ano_refer = ANY(p_years)
    RETURNING f.id
  )
  SELECT COUNT(*) INTO v_updated FROM matched;
  RETURN json_build_object('updated', v_updated, 'filtered_years', p_years);
END;
$$;

-- ============================================================
-- ETAPA 2: UPDATE por emenda/codigo_num (com parâmetro de anos)
-- ============================================================
CREATE OR REPLACE FUNCTION sync_step2_update_emenda_with_years(p_years TEXT[] = ARRAY['2024', '2025', '2026'])
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET statement_timeout = '120s'
AS $$
DECLARE v_updated INTEGER := 0;
BEGIN
  WITH matched AS (
    UPDATE formalizacao f SET
      demanda = CASE WHEN e.detalhes IS NOT NULL AND TRIM(e.detalhes) != '' THEN TRIM(e.detalhes) ELSE f.demanda END,
      classificacao_emenda_demanda = CASE WHEN e.natureza IS NOT NULL AND TRIM(REGEXP_REPLACE(COALESCE(e.natureza,''), E'[\\x00-\\x1F\\x7F\\xA0]', '', 'g')) != '' THEN TRIM(REGEXP_REPLACE(e.natureza, E'[\\x00-\\x1F\\x7F\\xA0]', '', 'g')) ELSE f.classificacao_emenda_demanda END,
      ano = CASE WHEN e.ano_refer IS NOT NULL AND TRIM(e.ano_refer) != '' THEN TRIM(e.ano_refer) ELSE f.ano END,
      emendas_agregadoras = CASE WHEN e.num_emenda IS NOT NULL AND TRIM(e.num_emenda) != '' THEN TRIM(e.num_emenda) ELSE f.emendas_agregadoras END,
      situacao_demandas_sempapel = CASE WHEN e.situacao_d IS NOT NULL AND TRIM(e.situacao_d) != '' THEN TRIM(e.situacao_d) ELSE f.situacao_demandas_sempapel END,
      parlamentar = CASE WHEN e.parlamentar IS NOT NULL AND TRIM(e.parlamentar) != '' THEN TRIM(e.parlamentar) ELSE f.parlamentar END,
      partido = CASE WHEN e.partido IS NOT NULL AND TRIM(e.partido) != '' THEN TRIM(e.partido) ELSE f.partido END,
      conveniado = CASE WHEN e.beneficiario IS NOT NULL AND TRIM(e.beneficiario) != '' THEN TRIM(e.beneficiario) ELSE f.conveniado END,
      municipio = CASE WHEN e.municipio IS NOT NULL AND TRIM(e.municipio) != '' THEN TRIM(e.municipio) ELSE f.municipio END,
      objeto = CASE WHEN e.objeto IS NOT NULL AND TRIM(e.objeto) != '' THEN TRIM(e.objeto) ELSE f.objeto END,
      regional = CASE WHEN e.regional IS NOT NULL AND TRIM(e.regional) != '' THEN TRIM(e.regional) ELSE f.regional END,
      portfolio = CASE WHEN e.portfolio IS NOT NULL AND TRIM(e.portfolio) != '' THEN TRIM(e.portfolio) ELSE f.portfolio END,
      numero_convenio = CASE WHEN e.num_convenio IS NOT NULL AND TRIM(e.num_convenio) != '' THEN TRIM(e.num_convenio) ELSE f.numero_convenio END,
      valor = CASE WHEN e.valor IS NOT NULL THEN e.valor ELSE f.valor END
    FROM emendas e
    WHERE TRIM(f.emenda) = TRIM(e.codigo_num)
      AND f.emenda IS NOT NULL AND TRIM(f.emenda) != ''
      AND e.ano_refer = ANY(p_years)
    RETURNING f.id
  )
  SELECT COUNT(*) INTO v_updated FROM matched;
  RETURN json_build_object('updated', v_updated, 'filtered_years', p_years);
END;
$$;

-- ============================================================
-- ETAPA 3: INSERT novas emendas (com parâmetro de anos)
-- ============================================================
CREATE OR REPLACE FUNCTION sync_step3_insert_novas_with_years(p_years TEXT[] = ARRAY['2024', '2025', '2026'])
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET statement_timeout = '120s'
AS $$
DECLARE v_inserted INTEGER := 0;
BEGIN
  WITH new_records AS (
    INSERT INTO formalizacao (
      ano, parlamentar, partido, emenda, demanda,
      classificacao_emenda_demanda, emendas_agregadoras,
      situacao_demandas_sempapel, numero_convenio, regional,
      municipio, conveniado, objeto, portfolio, valor
    )
    SELECT
      TRIM(e.ano_refer), TRIM(e.parlamentar), TRIM(e.partido), TRIM(e.codigo_num), TRIM(e.detalhes),
      TRIM(REGEXP_REPLACE(COALESCE(e.natureza,''), E'[\\x00-\\x1F\\x7F\\xA0]', '', 'g')), TRIM(e.num_emenda),
      TRIM(e.situacao_d), TRIM(e.num_convenio), TRIM(e.regional),
      TRIM(e.municipio), TRIM(e.beneficiario), TRIM(e.objeto), TRIM(e.portfolio), e.valor
    FROM emendas e
    WHERE e.codigo_num IS NOT NULL
      AND TRIM(e.codigo_num) != ''
      AND e.ano_refer = ANY(p_years)
      AND NOT EXISTS (
        SELECT 1 FROM formalizacao f WHERE TRIM(f.emenda) = TRIM(e.codigo_num)
      )
      AND NOT EXISTS (
        SELECT 1 FROM formalizacao f
        WHERE TRIM(f.numero_convenio) = TRIM(e.num_convenio)
          AND e.num_convenio IS NOT NULL
          AND TRIM(e.num_convenio) != ''
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_inserted FROM new_records;
  RETURN json_build_object('inserted', v_inserted, 'filtered_years', p_years);
END;
$$;

-- ============================================================================
-- TESTE: Listar anos disponíveis
-- ============================================================================
SELECT DISTINCT ano_refer as ano 
FROM emendas 
WHERE ano_refer IS NOT NULL AND TRIM(ano_refer) != ''
ORDER BY ano_refer DESC;
