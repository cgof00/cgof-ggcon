-- ============================================================================
-- NOVA SOLUÇÃO: Sincronização SEGURA (apenas novas, sem duplicatas)
-- ============================================================================
-- Versão 2: Funções RPC otimizadas para evitar duplicação de registros
-- ============================================================================

-- 🎯 VERSÃO SIMPLIFICADA: INSERT ONLY - Apenas novas emendas
-- ============================================================
CREATE OR REPLACE FUNCTION sync_formalizacao_novas()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET statement_timeout = '120s'
AS $$
DECLARE v_inserted INTEGER := 0;
BEGIN
  WITH novas AS (
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
      -- 🎯 Verificar que a emenda NÃO existe no banco
      AND NOT EXISTS (
        SELECT 1 FROM formalizacao f 
        WHERE TRIM(COALESCE(f.emenda, '')) = TRIM(COALESCE(e.codigo_num, ''))
        AND TRIM(COALESCE(e.codigo_num, '')) != ''
      )
      -- 🎯 Se não encontrou por emenda, verificar por convenio
      AND NOT EXISTS (
        SELECT 1 FROM formalizacao f
        WHERE TRIM(COALESCE(f.numero_convenio, '')) = TRIM(COALESCE(e.num_convenio, ''))
        AND TRIM(COALESCE(e.num_convenio, '')) != ''
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_inserted FROM novas;
  RETURN json_build_object(
    'status', 'success',
    'inserted', v_inserted, 
    'message', 'Apenas emendas novas foram inseridas (sem duplicação)'
  );
END;
$$;

-- 🎯 ATUALIZAR SOMENTE (sem inserir duplicatas)
-- ============================================================
CREATE OR REPLACE FUNCTION sync_formalizacao_atualizar()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET statement_timeout = '120s'
AS $$
DECLARE v_updated INTEGER := 0;
BEGIN
  WITH updated_records AS (
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
      numero_convenio = CASE WHEN e.num_convenio IS NOT NULL AND TRIM(e.num_convenio) != '' THEN TRIM(e.num_convenio) ELSE f.numero_convenio END,
      valor = CASE WHEN e.valor IS NOT NULL THEN e.valor ELSE f.valor END
    FROM emendas e
    WHERE (
      -- Match por emenda/codigo_num
      (TRIM(f.emenda) = TRIM(e.codigo_num) AND TRIM(f.emenda) != '' AND TRIM(e.codigo_num) != '')
      OR
      -- Match por numero_convenio
      (TRIM(f.numero_convenio) = TRIM(e.num_convenio) AND TRIM(f.numero_convenio) != '' AND TRIM(e.num_convenio) != '')
    )
    RETURNING f.id
  )
  SELECT COUNT(*) INTO v_updated FROM updated_records;
  RETURN json_build_object(
    'status', 'success',
    'updated', v_updated,
    'message', 'Emendas existentes foram atualizadas'
  );
END;
$$;

-- ============================================================================
-- TESTE: Verificar resultado
-- ============================================================================
SELECT COUNT(*) FROM formalizacao;
SELECT COUNT(*) FROM emendas;

-- Histórico: antes e depois
-- SELECT COUNT(*) FROM formalizacao WHERE created_at > NOW() - interval '1 hour';
