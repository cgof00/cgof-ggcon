-- Script para limpar dados inválidos da tabela formalizacao
-- Remove: #N/D, -, 0 (quando são lixo e não dados reais)
-- Execute no Supabase SQL Editor

-- Lista de colunas de texto a limpar
DO $$
DECLARE
  col_name TEXT;
  cols TEXT[] := ARRAY[
    'parlamentar', 'partido', 'emenda', 'emendas_agregadoras',
    'demanda', 'demandas_formalizacao', 'classificacao_emenda_demanda',
    'tipo_formalizacao', 'regional', 'municipio', 'conveniado',
    'objeto', 'portfolio', 'posicao_anterior',
    'situacao_demandas_sempapel', 'area_estagio', 'recurso',
    'tecnico', 'data_liberacao', 'area_estagio_situacao_demanda',
    'situacao_analise_demanda', 'data_analise_demanda',
    'motivo_retorno_diligencia', 'data_retorno_diligencia',
    'conferencista', 'data_recebimento_demanda', 'data_retorno',
    'observacao_motivo_retorno', 'data_liberacao_assinatura_conferencista',
    'data_liberacao_assinatura', 'falta_assinatura', 'assinatura',
    'publicacao', 'vigencia', 'encaminhado_em', 'concluida_em'
  ];
  total_updated INT := 0;
  row_count INT;
BEGIN
  FOREACH col_name IN ARRAY cols LOOP
    -- Substituir #N/D, #N/A, #REF!, #VALOR!, - (sozinho), 0 (sozinho) por NULL
    EXECUTE format(
      'UPDATE formalizacao SET %I = NULL WHERE TRIM(%I) IN (''#N/D'', ''#N/A'', ''#REF!'', ''#VALOR!'', ''-'', ''0'', ''#DIV/0!'', ''N/D'', ''n/d'')',
      col_name, col_name
    );
    GET DIAGNOSTICS row_count = ROW_COUNT;
    IF row_count > 0 THEN
      RAISE NOTICE 'Coluna %: % registros limpos', col_name, row_count;
      total_updated := total_updated + row_count;
    END IF;
  END LOOP;
  RAISE NOTICE '===== TOTAL: % campos limpos =====', total_updated;
END $$;

-- Verificar resultado
SELECT 'Limpeza concluída!' AS status;
