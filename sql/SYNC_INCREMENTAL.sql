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
    WHERE TRIM(COALESCE(e.codigo_num, '')) > v_ultimo_codigo
      -- Garantir que tem código válido
      AND e.codigo_num IS NOT NULL
      AND TRIM(e.codigo_num) != ''
    -- Ordenar por código para inserir na sequência correta
    ORDER BY e.codigo_num ASC
    RETURNING id
  )
  SELECT COUNT(*) INTO v_inserted FROM novas_emendas;

  RAISE NOTICE 'Emendas inseridas: %', v_inserted;

  -- PASSO 3: Retornar resultado
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

-- ============================================================================
-- TESTE: Executar a função
-- ============================================================================
-- SELECT sync_incremental();

-- Verificar quantas emendas foram inseridas
-- SELECT COUNT(*) FROM formalizacao;
