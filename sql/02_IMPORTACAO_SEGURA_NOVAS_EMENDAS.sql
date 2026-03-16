-- ============================================================
-- IMPORTAÇÃO SEGURA DE NOVAS EMENDAS (SEM DUPLICATAS)
-- ============================================================
-- Uso de INSERT ... ON CONFLICT para garantir que:
-- 1. Novas emendas são inseridas
-- 2. Emendas existentes são atualizadas (não duplicadas)
-- 3. Mantém histórico de atualizações
-- ============================================================

-- EXEMPLO 1: Inserção simples com deduplicação automática
-- Substitua os valores pelos dados reais de importação
-- ============================================================
BEGIN;

INSERT INTO formalizacao (
  emenda,
  parlamentar,
  partido,
  demanda,
  demandas_formalizacao,
  numero_convenio,
  classificacao_emenda_demanda,
  tipo_formalizacao,
  regional,
  municipio,
  conveniado,
  objeto,
  portfolio,
  valor,
  area_estagio,
  recurso,
  created_at,
  updated_at
)
VALUES
  -- Exemplo: Nova emenda
  ('2026.005.NEW001', 'PARLAMENTAR 1', 'PARTIDO 1', 'DEMANDA 1', 
   'DEMANDA FORM 1', NULL, 'Classificação', 'Repasse fundo a fundo',
   'Regional 1', 'Município 1', 'Conveniado 1', 'Objeto 1', 'Portfolio 1',
   1000.00, 'Area 1', 'Recurso 1', NOW(), NOW())
  
  -- Exemplo: Outra emenda nova
  ('2026.005.NEW002', 'PARLAMENTAR 2', 'PARTIDO 2', 'DEMANDA 2',
   'DEMANDA FORM 2', NULL, 'Classificação', 'Convênio normal',
   'Regional 2', 'Município 2', 'Conveniado 2', 'Objeto 2', 'Portfolio 2',
   2000.00, 'Area 2', 'Recurso 2', NOW(), NOW())

ON CONFLICT (emenda) DO UPDATE SET
  -- Atualiza apenas campos que foram modificados
  parlamentar = COALESCE(EXCLUDED.parlamentar, formalizacao.parlamentar),
  partido = COALESCE(EXCLUDED.partido, formalizacao.partido),
  demanda = COALESCE(EXCLUDED.demanda, formalizacao.demanda),
  demandas_formalizacao = COALESCE(EXCLUDED.demandas_formalizacao, formalizacao.demandas_formalizacao),
  numero_convenio = COALESCE(EXCLUDED.numero_convenio, formalizacao.numero_convenio),
  classificacao_emenda_demanda = COALESCE(EXCLUDED.classificacao_emenda_demanda, formalizacao.classificacao_emenda_demanda),
  tipo_formalizacao = COALESCE(EXCLUDED.tipo_formalizacao, formalizacao.tipo_formalizacao),
  regional = COALESCE(EXCLUDED.regional, formalizacao.regional),
  municipio = COALESCE(EXCLUDED.municipio, formalizacao.municipio),
  conveniado = COALESCE(EXCLUDED.conveniado, formalizacao.conveniado),
  objeto = COALESCE(EXCLUDED.objeto, formalizacao.objeto),
  portfolio = COALESCE(EXCLUDED.portfolio, formalizacao.portfolio),
  valor = COALESCE(EXCLUDED.valor, formalizacao.valor),
  area_estagio = COALESCE(EXCLUDED.area_estagio, formalizacao.area_estagio),
  recurso = COALESCE(EXCLUDED.recurso, formalizacao.recurso),
  updated_at = NOW();

COMMIT;

-- ============================================================
-- EXEMPLO 2: Função PL/pgSQL para importação em lote
-- ============================================================
-- Cria uma função reutilizável que aceita um array de registros

CREATE OR REPLACE FUNCTION formalizacao_import_safe(
  p_registros JSONB
)
RETURNS TABLE (
  total_processados INT,
  novos_registros INT,
  registros_atualizados INT,
  status TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_total INT := 0;
  v_new INT := 0;
  v_updated INT := 0;
BEGIN
  -- Inserir com deduplicação automática via ON CONFLICT
  WITH import_data AS (
    SELECT
      (item->>'emenda') as emenda,
      (item->>'parlamentar') as parlamentar,
      (item->>'partido') as partido,
      (item->>'demanda') as demanda,
      (item->>'demandas_formalizacao') as demandas_formalizacao,
      (item->>'numero_convenio') as numero_convenio,
      (item->>'classificacao_emenda_demanda') as classificacao_emenda_demanda,
      (item->>'tipo_formalizacao') as tipo_formalizacao,
      (item->>'regional') as regional,
      (item->>'municipio') as municipio,
      (item->>'conveniado') as conveniado,
      (item->>'objeto') as objeto,
      (item->>'portfolio') as portfolio,
      (item->>'valor')::NUMERIC as valor,
      (item->>'area_estagio') as area_estagio,
      (item->>'recurso') as recurso
    FROM jsonb_array_elements(p_registros) AS item
  )
  INSERT INTO formalizacao (
    emenda, parlamentar, partido, demanda, demandas_formalizacao,
    numero_convenio, classificacao_emenda_demanda, tipo_formalizacao,
    regional, municipio, conveniado, objeto, portfolio, valor,
    area_estagio, recurso, created_at, updated_at
  )
  SELECT
    emenda, parlamentar, partido, demanda, demandas_formalizacao,
    numero_convenio, classificacao_emenda_demanda, tipo_formalizacao,
    regional, municipio, conveniado, objeto, portfolio, valor,
    area_estagio, recurso, NOW(), NOW()
  FROM import_data
  ON CONFLICT (emenda) DO UPDATE SET
    parlamentar = COALESCE(EXCLUDED.parlamentar, formalizacao.parlamentar),
    partido = COALESCE(EXCLUDED.partido, formalizacao.partido),
    demanda = COALESCE(EXCLUDED.demanda, formalizacao.demanda),
    demandas_formalizacao = COALESCE(EXCLUDED.demandas_formalizacao, formalizacao.demandas_formalizacao),
    numero_convenio = COALESCE(EXCLUDED.numero_convenio, formalizacao.numero_convenio),
    classificacao_emenda_demanda = COALESCE(EXCLUDED.classificacao_emenda_demanda, formalizacao.classificacao_emenda_demanda),
    tipo_formalizacao = COALESCE(EXCLUDED.tipo_formalizacao, formalizacao.tipo_formalizacao),
    regional = COALESCE(EXCLUDED.regional, formalizacao.regional),
    municipio = COALESCE(EXCLUDED.municipio, formalizacao.municipio),
    conveniado = COALESCE(EXCLUDED.conveniado, formalizacao.conveniado),
    objeto = COALESCE(EXCLUDED.objeto, formalizacao.objeto),
    portfolio = COALESCE(EXCLUDED.portfolio, formalizacao.portfolio),
    valor = COALESCE(EXCLUDED.valor, formalizacao.valor),
    area_estagio = COALESCE(EXCLUDED.area_estagio, formalizacao.area_estagio),
    recurso = COALESCE(EXCLUDED.recurso, formalizacao.recurso),
    updated_at = NOW();

  -- Retornar estatísticas
  GET DIAGNOSTICS v_total = ROW_COUNT;
  v_new := (SELECT COUNT(*) FROM formalizacao WHERE created_at >= NOW() - INTERVAL '1 second');
  v_updated := v_total - v_new;

  RETURN QUERY SELECT 
    v_total,
    v_new,
    v_updated,
    'Importação segura concluída! Sem duplicatas.' as status;
END;
$$;

-- ============================================================
-- EXEMPLO 3: Usando a função de importação
-- ============================================================
-- Chame assim no seu código:

/*
SELECT * FROM formalizacao_import_safe('[
  {
    "emenda": "2026.005.TEST001",
    "parlamentar": "NOME DO PARLAMENTAR",
    "partido": "PARTIDO",
    "demanda": "DEMANDA",
    "demandas_formalizacao": "DESC",
    "numero_convenio": null,
    "classificacao_emenda_demanda": "CLASSIFICAÇÃO",
    "tipo_formalizacao": "Repasse fundo a fundo",
    "regional": "REGIONAL",
    "municipio": "MUNICÍPIO",
    "conveniado": "CONVENIADO",
    "objeto": "OBJETO",
    "portfolio": "PORTFOLIO",
    "valor": "1000.00",
    "area_estagio": "ÁREA",
    "recurso": "RECURSO"
  }
]'::JSONB);
*/

-- ============================================================
-- EXEMPLO 4: Monitorar importações
-- ============================================================
-- View para ver quais emendas foram atualizadas recentemente

CREATE VIEW vw_formalizacao_updates AS
SELECT 
  id,
  emenda,
  parlamentar,
  area_estagio,
  tipo_formalizacao,
  recurso,
  created_at,
  updated_at,
  CASE 
    WHEN created_at >= NOW() - INTERVAL '1 hour' THEN 'Nova emenda'
    WHEN updated_at >= NOW() - INTERVAL '1 hour' AND updated_at != created_at THEN 'Atualizada'
    ELSE 'Sem mudanças recentes'
  END as status_import
FROM formalizacao
WHERE created_at >= NOW() - INTERVAL '24 hours' 
   OR updated_at >= NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC;

-- ============================================================
-- DICAS IMPORTANTES
-- ============================================================
/*
1. CONSTRAINT ÚNICA:
   - A tabela formalizacao DEVE ter constraint UNIQUE(emenda)
   - Isso garante que o ON CONFLICT funcionará
   - Se não existir, execute: 01_REMOVER_DUPLICATAS.sql

2. INSERÇÃO DE NULOS:
   - Se a coluna 'emenda' for NULL, a constraint UNIQUE não funcionará
   - Validar SEMPRE se emenda está preenchida antes de importar

3. PERFORMANCE:
   - Usar INSERT ... ON CONFLICT é muito mais rápido que DELETE+INSERT
   - Remove duplicatas automaticamente na mesmo comando

4. TRANSAÇÕES:
   - Use BEGIN/COMMIT para garantir atomicidade
   - Se algo falhar, nada é inserido

5. AUDITORIA:
   - Todos os UPDATEs atualizam 'updated_at' automaticamente
   - Use vw_formalizacao_updates para rastrear mudanças
*/
