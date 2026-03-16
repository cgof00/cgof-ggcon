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
  v_years TEXT[] := ARRAY['2023','2024','2025','2026'];
  v_inserted INTEGER := 0;
  v_updated INTEGER := 0;
BEGIN
  RAISE NOTICE 'Sync incremental por comparação total. Anos: %', array_to_string(v_years, ',');

  -- PASSO 1: Atualizar (incremental) apenas anos 2023-2026
  -- Match por emenda normalizada (só dígitos)
  WITH upd AS (
    UPDATE formalizacao f
    SET
      -- Atualizar colunas principais vindas da tabela emendas (sem apagar dados existentes)
      ano = COALESCE(NULLIF(TRIM(e.ano_refer), ''), f.ano),
      parlamentar = COALESCE(NULLIF(TRIM(e.parlamentar), ''), f.parlamentar),
      partido = COALESCE(NULLIF(TRIM(e.partido), ''), f.partido),
      demanda = COALESCE(NULLIF(TRIM(e.detalhes), ''), f.demanda),
      classificacao_emenda_demanda = COALESCE(
        NULLIF(TRIM(REGEXP_REPLACE(COALESCE(e.natureza,''), E'[\\x00-\\x1F\\x7F\\xA0]', '', 'g')), ''),
        f.classificacao_emenda_demanda
      ),
      emendas_agregadoras = COALESCE(NULLIF(TRIM(e.num_emenda), ''), f.emendas_agregadoras),
      numero_convenio = COALESCE(NULLIF(TRIM(e.num_convenio), ''), f.numero_convenio),
      regional = COALESCE(NULLIF(TRIM(e.regional), ''), f.regional),
      municipio = COALESCE(NULLIF(TRIM(e.municipio), ''), f.municipio),
      conveniado = COALESCE(NULLIF(TRIM(e.beneficiario), ''), f.conveniado),
      objeto = COALESCE(NULLIF(TRIM(e.objeto), ''), f.objeto),
      portfolio = COALESCE(NULLIF(TRIM(e.portfolio), ''), f.portfolio),
      valor = COALESCE(e.valor, f.valor),

      -- Regra A: atualizar situacao_demandas_sempapel = emendas.situacao_d
      situacao_demandas_sempapel = COALESCE(NULLIF(TRIM(e.situacao_d), ''), f.situacao_demandas_sempapel),
      updated_at = NOW()
    FROM emendas e
    WHERE
      NULLIF(REGEXP_REPLACE(COALESCE(f.emenda, ''), '[^0-9]', '', 'g'), '')
        = NULLIF(REGEXP_REPLACE(COALESCE(e.codigo_num, ''), '[^0-9]', '', 'g'), '')
      AND (
        TRIM(COALESCE(f.ano, '')) = ANY (v_years)
        OR TRIM(COALESCE(e.ano_refer, '')) = ANY (v_years)
      )
    RETURNING f.id
  )
  SELECT COUNT(*) INTO v_updated FROM upd;

  -- PASSO 2: Inserir TODAS as emendas novas que ainda NÃO existem na formalização
  -- Comparação total: emendas.codigo_num vs formalizacao.emenda (normalizado)
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
      -- Garantir que tem código válido
      e.codigo_num IS NOT NULL
      AND TRIM(e.codigo_num) != ''
      -- Garantir que o código tem pelo menos 1 dígito (normalização)
      AND NULLIF(REGEXP_REPLACE(COALESCE(e.codigo_num, ''), '[^0-9]', '', 'g'), '') IS NOT NULL
      -- Inserir apenas anos 2023-2026
      AND TRIM(COALESCE(e.ano_refer, '')) = ANY (v_years)
      -- Evitar duplicatas por emenda (normalizado)
      AND NOT EXISTS (
        SELECT 1 FROM formalizacao f
        WHERE NULLIF(REGEXP_REPLACE(COALESCE(f.emenda, ''), '[^0-9]', '', 'g'), '')
          = NULLIF(REGEXP_REPLACE(COALESCE(e.codigo_num, ''), '[^0-9]', '', 'g'), '')
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
    'years', v_years,
    'message', CASE 
      WHEN v_inserted = 0 AND v_updated = 0 THEN 'Nenhuma emenda nova e nenhuma atualização de situação'
      WHEN v_inserted = 0 THEN v_updated || ' formalizações (anos 2023-2026) atualizadas'
      WHEN v_updated = 0 THEN v_inserted || ' novas emendas (anos 2023-2026) inseridas'
      ELSE v_inserted || ' novas inseridas + ' || v_updated || ' atualizadas (anos 2023-2026)'
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
