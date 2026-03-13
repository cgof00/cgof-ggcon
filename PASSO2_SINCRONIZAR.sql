-- ============================================================
-- PASSO 2: COPIAR FORMALIZAÇÃO E SINCRONIZAR COM EMENDAS
-- Execute DEPOIS de carregar o CSV na formalizacao_import
-- ============================================================
-- ⚠️ A tabela EMENDAS NÃO é tocada aqui.
--    Emendas já foi atualizada pelo sistema (importação via interface).
-- ============================================================
-- Este script:
-- 1. Copia dados de formalizacao_import → formalizacao (mapeando cabeçalhos)
-- 2. Cria índices para performance
-- 3. Atualiza formalizações existentes com dados das emendas
-- 4. Insere emendas que não existem na formalização
-- 5. Cria uma função RPC para sync futuro (botão no sistema)
-- ============================================================

-- ============================================================
-- CONFIGURAÇÃO: Forçar datestyle DD/MM/YYYY para datas brasileiras
-- SEM ISSO, datas como 23/07/2024 falham (PostgreSQL tenta mês 23)
-- ============================================================
SET datestyle = 'ISO, DMY';

-- ============================================================
-- PASSO 2.0: COPIAR formalizacao_import → formalizacao (mapeamento)
-- O CSV foi importado na tabela formalizacao_import com cabeçalhos legíveis.
-- Agora copiamos para a tabela formalizacao com nomes técnicos.
-- ⚠️ Pula automaticamente se formalizacao_import não existir (re-execução)
-- ============================================================

DO $$
DECLARE cnt INTEGER;
BEGIN
  -- Configurar datestyle DMY dentro do bloco para garantir
  EXECUTE 'SET datestyle = ''ISO, DMY''';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'formalizacao_import') THEN
    -- Criar função auxiliar para conversão segura de datas (não quebra se formato é inválido)
    EXECUTE '
      CREATE OR REPLACE FUNCTION _safe_to_date(val TEXT) RETURNS DATE AS $fn$
      BEGIN
        IF val IS NULL OR TRIM(val) = '''' THEN RETURN NULL; END IF;
        RETURN TRIM(val)::DATE;
      EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
      END;
      $fn$ LANGUAGE plpgsql IMMUTABLE';

    EXECUTE '
    INSERT INTO formalizacao (
      seq, ano, parlamentar, partido, emenda, emendas_agregadoras,
      demanda, demandas_formalizacao, numero_convenio,
      classificacao_emenda_demanda, tipo_formalizacao,
      regional, municipio, conveniado, objeto, portfolio,
      valor, posicao_anterior, situacao_demandas_sempapel,
      area_estagio, recurso, tecnico, data_liberacao,
      area_estagio_situacao_demanda, situacao_analise_demanda,
      data_analise_demanda, motivo_retorno_diligencia,
      data_retorno_diligencia, conferencista,
      data_recebimento_demanda, data_retorno,
      observacao_motivo_retorno,
      data_liberacao_assinatura_conferencista,
      data_liberacao_assinatura, falta_assinatura,
      assinatura, publicacao, vigencia,
      encaminhado_em, concluida_em
    )
    SELECT
      "Seq",
      "Ano",
      "Parlamentar",
      "Partido",
      "Emenda",
      "Emendas Agregadoras",
      "Demanda",
      "DEMANDAS FORMALIZAÇÃO",
      "N° de Convênio",
      "Classificação Emenda/Demanda",
      "Tipo de Formalização",
      "Regional",
      "Município",
      "Conveniado",
      "Objeto",
      "Portfólio",
      CASE 
        WHEN TRIM(COALESCE("Valor", '''')) = '''' THEN NULL
        WHEN REGEXP_REPLACE("Valor", ''[^0-9.,]'', '''', ''g'') ~ ''^[0-9.,]+$'' 
        THEN REPLACE(REPLACE(REGEXP_REPLACE("Valor", ''[^0-9.,]'', '''', ''g''), ''.'', ''''), '','', ''.'')::NUMERIC 
        ELSE NULL 
      END,
      "Posição Anterior",
      "Situação Demandas - SemPapel",
      "Área - estágio",
      "Recurso",
      "Tecnico",
      _safe_to_date("Data da Liberação"),
      "Área - Estágio Situação da Demanda",
      "Situação - Análise Demanda",
      _safe_to_date("Data - Análise Demanda"),
      "Motivo do Retorno da Diligência",
      _safe_to_date("Data do Retorno da Diligência"),
      "Conferencista",
      _safe_to_date("Data recebimento demanda"),
      _safe_to_date("Data do Retorno"),
      "Observação - Motivo do Retorno",
      _safe_to_date("Data liberação da Assinatura - Conferencista"),
      _safe_to_date("Data liberação de Assinatura"),
      "Falta assinatura",
      "Assinatura",
      NULLIF(TRIM("Publicação"), ''''),
      NULLIF(TRIM("Vigência"), ''''),
      _safe_to_date("Encaminhado em"),
      _safe_to_date("Concluída em")
    FROM formalizacao_import';

    -- Contar quantos foram copiados
    EXECUTE 'SELECT COUNT(*) FROM formalizacao' INTO STRICT cnt;
    RAISE NOTICE '✅ PASSO 2.0: % registros copiados de formalizacao_import para formalizacao', cnt;
    
    DROP TABLE IF EXISTS formalizacao_import;
    DROP FUNCTION IF EXISTS _safe_to_date(TEXT);
  ELSE
    RAISE NOTICE '⏭️ PASSO 2.0: tabela formalizacao_import não existe, pulando';
  END IF;
END $$;

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_emendas_num_convenio ON emendas(num_convenio);
CREATE INDEX IF NOT EXISTS idx_emendas_codigo_num ON emendas(codigo_num);
CREATE INDEX IF NOT EXISTS idx_formalizacao_numero_convenio ON formalizacao(numero_convenio);
CREATE INDEX IF NOT EXISTS idx_formalizacao_emenda ON formalizacao(emenda);

-- Índices em expressões usadas nos JOINs (TRIM, REGEXP_REPLACE)
-- Sem estes, o PostgreSQL faz full table scan e causa statement timeout
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

-- ============================================================
-- MAPEAMENTO DE COLUNAS:
-- emendas.detalhes           → formalizacao.demanda
-- emendas.natureza           → formalizacao.classificacao_emenda_demanda
-- emendas.ano_refer          → formalizacao.ano
-- emendas.codigo_num         → formalizacao.emenda
-- emendas.num_emenda         → formalizacao.emendas_agregadoras
-- emendas.situacao_d         → formalizacao.situacao_demandas_sempapel
-- emendas.parlamentar        → formalizacao.parlamentar
-- emendas.partido            → formalizacao.partido
-- emendas.beneficiario       → formalizacao.conveniado
-- emendas.municipio          → formalizacao.municipio
-- emendas.objeto             → formalizacao.objeto
-- emendas.regional           → formalizacao.regional
-- emendas.num_convenio       → formalizacao.numero_convenio
-- emendas.valor              → formalizacao.valor
-- emendas.portfolio          → formalizacao.portfolio
-- ============================================================

-- ============================================================
-- PASSO 2A: ATUALIZAR formalizações que TÊM MATCH por numero_convenio
-- Só preenche campos que estão vazios/nulos na formalização
-- ============================================================

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
  AND f.numero_convenio IS NOT NULL
  AND TRIM(f.numero_convenio) != '';

-- Conferir quantos foram atualizados por numero_convenio
DO $$
DECLARE cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM formalizacao f
  INNER JOIN emendas e ON TRIM(f.numero_convenio) = TRIM(e.num_convenio)
  WHERE f.numero_convenio IS NOT NULL AND TRIM(f.numero_convenio) != '';
  RAISE NOTICE '✅ PASSO 2A: % formalizações com match por numero_convenio', cnt;
END $$;

-- ============================================================
-- PASSO 2B: ATUALIZAR formalizações por match de EMENDA/CODIGO_NUM
-- (para registros que não foram encontrados pelo numero_convenio)
-- Compara apenas os dígitos numéricos
-- ============================================================

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
  AND f.emenda IS NOT NULL
  AND TRIM(f.emenda) != ''
  AND LENGTH(REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g')) >= 8
  -- Não atualizar as que já foram atualizadas pelo paso 2A
  AND (f.numero_convenio IS NULL OR TRIM(f.numero_convenio) = '' 
       OR NOT EXISTS (
         SELECT 1 FROM emendas e2 
         WHERE TRIM(f.numero_convenio) = TRIM(e2.num_convenio)
       ));

-- Conferir quantos foram atualizados por emenda
DO $$
DECLARE cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM formalizacao f
  INNER JOIN emendas e ON REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g') = REGEXP_REPLACE(e.codigo_num, '[^0-9]', '', 'g')
  WHERE f.emenda IS NOT NULL AND TRIM(f.emenda) != ''
    AND LENGTH(REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g')) >= 8;
  RAISE NOTICE '✅ PASSO 2B: % formalizações com match por emenda/codigo_num', cnt;
END $$;

-- ============================================================
-- PASSO 2C: INSERIR emendas que NÃO existem na formalização
-- ============================================================

INSERT INTO formalizacao (
  ano, parlamentar, partido, emenda, demanda,
  classificacao_emenda_demanda, numero_convenio,
  regional, municipio, conveniado, objeto,
  portfolio, valor
)
SELECT
  e.ano_refer,
  e.parlamentar,
  e.partido,
  e.codigo_num,
  e.detalhes,
  e.natureza,
  e.num_convenio,
  e.regional,
  e.municipio,
  e.beneficiario,
  e.objeto,
  e.portfolio,
  e.valor
FROM emendas e
WHERE NOT EXISTS (
  SELECT 1 FROM formalizacao f
  WHERE TRIM(f.numero_convenio) = TRIM(e.num_convenio)
    AND e.num_convenio IS NOT NULL AND TRIM(e.num_convenio) != ''
)
AND NOT EXISTS (
  SELECT 1 FROM formalizacao f
  WHERE LENGTH(REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g')) >= 8
    AND REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g') = REGEXP_REPLACE(e.codigo_num, '[^0-9]', '', 'g')
    AND e.codigo_num IS NOT NULL AND TRIM(e.codigo_num) != ''
);

-- ============================================================
-- RESUMO FINAL
-- ============================================================

SELECT 
  'formalizacao' as tabela, 
  COUNT(*) as total_registros 
FROM formalizacao
UNION ALL
SELECT 
  'emendas' as tabela, 
  COUNT(*) as total_registros 
FROM emendas;

-- ============================================================
-- FUNÇÃO RPC PARA SYNC FUTURO (chamada pelo botão no sistema)
-- ============================================================

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
  -- Atualizar por numero_convenio
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

  -- Atualizar por emenda/codigo_num
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

  -- Inserir novas
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

-- ============================================================
-- PRONTO! A formalização agora tem todos os dados das emendas.
-- O sistema mostra apenas a aba Formalização.
-- Para re-sincronizar no futuro, use o botão no sistema ou:
--   SELECT sync_emendas_formalizacao();
-- ============================================================
