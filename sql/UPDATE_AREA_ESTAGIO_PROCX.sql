-- ============================================================
-- PROCX: Preencher area_estagio a partir de situacao_demandas_sempapel
-- Execute no Supabase SQL Editor OU use o botão no painel Admin.
-- É seguro re-executar (idempotente).
-- ============================================================

-- ── FUNÇÃO RPC (chamada pelo endpoint /api/admin/update-area-estagio) ───────
CREATE OR REPLACE FUNCTION update_area_estagio_from_sempapel()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE formalizacao
  SET area_estagio = CASE

    -- ── Diligência com o Beneficiário (DRS/CRS atuando PELO beneficiário) ──
    WHEN situacao_demandas_sempapel ILIKE 'Diligência com o Beneficiário%'
      OR situacao_demandas_sempapel ILIKE 'Diligencia com o Beneficiario%'
                                                          THEN 'Beneficiário'

    -- ── "DRS" sozinho = Beneficiário (caso especial da tabela de mapeamento) ─
    WHEN TRIM(situacao_demandas_sempapel) = 'DRS'         THEN 'Beneficiário'

    -- ── Repasse Próprio Beneficiário ─────────────────────────────────────────
    WHEN situacao_demandas_sempapel ILIKE 'Em análise de admissibilidade do Órgão Processador%'
      OR situacao_demandas_sempapel ILIKE 'Em analise de admissibilidade do Orgao Processador%'
      OR situacao_demandas_sempapel ILIKE '%Repasse Próprio%'
      OR situacao_demandas_sempapel ILIKE '%Repasse Proprio%'
                                                          THEN 'Repasse Próprio Beneficiário'

    -- ── Auto-mapeamento (o valor é o próprio nome da área) ──────────────────
    WHEN TRIM(situacao_demandas_sempapel) = 'Aguardando assinaturas'
                                                          THEN 'Aguardando assinaturas'
    WHEN TRIM(situacao_demandas_sempapel) = 'Remanejamento'
                                                          THEN 'Remanejamento'
    WHEN situacao_demandas_sempapel ILIKE '%Inclusão de Transferência Voluntária%'
      OR situacao_demandas_sempapel ILIKE '%Inclusao de Transferencia Voluntaria%'
                                                          THEN 'Em Inclusão de Transferência Voluntária'

    -- ── Cancelada ────────────────────────────────────────────────────────────
    WHEN situacao_demandas_sempapel ILIKE '%cancelad%'    THEN 'Cancelada'

    -- ── Chefia de Gabinete (antes de Casa Civil para não colidir) ───────────
    WHEN situacao_demandas_sempapel ILIKE '%Chefia de Gabinete%'
                                                          THEN 'Chefia de Gabinete'

    -- ── Coordenador CGOF ─────────────────────────────────────────────────────
    WHEN situacao_demandas_sempapel ILIKE '%Coordenador CGOF%'
                                                          THEN 'Coordenador CGOF'

    -- ── Casa Civil ───────────────────────────────────────────────────────────
    WHEN situacao_demandas_sempapel ILIKE '%Casa Civil%'
      OR situacao_demandas_sempapel ILIKE '%Análise de Chefia Superior%'
      OR situacao_demandas_sempapel ILIKE '%Analise de Chefia Superior%'
      OR situacao_demandas_sempapel ILIKE '%Aguardando Liberação da Casa%'
      OR situacao_demandas_sempapel ILIKE '%Aguardando Liberacao da Casa%'
      OR situacao_demandas_sempapel ILIKE '%Preparando Comunicado ao Parlamentar%'
      OR situacao_demandas_sempapel ILIKE '%Aguardando emissão de comunicado ao parlamentar%'
      OR situacao_demandas_sempapel ILIKE '%Aguardando emissao de comunicado ao parlamentar%'
      OR situacao_demandas_sempapel ILIKE '%Em análise para Processamento na Secretaria%'
      OR situacao_demandas_sempapel ILIKE '%Em analise para Processamento na Secretaria%'
                                                          THEN 'Casa Civil'

    -- ── CRS (antes de DRS para evitar colisão) ───────────────────────────────
    WHEN situacao_demandas_sempapel ILIKE '%CRS%'         THEN 'CRS'

    -- ── DRS ──────────────────────────────────────────────────────────────────
    WHEN situacao_demandas_sempapel ILIKE '%DRS%'
      OR situacao_demandas_sempapel ILIKE '%Manifestação Técnica e Protocolo%'
      OR situacao_demandas_sempapel ILIKE '%Manifestacao Tecnica e Protocolo%'
      OR situacao_demandas_sempapel ILIKE '%Validação Em Análise Técnica Regional%'
                                                          THEN 'DRS'

    -- ── Secretaria de Governo ────────────────────────────────────────────────
    WHEN situacao_demandas_sempapel ILIKE '%Secretaria de Governo%'
      OR situacao_demandas_sempapel ILIKE '%Institucionais%'
                                                          THEN 'Secretaria de Governo'

    -- ── GGCON (inclui "01/2024", "39/2022" etc. = nº do Parecer Referencial) ─
    WHEN situacao_demandas_sempapel ILIKE '%GGCON%'
      OR situacao_demandas_sempapel ILIKE '%Parecer Referencial%'
      OR situacao_demandas_sempapel  ~ '^\d+/20\d{2}$'
      OR situacao_demandas_sempapel ILIKE '%Reserva Financeira%'
      OR situacao_demandas_sempapel ILIKE '%Publicação no DOE%'
      OR situacao_demandas_sempapel ILIKE '%Publicacao no DOE%'
      OR situacao_demandas_sempapel ILIKE '%Aguardando publicação%'
      OR situacao_demandas_sempapel ILIKE '%Renumerada%'
      OR situacao_demandas_sempapel ILIKE '%Aprovação, Assinatura e Publicação%'
      OR situacao_demandas_sempapel ILIKE '%Aprovacao, Assinatura e Publicacao%'
      OR situacao_demandas_sempapel ILIKE '%Análise GGCON%'
      OR situacao_demandas_sempapel ILIKE '%Analise GGCON%'
      OR situacao_demandas_sempapel ILIKE '%Secretaria da coordenação%'
      OR situacao_demandas_sempapel ILIKE '%Secretaria da coordenacao%'
      OR situacao_demandas_sempapel ILIKE '%Em emissão da minuta%'
      OR situacao_demandas_sempapel ILIKE '%Em emissao da minuta%'
      OR situacao_demandas_sempapel ILIKE '%emissão do parecer%'
      OR situacao_demandas_sempapel ILIKE '%emissao do parecer%'
                                                          THEN 'GGCON'

    -- ── Impedimento Eleitoral ────────────────────────────────────────────────
    WHEN situacao_demandas_sempapel ILIKE '%Impedimento Eleitoral%'
      OR situacao_demandas_sempapel ILIKE '%AGUARDAR FINALIZAÇÃO%'
      OR situacao_demandas_sempapel ILIKE '%Aguardar Finalização%'
      OR situacao_demandas_sempapel ILIKE '%Aguardar Finalizacao%'
                                                          THEN 'Impedimento Eleitoral'

    -- ── Orçamento ─────────────────────────────────────────────────────────────
    WHEN situacao_demandas_sempapel ILIKE '%AGENDA LIBERAÇÃO%'
      OR situacao_demandas_sempapel ILIKE '%AGENDA LIBERACAO%'
      OR situacao_demandas_sempapel ILIKE '%Orçamento%'
      OR situacao_demandas_sempapel ILIKE '%Orcamento%'
                                                          THEN 'Orçamento'

    -- ── Financeiro ───────────────────────────────────────────────────────────
    WHEN situacao_demandas_sempapel ILIKE '%SIAFEM%'
      OR situacao_demandas_sempapel ILIKE '%Nota de Empenho%'
      OR situacao_demandas_sempapel ILIKE '%Financeiro%'
      OR situacao_demandas_sempapel ILIKE '%Abrir Processo%'
      OR situacao_demandas_sempapel ILIKE '%Empenho%'
                                                          THEN 'Financeiro'

    -- ── Consultoria Jurídica ─────────────────────────────────────────────────
    WHEN situacao_demandas_sempapel ILIKE '%Consulta Jurídica%'
      OR situacao_demandas_sempapel ILIKE '%Consulta Juridica%'
      OR situacao_demandas_sempapel ILIKE '%jurídica%'
      OR situacao_demandas_sempapel ILIKE '%juridica%'
                                                          THEN 'Consultoria Jurídica'

    -- ── Comitê Gestor ─────────────────────────────────────────────────────────
    WHEN situacao_demandas_sempapel ILIKE '%Comitê Gestor%'
      OR situacao_demandas_sempapel ILIKE '%Comite Gestor%'
                                                          THEN 'Comitê Gestor'

    -- ── Saúde Animal ─────────────────────────────────────────────────────────
    WHEN situacao_demandas_sempapel ILIKE '%Saúde Animal%'
      OR situacao_demandas_sempapel ILIKE '%Saude Animal%'
      OR situacao_demandas_sempapel ILIKE '%CDSA%'
                                                          THEN 'Saúde Animal'

    -- ── Beneficiário (catch-all para fluxos de beneficiário sem palavra-chave)
    WHEN situacao_demandas_sempapel ILIKE '%benefici%'
      OR situacao_demandas_sempapel ILIKE '%Documentação Interveniente%'
      OR situacao_demandas_sempapel ILIKE '%Documentacao Interveniente%'
      OR situacao_demandas_sempapel ILIKE '%Documentos %'
      OR situacao_demandas_sempapel ILIKE '%Em cadastramento%'
      OR situacao_demandas_sempapel ILIKE '%Emenda Processada%'
      OR situacao_demandas_sempapel ILIKE '%Cadastros e Comunicação%'
      OR situacao_demandas_sempapel ILIKE '%Cadastros e Comunicacao%'
      OR situacao_demandas_sempapel ILIKE '%Medicina%'
      OR situacao_demandas_sempapel ILIKE '%HOSPITALAR%'
      OR situacao_demandas_sempapel ILIKE '%Plano de Trabalho%'
      OR situacao_demandas_sempapel ILIKE '%Diligência Voluntária processada%'
      OR situacao_demandas_sempapel ILIKE '%Diligencia Voluntaria processada%'
      OR situacao_demandas_sempapel ILIKE '%Em Preenchimento%'
                                                          THEN 'Beneficiário'

    -- ── Fallback: mantém o valor atual ──────────────────────────────────────
    ELSE area_estagio

  END
  WHERE situacao_demandas_sempapel IS NOT NULL
    AND situacao_demandas_sempapel != '';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN json_build_object(
    'updated', v_updated,
    'message', v_updated || ' registros com area_estagio atualizado via PROCX'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION update_area_estagio_from_sempapel() TO service_role;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- PARA EXECUTAR MANUALMENTE (sem usar o botão do sistema):
-- SELECT update_area_estagio_from_sempapel();
-- ============================================================
