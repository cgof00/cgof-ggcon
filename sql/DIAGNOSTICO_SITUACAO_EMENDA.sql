-- ============================================================
-- DIAGNÓSTICO: Cobertura do campo situacao_emenda
-- Execute no Supabase SQL Editor para entender por que
-- apenas ~13534 registros foram preenchidos.
-- ============================================================

-- 1) Resumo geral
SELECT
  COUNT(*)                                                                            AS total_formalizacao,
  COUNT(*) FILTER (WHERE situacao_emenda IS NOT NULL AND situacao_emenda != '')       AS com_situacao_emenda,
  COUNT(*) FILTER (WHERE situacao_emenda IS NULL OR situacao_emenda = '')            AS sem_situacao_emenda,
  COUNT(*) FILTER (WHERE numero_convenio IS NOT NULL AND numero_convenio != '')      AS tem_numero_convenio,
  COUNT(*) FILTER (WHERE emenda IS NOT NULL AND emenda != '')                        AS tem_emenda,
  COUNT(*) FILTER (WHERE emendas_agregadoras IS NOT NULL AND emendas_agregadoras != '') AS tem_emendas_agregadoras
FROM public.formalizacao;

-- 2) Quantas emendas têm situacao_e preenchido
SELECT
  COUNT(*)                                                              AS total_emendas,
  COUNT(*) FILTER (WHERE situacao_e IS NOT NULL AND situacao_e != '') AS com_situacao_e,
  COUNT(*) FILTER (WHERE num_convenio IS NOT NULL AND num_convenio != '') AS tem_num_convenio,
  COUNT(*) FILTER (WHERE codigo_num IS NOT NULL AND codigo_num != '')     AS tem_codigo_num,
  COUNT(*) FILTER (WHERE num_emenda IS NOT NULL AND num_emenda != '')     AS tem_num_emenda
FROM public.emendas;

-- 3) Cobertura por cada chave de join (quantos formalizacao seriam atingidos)
-- 3A) Por numero_convenio
SELECT '3A - Por numero_convenio' AS estrategia, COUNT(DISTINCT f.id) AS formalizacao_atingidos
FROM public.formalizacao f
JOIN public.emendas e
  ON TRIM(COALESCE(f.numero_convenio,'')) = TRIM(COALESCE(e.num_convenio,''))
WHERE TRIM(COALESCE(f.numero_convenio,'')) != ''
  AND NULLIF(TRIM(e.situacao_e),'') IS NOT NULL

UNION ALL

-- 3B) Por codigo_num (dígitos)
SELECT '3B - Por codigo_num digits', COUNT(DISTINCT f.id)
FROM public.formalizacao f
JOIN public.emendas e
  ON REGEXP_REPLACE(COALESCE(f.emenda,''), '[^0-9]', '', 'g')
   = REGEXP_REPLACE(COALESCE(e.codigo_num,''), '[^0-9]', '', 'g')
WHERE LENGTH(REGEXP_REPLACE(COALESCE(f.emenda,''), '[^0-9]', '', 'g')) >= 6
  AND NULLIF(TRIM(e.situacao_e),'') IS NOT NULL

UNION ALL

-- 3C) Por num_emenda / emendas_agregadoras
SELECT '3C - Por num_emenda/emendas_agregadoras', COUNT(DISTINCT f.id)
FROM public.formalizacao f
JOIN public.emendas e
  ON TRIM(COALESCE(f.emendas_agregadoras,'')) = TRIM(COALESCE(e.num_emenda,''))
WHERE TRIM(COALESCE(f.emendas_agregadoras,'')) != ''
  AND NULLIF(TRIM(e.situacao_e),'') IS NOT NULL

UNION ALL

-- 3D) TOTAL que seria coberto (UNION das 3 estratégias)
SELECT '3D - TOTAL coberto (A+B+C)', COUNT(DISTINCT f.id)
FROM public.formalizacao f
WHERE EXISTS (
  SELECT 1 FROM public.emendas e
  WHERE NULLIF(TRIM(e.situacao_e),'') IS NOT NULL
    AND (
      (TRIM(COALESCE(f.numero_convenio,'')) != '' AND TRIM(f.numero_convenio) = TRIM(e.num_convenio))
      OR
      (LENGTH(REGEXP_REPLACE(COALESCE(f.emenda,''), '[^0-9]', '', 'g')) >= 6
        AND REGEXP_REPLACE(f.emenda, '[^0-9]', '', 'g') = REGEXP_REPLACE(e.codigo_num, '[^0-9]', '', 'g'))
      OR
      (TRIM(COALESCE(f.emendas_agregadoras,'')) != ''
        AND TRIM(f.emendas_agregadoras) = TRIM(e.num_emenda))
    )
);

-- 4) Exemplos de formalizacao SEM situacao_emenda e suas chaves
--    (mostra as primeiras 20 linhas sem situacao_emenda para inspecionar)
SELECT
  f.id,
  f.emenda,
  f.emendas_agregadoras,
  f.numero_convenio,
  f.ano,
  f.parlamentar
FROM public.formalizacao f
WHERE f.situacao_emenda IS NULL OR f.situacao_emenda = ''
ORDER BY f.id
LIMIT 20;

-- 5) Distribuição dos valores de situacao_emenda preenchidos
SELECT situacao_emenda, COUNT(*) AS qtd
FROM public.formalizacao
WHERE situacao_emenda IS NOT NULL AND situacao_emenda != ''
GROUP BY situacao_emenda
ORDER BY qtd DESC;
