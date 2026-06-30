-- ============================================================
-- PASSO 1: Criar tabela temporária para staging do CSV
-- Execute este SQL no Supabase SQL Editor ANTES de importar o CSV
-- ============================================================

-- Apagar staging anterior (se existir)
DROP TABLE IF EXISTS public.emendas_staging;

-- Criar tabela staging com MESMAS colunas do CSV
CREATE TABLE public.emendas_staging (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  detalhes TEXT,
  natureza TEXT,
  ano_refer TEXT,
  codigo_num TEXT,
  num_emenda TEXT,
  parecer_ld TEXT,
  situacao_e TEXT,
  situacao_d TEXT,
  data_ult_e TEXT,
  data_ult_d TEXT,
  num_indicacao TEXT,
  parlamentar TEXT,
  partido TEXT,
  tipo_beneficiario TEXT,
  beneficiario TEXT,
  cnpj TEXT,
  municipio TEXT,
  objeto TEXT,
  orgao_entidade TEXT,
  regional TEXT,
  num_convenio TEXT,
  num_processo TEXT,
  data_assinatura TEXT,
  data_publicacao TEXT,
  agencia TEXT,
  conta TEXT,
  valor NUMERIC,
  valor_desembolsado NUMERIC,
  portfolio TEXT,
  qtd_dias INTEGER,
  vigencia TEXT,
  data_prorrogacao TEXT,
  dados_bancarios TEXT,
  status TEXT,
  data_pagamento TEXT,
  num_codigo TEXT,
  notas_empenho TEXT,
  valor_total_empenhado NUMERIC,
  notas_liquidacao TEXT,
  valor_total_liquidado NUMERIC,
  programa TEXT,
  valor_total_pago NUMERIC,
  ordem_bancaria TEXT,
  data_paga TEXT,
  valor_total_ordem_bancaria NUMERIC
);

-- ============================================================
-- PASSO 2: Importar CSV no Supabase
-- 
-- 1. Vá em Table Editor → emendas_staging
-- 2. Clique em "Insert" → "Import data from CSV"
-- 3. Selecione o arquivo CSV
-- 4. O Supabase vai importar todos os registros
-- ============================================================


-- ============================================================
-- PASSO 3: Inserir SOMENTE as emendas novas na tabela emendas
-- Execute este SQL DEPOIS de importar o CSV no staging
-- ============================================================

-- Ver quantas emendas novas existem
SELECT 
  (SELECT COUNT(*) FROM emendas_staging) AS total_no_csv,
  (SELECT COUNT(*) FROM emendas_staging s 
   WHERE s.codigo_num IS NOT NULL 
   AND TRIM(s.codigo_num) != ''
   AND NOT EXISTS (
     SELECT 1 FROM emendas e 
     WHERE TRIM(e.codigo_num) = TRIM(s.codigo_num)
   )) AS novas_emendas,
  (SELECT COUNT(*) FROM emendas_staging s 
   WHERE s.codigo_num IS NOT NULL 
   AND TRIM(s.codigo_num) != ''
   AND EXISTS (
     SELECT 1 FROM emendas e 
     WHERE TRIM(e.codigo_num) = TRIM(s.codigo_num)
   )) AS ja_existem;


-- Inserir somente as NOVAS (codigo_num que não existe na tabela emendas)
INSERT INTO emendas (
  detalhes, natureza, ano_refer, codigo_num, num_emenda, parecer_ld,
  situacao_e, situacao_d, data_ult_e, data_ult_d, num_indicacao,
  parlamentar, partido, tipo_beneficiario, beneficiario, cnpj,
  municipio, objeto, orgao_entidade, regional, num_convenio,
  num_processo, data_assinatura, data_publicacao, agencia, conta,
  valor, valor_desembolsado, portfolio, qtd_dias, vigencia,
  data_prorrogacao, dados_bancarios, status, data_pagamento,
  num_codigo, notas_empenho, valor_total_empenhado, notas_liquidacao,
  valor_total_liquidado, programa, valor_total_pago, ordem_bancaria,
  data_paga, valor_total_ordem_bancaria
)
SELECT 
  s.detalhes, s.natureza, s.ano_refer, TRIM(s.codigo_num), s.num_emenda, s.parecer_ld,
  s.situacao_e, s.situacao_d, s.data_ult_e, s.data_ult_d, s.num_indicacao,
  s.parlamentar, s.partido, s.tipo_beneficiario, s.beneficiario, s.cnpj,
  s.municipio, s.objeto, s.orgao_entidade, s.regional, s.num_convenio,
  s.num_processo, s.data_assinatura, s.data_publicacao, s.agencia, s.conta,
  s.valor, s.valor_desembolsado, s.portfolio, s.qtd_dias, s.vigencia,
  s.data_prorrogacao, s.dados_bancarios, s.status, s.data_pagamento,
  s.num_codigo, s.notas_empenho, s.valor_total_empenhado, s.notas_liquidacao,
  s.valor_total_liquidado, s.programa, s.valor_total_pago, s.ordem_bancaria,
  s.data_paga, s.valor_total_ordem_bancaria
FROM emendas_staging s
WHERE s.codigo_num IS NOT NULL 
  AND TRIM(s.codigo_num) != ''
  AND NOT EXISTS (
    SELECT 1 FROM emendas e 
    WHERE TRIM(e.codigo_num) = TRIM(s.codigo_num)
  );


-- ============================================================
-- PASSO 4: Limpar tabela staging
-- ============================================================
DROP TABLE IF EXISTS public.emendas_staging;
