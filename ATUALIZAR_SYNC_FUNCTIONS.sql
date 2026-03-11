-- ============================================================
-- ATUALIZAR FUNÇÕES DE SINCRONIZAÇÃO emendas → formalização
-- Agora SEMPRE atualiza as colunas mapeadas (não só vazias)
-- Cole e execute no Supabase SQL Editor
-- ============================================================

-- ============================================================
-- ETAPA 1: UPDATE por numero_convenio
-- Atualiza SEMPRE quando a emenda tem dado (sobrescreve formalização)
-- ============================================================
CREATE OR REPLACE FUNCTION sync_step1_update_convenio()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET statement_timeout = '120s'
AS $$
DECLARE v_updated INTEGER := 0;
BEGIN
  WITH matched AS (
    UPDATE formalizacao f SET
      demanda = CASE WHEN e.detalhes IS NOT NULL AND TRIM(e.detalhes) != '' THEN e.detalhes ELSE f.demanda END,
      classificacao_emenda_demanda = CASE WHEN e.natureza IS NOT NULL AND TRIM(e.natureza) != '' THEN e.natureza ELSE f.classificacao_emenda_demanda END,
      ano = CASE WHEN e.ano_refer IS NOT NULL AND TRIM(e.ano_refer) != '' THEN e.ano_refer ELSE f.ano END,
      emenda = CASE WHEN e.codigo_num IS NOT NULL AND TRIM(e.codigo_num) != '' THEN e.codigo_num ELSE f.emenda END,
      emendas_agregadoras = CASE WHEN e.num_emenda IS NOT NULL AND TRIM(e.num_emenda) != '' THEN e.num_emenda ELSE f.emendas_agregadoras END,
      situacao_demandas_sempapel = CASE WHEN e.situacao_d IS NOT NULL AND TRIM(e.situacao_d) != '' THEN e.situacao_d ELSE f.situacao_demandas_sempapel END,
      parlamentar = CASE WHEN e.parlamentar IS NOT NULL AND TRIM(e.parlamentar) != '' THEN e.parlamentar ELSE f.parlamentar END,
      partido = CASE WHEN e.partido IS NOT NULL AND TRIM(e.partido) != '' THEN e.partido ELSE f.partido END,
      conveniado = CASE WHEN e.beneficiario IS NOT NULL AND TRIM(e.beneficiario) != '' THEN e.beneficiario ELSE f.conveniado END,
      municipio = CASE WHEN e.municipio IS NOT NULL AND TRIM(e.municipio) != '' THEN e.municipio ELSE f.municipio END,
      objeto = CASE WHEN e.objeto IS NOT NULL AND TRIM(e.objeto) != '' THEN e.objeto ELSE f.objeto END,
      regional = CASE WHEN e.regional IS NOT NULL AND TRIM(e.regional) != '' THEN e.regional ELSE f.regional END,
      portfolio = CASE WHEN e.portfolio IS NOT NULL AND TRIM(e.portfolio) != '' THEN e.portfolio ELSE f.portfolio END,
      valor = CASE WHEN e.valor IS NOT NULL THEN e.valor ELSE f.valor END
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
-- Atualiza SEMPRE quando a emenda tem dado (sobrescreve formalização)
-- ============================================================
CREATE OR REPLACE FUNCTION sync_step2_update_emenda()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET statement_timeout = '120s'
AS $$
DECLARE v_updated INTEGER := 0;
BEGIN
  WITH matched AS (
    UPDATE formalizacao f SET
      demanda = CASE WHEN e.detalhes IS NOT NULL AND TRIM(e.detalhes) != '' THEN e.detalhes ELSE f.demanda END,
      classificacao_emenda_demanda = CASE WHEN e.natureza IS NOT NULL AND TRIM(e.natureza) != '' THEN e.natureza ELSE f.classificacao_emenda_demanda END,
      ano = CASE WHEN e.ano_refer IS NOT NULL AND TRIM(e.ano_refer) != '' THEN e.ano_refer ELSE f.ano END,
      emendas_agregadoras = CASE WHEN e.num_emenda IS NOT NULL AND TRIM(e.num_emenda) != '' THEN e.num_emenda ELSE f.emendas_agregadoras END,
      situacao_demandas_sempapel = CASE WHEN e.situacao_d IS NOT NULL AND TRIM(e.situacao_d) != '' THEN e.situacao_d ELSE f.situacao_demandas_sempapel END,
      parlamentar = CASE WHEN e.parlamentar IS NOT NULL AND TRIM(e.parlamentar) != '' THEN e.parlamentar ELSE f.parlamentar END,
      partido = CASE WHEN e.partido IS NOT NULL AND TRIM(e.partido) != '' THEN e.partido ELSE f.partido END,
      conveniado = CASE WHEN e.beneficiario IS NOT NULL AND TRIM(e.beneficiario) != '' THEN e.beneficiario ELSE f.conveniado END,
      municipio = CASE WHEN e.municipio IS NOT NULL AND TRIM(e.municipio) != '' THEN e.municipio ELSE f.municipio END,
      objeto = CASE WHEN e.objeto IS NOT NULL AND TRIM(e.objeto) != '' THEN e.objeto ELSE f.objeto END,
      regional = CASE WHEN e.regional IS NOT NULL AND TRIM(e.regional) != '' THEN e.regional ELSE f.regional END,
      portfolio = CASE WHEN e.portfolio IS NOT NULL AND TRIM(e.portfolio) != '' THEN e.portfolio ELSE f.portfolio END,
      numero_convenio = CASE WHEN e.num_convenio IS NOT NULL AND TRIM(e.num_convenio) != '' THEN e.num_convenio ELSE f.numero_convenio END,
      valor = CASE WHEN e.valor IS NOT NULL THEN e.valor ELSE f.valor END
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
-- Agora inclui também situacao_demandas_sempapel e emendas_agregadoras
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
      classificacao_emenda_demanda, emendas_agregadoras,
      situacao_demandas_sempapel, numero_convenio, regional,
      municipio, conveniado, objeto, portfolio, valor
    )
    SELECT
      e.ano_refer, e.parlamentar, e.partido, e.codigo_num, e.detalhes,
      e.natureza, e.num_emenda,
      e.situacao_d, e.num_convenio, e.regional,
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
