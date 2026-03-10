-- ============================================================
-- SCRIPT SQL PARA SUPABASE: Criar função de sincronização +
-- Normalizar coluna emenda entre as duas tabelas
-- Execute no Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- ============================================================
-- PARTE 1: NORMALIZAR FORMATO DA COLUNA EMENDA
-- A coluna 'emenda' na tabela formalizacao e 'codigo_num' na tabela emendas
-- podem ter formatos diferentes (espaços, zeros à esquerda, etc.)
-- Este script padroniza ambas para facilitar a sincronização.
-- ============================================================

-- 1.1 Ver exemplos atuais dos formatos (executar primeiro para diagnosticar)
SELECT 'formalizacao.emenda' as tabela, emenda as valor, LENGTH(emenda) as tamanho
FROM formalizacao
WHERE emenda IS NOT NULL AND emenda != ''
LIMIT 10;

SELECT 'emendas.codigo_num' as tabela, codigo_num as valor, LENGTH(codigo_num) as tamanho
FROM emendas
WHERE codigo_num IS NOT NULL AND codigo_num != ''
LIMIT 10;

-- 1.2 Normalizar: remover espaços extras, padronizar formato
-- Aplicar TRIM e remover espaços duplicados internos
UPDATE formalizacao
SET emenda = TRIM(REGEXP_REPLACE(emenda, '\s+', ' ', 'g'))
WHERE emenda IS NOT NULL AND emenda != '';

UPDATE emendas
SET codigo_num = TRIM(REGEXP_REPLACE(codigo_num, '\s+', ' ', 'g'))
WHERE codigo_num IS NOT NULL AND codigo_num != '';

-- 1.3 Normalizar numero_convenio / num_convenio também (usado na sincronização)
UPDATE formalizacao
SET numero_convenio = TRIM(REGEXP_REPLACE(numero_convenio, '\s+', ' ', 'g'))
WHERE numero_convenio IS NOT NULL AND numero_convenio != '';

UPDATE emendas
SET num_convenio = TRIM(REGEXP_REPLACE(num_convenio, '\s+', ' ', 'g'))
WHERE num_convenio IS NOT NULL AND num_convenio != '';

-- 1.4 Verificar matches após normalização
SELECT
  'Match por numero_convenio' as tipo,
  COUNT(*) as total
FROM formalizacao f
INNER JOIN emendas e ON TRIM(f.numero_convenio) = TRIM(e.num_convenio)
WHERE f.numero_convenio IS NOT NULL AND f.numero_convenio != ''
UNION ALL
SELECT
  'Match por emenda/codigo_num' as tipo,
  COUNT(*) as total
FROM formalizacao f
INNER JOIN emendas e ON TRIM(f.emenda) = TRIM(e.codigo_num)
WHERE f.emenda IS NOT NULL AND f.emenda != '';

-- ============================================================
-- PARTE 2: CRIAR CONSTRAINT UNIQUE NO codigo_num (para evitar duplicatas na importação)
-- ============================================================

-- Remover duplicatas antes de criar a constraint (manter a mais recente)
DELETE FROM emendas
WHERE id NOT IN (
  SELECT MAX(id) FROM emendas
  WHERE codigo_num IS NOT NULL AND codigo_num != ''
  GROUP BY codigo_num
)
AND codigo_num IS NOT NULL AND codigo_num != '';

-- Criar constraint unique (PostgREST usará isso com resolution=ignore-duplicates)
ALTER TABLE emendas ADD CONSTRAINT emendas_codigo_num_unique UNIQUE (codigo_num);

-- ============================================================
-- PARTE 3: CRIAR FUNÇÃO RPC PARA SINCRONIZAÇÃO
-- Esta função é chamada pelo endpoint /api/emendas/sync-formalizacao
-- ============================================================

CREATE OR REPLACE FUNCTION sync_emendas_formalizacao()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated INTEGER := 0;
  v_inserted INTEGER := 0;
BEGIN
  -- PASSO 1: Atualizar formalizações existentes que têm match por numero_convenio
  -- Só atualiza campos que estão vazios na formalização
  WITH matched AS (
    UPDATE formalizacao f SET
      demanda = COALESCE(NULLIF(f.demanda, ''), e.detalhes),
      classificacao_emenda_demanda = COALESCE(NULLIF(f.classificacao_emenda_demanda, ''), e.natureza),
      ano = COALESCE(NULLIF(f.ano, ''), e.ano_refer),
      emenda = COALESCE(NULLIF(f.emenda, ''), e.codigo_num),
      emendas_agregadoras = COALESCE(NULLIF(f.emendas_agregadoras, ''), e.num_emenda),
      situacao_demandas_sempapel = COALESCE(NULLIF(f.situacao_demandas_sempapel, ''), e.situacao_d),
      parlamentar = COALESCE(NULLIF(f.parlamentar, ''), e.parlamentar),
      partido = COALESCE(NULLIF(f.partido, ''), e.partido),
      conveniado = COALESCE(NULLIF(f.conveniado, ''), e.beneficiario),
      municipio = COALESCE(NULLIF(f.municipio, ''), e.municipio),
      objeto = COALESCE(NULLIF(f.objeto, ''), e.objeto),
      regional = COALESCE(NULLIF(f.regional, ''), e.regional),
      portfolio = COALESCE(NULLIF(f.portfolio, ''), e.portfolio),
      valor = COALESCE(f.valor, e.valor)
    FROM emendas e
    WHERE TRIM(f.numero_convenio) = TRIM(e.num_convenio)
      AND f.numero_convenio IS NOT NULL
      AND f.numero_convenio != ''
    RETURNING f.id
  )
  SELECT COUNT(*) INTO v_updated FROM matched;

  -- PASSO 2: Inserir emendas que não existem na formalização
  -- (emendas com num_convenio que não tem correspondência)
  WITH new_records AS (
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
    WHERE e.num_convenio IS NOT NULL
      AND e.num_convenio != ''
      AND NOT EXISTS (
        SELECT 1 FROM formalizacao f
        WHERE TRIM(f.numero_convenio) = TRIM(e.num_convenio)
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_inserted FROM new_records;

  RETURN json_build_object(
    'updated', v_updated,
    'inserted', v_inserted,
    'message', v_updated || ' formalizacoes atualizadas, ' || v_inserted || ' novas inseridas'
  );
END;
$$;

-- Dar permissão para o service_role executar a função
GRANT EXECUTE ON FUNCTION sync_emendas_formalizacao() TO service_role;

-- ============================================================
-- PARTE 4: VERIFICAÇÃO FINAL
-- ============================================================

-- Testar a função
SELECT sync_emendas_formalizacao();

-- Verificar totais
SELECT 'emendas' as tabela, COUNT(*) as total FROM emendas
UNION ALL
SELECT 'formalizacao' as tabela, COUNT(*) as total FROM formalizacao;
