-- ============================================================================
-- 🚀 NOVA ABORDAGEM: Sincronização INCREMENTAL (Simples e Eficiente)
-- ============================================================================
-- Lógica:
-- 1. Pega o ÚLTIMO código de emenda já importado na tabela formalizacao
-- 2. Procura TODAS as emendas POSTERIORES a este código na tabela emendas
-- 3. Insere as novas emendas na formalizacao com colunas respectivas
-- 4. Atualiza situacao_emenda com o valor de situacao_sempapel
-- ============================================================================

DROP FUNCTION IF EXISTS sync_incremental() CASCADE;

CREATE OR REPLACE FUNCTION sync_incremental()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET statement_timeout = '120s'
AS $$
DECLARE 
  v_ultimo_codigo VARCHAR := '';
  v_ultimo_num NUMERIC := -1;
  v_inserted INTEGER := 0;
  v_updated INTEGER := 0;
BEGIN
  -- PASSO 1: Obter a MAIOR emenda já importada (não depende da ordem física/id)
  -- Normaliza removendo tudo que não é dígito e ordena numericamente.
  SELECT COALESCE(f.emenda, '')
  INTO v_ultimo_codigo
  FROM formalizacao f
  WHERE NULLIF(REGEXP_REPLACE(COALESCE(f.emenda, ''), '[^0-9]', '', 'g'), '') IS NOT NULL
  ORDER BY (REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g'))::NUMERIC DESC, f.id DESC
  LIMIT 1;

  RAISE NOTICE 'Último código importado: %', COALESCE(v_ultimo_codigo, '[NENHUM]');

  -- Normalizar para comparar de forma segura (remove pontos/traços e compara numericamente)
  v_ultimo_num := COALESCE(NULLIF(REGEXP_REPLACE(COALESCE(v_ultimo_codigo, ''), '[^0-9]', '', 'g'), '')::NUMERIC, -1);

  -- PASSO 2: "PROCX" (VLOOKUP) - Atualizar situação em TODA a formalização
  WITH upd AS (
    UPDATE formalizacao f
    SET
      situacao_demandas_sempapel = COALESCE(NULLIF(TRIM(e.situacao_d), ''), f.situacao_demandas_sempapel),
      updated_at = NOW()
    FROM emendas e
    WHERE
      NULLIF(REGEXP_REPLACE(COALESCE(f.emenda, ''), '[^0-9]', '', 'g'), '')
        = NULLIF(REGEXP_REPLACE(COALESCE(e.codigo_num, ''), '[^0-9]', '', 'g'), '')
      AND NULLIF(TRIM(COALESCE(e.situacao_d, '')), '') IS NOT NULL
    RETURNING f.id
  )
  SELECT COUNT(*) INTO v_updated FROM upd;

  -- PASSO 3: Inserir TODAS as emendas novas (posteriores ao último código)
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
      -- Remove caracteres de controle da natureza
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
    WHERE
      -- Comparação numérica normalizada (só dígitos) para garantir ordem correta
      COALESCE(NULLIF(REGEXP_REPLACE(COALESCE(e.codigo_num, ''), '[^0-9]', '', 'g'), '')::NUMERIC, -1) > v_ultimo_num
      -- Garantir que tem código válido
      AND e.codigo_num IS NOT NULL
      AND TRIM(e.codigo_num) != ''
      -- Evitar duplicatas por emenda (normalizado)
      AND NOT EXISTS (
        SELECT 1 FROM formalizacao f
        WHERE NULLIF(REGEXP_REPLACE(COALESCE(f.emenda, ''), '[^0-9]', '', 'g'), '')
          = NULLIF(REGEXP_REPLACE(COALESCE(e.codigo_num, ''), '[^0-9]', '', 'g'), '')
      )
      -- Evitar duplicatas por convênio (se existir)
      AND (
        NULLIF(TRIM(COALESCE(e.num_convenio, '')), '') IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM formalizacao f2
          WHERE TRIM(COALESCE(f2.numero_convenio, '')) = TRIM(COALESCE(e.num_convenio, ''))
        )
      )
    -- Ordenar por código para inserir na sequência correta
    ORDER BY COALESCE(NULLIF(REGEXP_REPLACE(COALESCE(e.codigo_num, ''), '[^0-9]', '', 'g'), '')::NUMERIC, -1) ASC
    RETURNING id
  )
  SELECT COUNT(*) INTO v_inserted FROM novas_emendas;

  RAISE NOTICE 'Emendas inseridas: %', v_inserted;

  -- PASSO 3: Retornar resultado
  RETURN json_build_object(
    'status', 'success',
    'inserted', v_inserted,
    'updated', v_updated,
    'ultimo_codigo', v_ultimo_codigo,
    'message', CASE 
      WHEN v_inserted = 0 AND v_updated = 0 THEN 'Nenhuma emenda nova e nenhuma atualização de situação'
      WHEN v_inserted = 0 THEN v_updated || ' formalizações tiveram situação atualizada'
      WHEN v_updated = 0 THEN v_inserted || ' novas emendas foram sincronizadas'
      ELSE v_inserted || ' novas emendas + ' || v_updated || ' situações atualizadas'
    END
  );

END;
$$;

-- ============================================================================
-- TESTE: Executar a função
-- ============================================================================
-- SELECT sync_incremental();

-- Verificar quantas emendas foram inseridas
-- SELECT COUNT(*) FROM formalizacao;
