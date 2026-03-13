-- ============================================================
-- PASSO 2A: COPIAR formalizacao_import → formalizacao
-- Execute PRIMEIRO, depois de carregar o CSV na formalizacao_import
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'formalizacao_import') THEN
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
      CASE
        WHEN "Emenda" ~ ''[Ee][+]'' THEN
          REGEXP_REPLACE(
            LPAD(REPLACE("Emenda", '','', ''.'')::NUMERIC::BIGINT::TEXT, 12, ''0''),
            ''(\d{4})(\d{3})(\d{5})'',
            ''\1.\2.\3''
          )
        WHEN "Emenda" ~ ''^\d{12}$'' THEN
          REGEXP_REPLACE("Emenda", ''(\d{4})(\d{3})(\d{5})'', ''\1.\2.\3'')
        ELSE "Emenda"
      END,
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
      CASE WHEN "Valor" ~ ''^[0-9.,]+$'' THEN REPLACE(REPLACE("Valor", ''.'', ''''), '','', ''.'')::NUMERIC ELSE NULL END,
      "Posição Anterior",
      "Situação Demandas - SemPapel",
      "Área - estágio",
      "Recurso",
      "Tecnico",
      "Data da Liberação",
      "Área - Estágio Situação da Demanda",
      "Situação - Análise Demanda",
      "Data - Análise Demanda",
      "Motivo do Retorno da Diligência",
      "Data do Retorno da Diligência",
      "Conferencista",
      "Data recebimento demanda",
      "Data do Retorno",
      "Observação - Motivo do Retorno",
      "Data liberação da Assinatura - Conferencista",
      "Data liberação de Assinatura",
      "Falta assinatura",
      "Assinatura",
      "Publicação",
      "Vigência",
      "Encaminhado em",
      "Concluída em"
    FROM formalizacao_import';
    RAISE NOTICE '✅ formalizacao_import copiado para formalizacao';
    DROP TABLE IF EXISTS formalizacao_import;
  ELSE
    RAISE NOTICE '⏭️ tabela formalizacao_import não existe, pulando';
  END IF;
END $$;

-- ÍNDICES PARA PERFORMANCE
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
