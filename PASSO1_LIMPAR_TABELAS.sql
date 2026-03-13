-- ============================================================
-- PASSO 1: LIMPAR FORMALIZAÇÃO E PREPARAR IMPORTAÇÃO
-- Execute ANTES de carregar os novos dados
-- ============================================================
-- ⚠️ A tabela EMENDAS NÃO é tocada aqui.
--    Emendas é atualizada pelo sistema (importação via interface).
-- ============================================================
-- ATENÇÃO: Isso apaga TODOS os dados da tabela formalizacao!
-- Faça backup se necessário.
-- ============================================================

-- 1A. Limpar formalizacao
TRUNCATE TABLE formalizacao RESTART IDENTITY CASCADE;

-- 1B. Verificar que está vazia
SELECT 'formalizacao' as tabela, COUNT(*) as registros FROM formalizacao;

-- ============================================================
-- PASSO 1C: CRIAR TABELA AUXILIAR PARA IMPORTAR CSV DE FORMALIZAÇÃO
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

ALTER TABLE formalizacao_import ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir tudo formalizacao_import" ON formalizacao_import FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- AGORA FAÇA A IMPORTAÇÃO DO CSV NO SUPABASE:
--
-- 1. Vá em Table Editor → formalizacao_import → Import → CSV de formalização
-- 2. Depois execute o PASSO2_SINCRONIZAR.sql
-- ============================================================
