-- ============================================================
-- PASSO 1: LIMPAR TABELAS E PREPARAR IMPORTAÇÃO
-- Execute ANTES de carregar os novos dados
-- ============================================================
-- ATENÇÃO: Isso apaga TODOS os dados das tabelas!
-- Faça backup se necessário.
-- ============================================================

-- 1A. Limpar formalizacao primeiro (pode ter referência)
TRUNCATE TABLE formalizacao RESTART IDENTITY CASCADE;

-- 1B. Limpar emendas
TRUNCATE TABLE emendas RESTART IDENTITY CASCADE;

-- 1C. Verificar que estão vazias
SELECT 'formalizacao' as tabela, COUNT(*) as registros FROM formalizacao
UNION ALL
SELECT 'emendas' as tabela, COUNT(*) as registros FROM emendas;

-- ============================================================
-- PASSO 1D: CRIAR TABELA TEMPORÁRIA PARA IMPORTAR CSV DE EMENDAS
-- O CSV tem cabeçalhos legíveis (ex: "Detalhes da Demanda")
-- mas a tabela emendas tem nomes técnicos (ex: "detalhes").
-- Vamos criar uma tabela auxiliar com os nomes do CSV.
-- ============================================================

DROP TABLE IF EXISTS emendas_import;

CREATE TABLE emendas_import (
  "Detalhes da Demanda" TEXT,
  "Natureza" TEXT,
  "Ano Referência" TEXT,
  "Código/Nº Emenda" TEXT,
  "Nº Emenda Agregadora" TEXT,
  "Parecer LDO" TEXT,
  "Situação Emenda" TEXT,
  "Situação Demanda" TEXT,
  "Data da Última Tramitação Emenda" TEXT,
  "Data da Última Tramitação Demanda" TEXT,
  "Nº da Indicação" TEXT,
  "Parlamentar" TEXT,
  "Partido" TEXT,
  "Tipo Beneficiário" TEXT,
  "Beneficiário" TEXT,
  "CNPJ" TEXT,
  "Município" TEXT,
  "Objeto" TEXT,
  "Órgão Entidade/Responsável" TEXT,
  "Regional" TEXT,
  "Nº de Convênio" TEXT,
  "Nº de Processo" TEXT,
  "Assinatura" TEXT,
  "Publicação" TEXT,
  "Agência" TEXT,
  "Conta" TEXT,
  "Valor" TEXT,
  "Valor da Demanda" TEXT,
  "Portfólio" TEXT,
  "Qtd. Dias na Etapa" TEXT,
  "Vigência" TEXT,
  "Data da Primeira Notificação LOA Recebida pelo Beneficiário" TEXT,
  "Dados Bancários" TEXT,
  "Status do Pagamento" TEXT,
  "Data do Pagamento" TEXT,
  "Nº do Código Único" TEXT,
  "Notas e Empenho" TEXT,
  "Valor Total Empenho" TEXT,
  "Notas de Lançamento" TEXT,
  "Valor Total Lançamento" TEXT,
  "Programações Desembolso" TEXT,
  "Valor Total Programação Desembolso" TEXT,
  "Ordem Bancária" TEXT,
  "Data pagamento Ordem Bancária" TEXT,
  "Valor Total Ordem Bancária" TEXT
);

-- Habilitar acesso para importação
ALTER TABLE emendas_import ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir tudo emendas_import" ON emendas_import FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- AGORA FAÇA A IMPORTAÇÃO DOS CSVs:
--
-- 1. Vá em Table Editor → emendas_import → Import → CSV de emendas
--    (esta tabela aceita os cabeçalhos originais do CSV)
--
-- 2. Vá em Table Editor → formalizacao_import → Import → CSV de formalização
--    (esta tabela aceita os cabeçalhos originais do CSV)
--
-- 3. Depois execute o PASSO2_SINCRONIZAR.sql
-- ============================================================

-- ============================================================
-- PASSO 1E: CRIAR TABELA TEMPORÁRIA PARA IMPORTAR CSV DE FORMALIZAÇÃO
-- O CSV tem cabeçalhos legíveis (ex: "N° de Convênio")
-- mas a tabela formalizacao tem nomes técnicos (ex: "numero_convenio").
-- ============================================================

DROP TABLE IF EXISTS formalizacao_import;

CREATE TABLE formalizacao_import (
  "Seq" TEXT,
  "Ano" TEXT,
  "Parlamentar" TEXT,
  "Partido" TEXT,
  "Emenda" TEXT,
  "Emendas Agregadoras" TEXT,
  "Demanda" TEXT,
  "DEMANDAS FORMALIZAÇÃO" TEXT,
  "N° de Convênio" TEXT,
  "Classificação Emenda/Demanda" TEXT,
  "Tipo de Formalização" TEXT,
  "Regional" TEXT,
  "Município" TEXT,
  "Conveniado" TEXT,
  "Objeto" TEXT,
  "Portfólio" TEXT,
  "Valor" TEXT,
  "Posição Anterior" TEXT,
  "Situação Demandas - SemPapel" TEXT,
  "Área - estágio" TEXT,
  "Recurso" TEXT,
  "Tecnico" TEXT,
  "Data da Liberação" TEXT,
  "Área - Estágio Situação da Demanda" TEXT,
  "Situação - Análise Demanda" TEXT,
  "Data - Análise Demanda" TEXT,
  "Motivo do Retorno da Diligência" TEXT,
  "Data do Retorno da Diligência" TEXT,
  "Conferencista" TEXT,
  "Data recebimento demanda" TEXT,
  "Data do Retorno" TEXT,
  "Observação - Motivo do Retorno" TEXT,
  "Data liberação da Assinatura - Conferencista" TEXT,
  "Data liberação de Assinatura" TEXT,
  "Falta assinatura" TEXT,
  "Assinatura" TEXT,
  "Publicação" TEXT,
  "Vigência" TEXT,
  "Encaminhado em" TEXT,
  "Concluída em" TEXT
);

-- Habilitar acesso para importação
ALTER TABLE formalizacao_import ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir tudo formalizacao_import" ON formalizacao_import FOR ALL TO anon USING (true) WITH CHECK (true);
