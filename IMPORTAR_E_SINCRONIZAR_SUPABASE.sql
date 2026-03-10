-- ============================================================
-- SCRIPT SQL PARA IMPORTAÇÃO DE EMENDAS E SINCRONIZAÇÃO COM FORMALIZAÇÃO
-- Execute diretamente no Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- ============================================================
-- PARTE 1: PREPARAÇÃO - Verificar estrutura atual
-- ============================================================

-- 1.1 Verificar quantos registros existem em cada tabela
SELECT 'emendas' as tabela, COUNT(*) as total FROM emendas
UNION ALL
SELECT 'formalizacao' as tabela, COUNT(*) as total FROM formalizacao;

-- ============================================================
-- PARTE 2: IMPORTAR CSV NO SUPABASE
-- ============================================================
-- ⚠️ INSTRUÇÕES PARA IMPORTAR O CSV:
--
-- OPÇÃO A - Via Dashboard do Supabase (RECOMENDADO para 34k+ linhas):
--   1. Acesse: https://supabase.com/dashboard → seu projeto → Table Editor
--   2. Clique na tabela "emendas"
--   3. Clique "Insert" → "Import data from CSV"
--   4. Selecione o arquivo "emendas-import.csv"
--   5. Configure: Delimiter = ";" (ponto e vírgula)
--   6. Mapeie as colunas conforme a tabela abaixo
--   7. Clique "Import"
--
-- OPÇÃO B - Via API REST (para arquivos grandes, use o script import-emendas.ts):
--   npx tsx import-emendas.ts
--
-- MAPEAMENTO DE COLUNAS (CSV → Banco):
-- ┌─────────────────────────────────────────────────────────────┬──────────────────────────┐
-- │ Coluna CSV                                                  │ Coluna BD (emendas)      │
-- ├─────────────────────────────────────────────────────────────┼──────────────────────────┤
-- │ Detalhes da Demanda                                         │ detalhes                 │
-- │ Natureza                                                    │ natureza                 │
-- │ Ano Referência                                              │ ano_refer                │
-- │ Código/Nº Emenda                                            │ codigo_num               │
-- │ Nº Emenda Agregadora                                        │ num_emenda               │
-- │ Parecer LDO                                                 │ parecer_ld               │
-- │ Situação Emenda                                             │ situacao_e               │
-- │ Situação Demanda                                            │ situacao_d               │
-- │ Data da Última Tramitação Emenda                            │ data_ult_e               │
-- │ Data da Última Tramitação Demanda                           │ data_ult_d               │
-- │ Nº da Indicação                                             │ num_indicacao            │
-- │ Parlamentar                                                 │ parlamentar              │
-- │ Partido                                                     │ partido                  │
-- │ Tipo Beneficiário                                           │ tipo_beneficiario        │
-- │ Beneficiário                                                │ beneficiario             │
-- │ CNPJ                                                        │ cnpj                     │
-- │ Município                                                   │ municipio                │
-- │ Objeto                                                      │ objeto                   │
-- │ Órgão Entidade/Responsável                                  │ orgao_entidade           │
-- │ Regional                                                    │ regional                 │
-- │ Nº de Convênio                                              │ num_convenio             │
-- │ Nº de Processo                                              │ num_processo             │
-- │ Assinatura                                                  │ data_assinatura          │
-- │ Publicação                                                  │ data_publicacao          │
-- │ Agência                                                     │ agencia                  │
-- │ Conta                                                       │ conta                    │
-- │ Valor                                                       │ valor                    │
-- │ Valor da Demanda                                            │ valor_desembolsado       │
-- │ Portfólio                                                   │ portfolio                │
-- │ Qtd. Dias na Etapa                                          │ qtd_dias                 │
-- │ Vigência                                                    │ vigencia                 │
-- │ Data da Primeira Notificação LOA Recebida pelo Beneficiário │ data_prorrogacao         │
-- │ Dados Bancários                                             │ dados_bancarios          │
-- │ Status do Pagamento                                         │ status                   │
-- │ Data do Pagamento                                           │ data_pagamento           │
-- │ Nº do Código Único                                          │ num_codigo               │
-- │ Notas e Empenho                                             │ notas_empenho            │
-- │ Valor Total Empenho                                         │ valor_total_empenhado    │
-- │ Notas de Lançamento                                         │ notas_liquidacao         │
-- │ Valor Total Lançamento                                      │ valor_total_liquidado    │
-- │ Programações Desembolso                                     │ programa                 │
-- │ Valor Total Programação Desembolso                          │ valor_total_pago         │
-- │ Ordem Bancária                                              │ ordem_bancaria           │
-- │ Data pagamento Ordem Bancária                               │ data_paga                │
-- │ Valor Total Ordem Bancária                                  │ valor_total_ordem_bancaria│
-- └─────────────────────────────────────────────────────────────┴──────────────────────────┘

-- ============================================================
-- PARTE 3: DESABILITAR RLS TEMPORARIAMENTE (se necessário)
-- ============================================================
-- Se tiver erro de permissão, desabilite RLS temporariamente:

ALTER TABLE emendas DISABLE ROW LEVEL SECURITY;
ALTER TABLE formalizacao DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- PARTE 4: CRIAR ÍNDICES PARA PERFORMANCE DA SINCRONIZAÇÃO
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_emendas_num_convenio ON emendas(num_convenio);
CREATE INDEX IF NOT EXISTS idx_formalizacao_numero_convenio ON formalizacao(numero_convenio);
CREATE INDEX IF NOT EXISTS idx_emendas_codigo_num ON emendas(codigo_num);

-- ============================================================
-- PARTE 5: SINCRONIZAR EMENDAS → FORMALIZAÇÃO
-- (Preenche colunas vazias da formalização com dados das emendas)
-- Relacionamento: emendas.num_convenio = formalizacao.numero_convenio
-- ============================================================

-- 5.1 Verificar quantas formalizações têm numero_convenio correspondente em emendas
SELECT 
  'formalizacoes com convenio' as info,
  COUNT(*) as total
FROM formalizacao f
WHERE f.numero_convenio IS NOT NULL AND f.numero_convenio != ''
UNION ALL
SELECT 
  'formalizacoes com match em emendas' as info,
  COUNT(*) as total
FROM formalizacao f
INNER JOIN emendas e ON TRIM(f.numero_convenio) = TRIM(e.num_convenio)
WHERE f.numero_convenio IS NOT NULL AND f.numero_convenio != '';

-- 5.2 SINCRONIZAÇÃO: Atualizar formalização com dados das emendas
-- (só atualiza campos que estão vazios na formalização)
UPDATE formalizacao f SET
  demanda = COALESCE(NULLIF(f.demanda, ''), e.detalhes),
  classificacao_emenda_demanda = COALESCE(NULLIF(f.classificacao_emenda_demanda, ''), e.natureza),
  ano = COALESCE(NULLIF(f.ano, ''), e.ano_refer),
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
  AND f.numero_convenio != '';

-- 5.3 Verificar resultado da sincronização
SELECT 
  'Registros atualizados na formalizacao' as info,
  COUNT(*) as total
FROM formalizacao f
INNER JOIN emendas e ON TRIM(f.numero_convenio) = TRIM(e.num_convenio)
WHERE f.numero_convenio IS NOT NULL AND f.numero_convenio != '';

-- ============================================================
-- PARTE 6: SINCRONIZAÇÃO ALTERNATIVA (sobrescrever todos os campos)
-- ⚠️ USE APENAS SE A PARTE 5 NÃO PREENCHER OS CAMPOS CORRETAMENTE
-- Esta versão SOBRESCREVE todos os valores, não apenas os vazios
-- ============================================================

/*
UPDATE formalizacao f SET
  demanda = e.detalhes,
  classificacao_emenda_demanda = e.natureza,
  ano = e.ano_refer,
  emendas_agregadoras = e.num_emenda,
  situacao_demandas_sempapel = e.situacao_d,
  parlamentar = e.parlamentar,
  partido = e.partido,
  conveniado = e.beneficiario,
  municipio = e.municipio,
  objeto = e.objeto,
  regional = e.regional,
  portfolio = e.portfolio,
  valor = e.valor
FROM emendas e
WHERE TRIM(f.numero_convenio) = TRIM(e.num_convenio)
  AND f.numero_convenio IS NOT NULL
  AND f.numero_convenio != '';
*/

-- ============================================================
-- PARTE 7: INSERIR EMENDAS QUE NÃO EXISTEM NA FORMALIZAÇÃO
-- (Cria registros novos na formalização para emendas sem correspondência)
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
WHERE e.num_convenio IS NOT NULL
  AND e.num_convenio != ''
  AND NOT EXISTS (
    SELECT 1 FROM formalizacao f
    WHERE TRIM(f.numero_convenio) = TRIM(e.num_convenio)
  );

-- ============================================================
-- PARTE 8: VERIFICAÇÃO FINAL
-- ============================================================

-- 8.1 Contagem de registros
SELECT 'emendas' as tabela, COUNT(*) as total FROM emendas
UNION ALL
SELECT 'formalizacao' as tabela, COUNT(*) as total FROM formalizacao;

-- 8.2 Verificar se formalização tem dados nas colunas que estavam vazias
SELECT 
  COUNT(*) as total,
  COUNT(NULLIF(demanda, '')) as com_demanda,
  COUNT(NULLIF(regional, '')) as com_regional,
  COUNT(NULLIF(emenda, '')) as com_emenda,
  COUNT(NULLIF(parlamentar, '')) as com_parlamentar,
  COUNT(NULLIF(municipio, '')) as com_municipio,
  COUNT(NULLIF(objeto, '')) as com_objeto,
  COUNT(NULLIF(conveniado, '')) as com_conveniado,
  COUNT(NULLIF(classificacao_emenda_demanda, '')) as com_classificacao
FROM formalizacao;

-- 8.3 Amostra de formalizações com dados sincronizados
SELECT 
  f.id,
  f.numero_convenio,
  f.ano,
  f.parlamentar,
  f.emenda,
  f.demanda,
  f.regional,
  f.municipio,
  f.valor
FROM formalizacao f
WHERE f.numero_convenio IS NOT NULL AND f.numero_convenio != ''
ORDER BY f.id
LIMIT 20;

-- ============================================================
-- PARTE 9: REABILITAR RLS (Row Level Security)
-- ============================================================
-- ⚠️ IMPORTANTE: Execute isso depois de terminar a importação!

ALTER TABLE emendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE formalizacao ENABLE ROW LEVEL SECURITY;

-- Garantir que as políticas existem
DROP POLICY IF EXISTS "Allow all for service role" ON emendas;
CREATE POLICY "Allow all for service role" ON emendas FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for service role" ON formalizacao;
CREATE POLICY "Allow all for service role" ON formalizacao FOR ALL USING (true);

-- ============================================================
-- ✅ CONCLUÍDO!
-- Após importar o CSV e executar este script:
-- 1. A tabela emendas terá os dados do CSV (~34k registros)
-- 2. A tabela formalização terá colunas preenchidas via sincronização
-- 3. Emendas sem correspondência na formalização são inseridas automaticamente
-- ============================================================
