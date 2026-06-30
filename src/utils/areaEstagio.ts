/**
 * Utilitário compartilhado: derivar Área - Estágio a partir de situacao_demandas_sempapel.
 * Usado tanto na tela de Formalização (coluna Área - Estágio) quanto no Demonstrativo do Dashboard.
 */

export const SEMPAPEL_AREA_MAP: Record<string, string> = {
  // ── 1 - BENEFICIÁRIO ──────────────────────────────────────────────────────
  'Aguardando Informações Iniciais do Beneficiário': '1 - Beneficiário',
  'Análise do Objeto  - CSS': '1 - Beneficiário',
  'Análise do Objeto - CSS': '1 - Beneficiário',
  'Classificação das Emendas  - CGCSS': '1 - Beneficiário',
  'Classificação das Emendas - CGCSS': '1 - Beneficiário',
  'Credito disponível para o beneficiário': '1 - Beneficiário',
  'Documentos Beneficiário (agregadora)': '1 - Beneficiário',
  'Documentos Beneficiário (unitária)': '1 - Beneficiário',
  'Em Cadastramento (Emenda Agregadora)': '1 - Beneficiário',
  'Em Cadastramento (Emenda Unitária)': '1 - Beneficiário',
  'Em Cadastramento (novo)': '1 - Beneficiário',
  'Em Preenchimento do Plano de Trabalho': '1 - Beneficiário',
  'GGAMB': '1 - Beneficiário',
  'Processo Licitatório': '1 - Beneficiário',
  'Transferência Voluntária processada': '1 - Beneficiário',
  'Unidade (Beneficiário)': '1 - Beneficiário',
  'Validação da Emenda Agregadora - LOA': '1 - Beneficiário',
  'Validação Plano de Trabalho e Documentos': '1 - Beneficiário',
  // Beneficiário - diligências e variantes
  'Diligência com o Beneficiário - análise administrativa - DRS': '1 - Beneficiário',
  'Diligência com o Beneficiário - Em análise técnica - DRS': '1 - Beneficiário',
  'Diligência com o Beneficiário - análise técnica - DRS': '1 - Beneficiário',
  'Diligência com o Beneficiário - emissão parecer técnico DRS': '1 - Beneficiário',
  'Diligência com o Beneficiário - Em análise administrativa - DRS': '1 - Beneficiário',
  'Em diligência com Beneficiário': '1 - Beneficiário',
  'Diligência - Documentos beneficiário': '1 - Beneficiário',
  'diligência administrativa': '1 - Beneficiário',
  'Documentação Interveniente': '1 - Beneficiário',
  'Documento Beneficiário (novo)': '1 - Beneficiário',
  'Documentos beneficiário (novo)': '1 - Beneficiário',
  'Em cadastramento': '1 - Beneficiário',
  'Emenda Processada': '1 - Beneficiário',
  'Cadastro e Comunicação da Demanda': '1 - Beneficiário',
  'Interveniente - FUNDAÇÃO PARA O DESENVOLVIMENTO MEDICO E HOSPITALAR': '1 - Beneficiário',
  'Em diligência com Interveniente - Fundação Faculdade de Medicina': '1 - Beneficiário',
  'Em diligência com Interveniente - FUNDAÇÃO PARA O DESENVOLVIMENTO MEDICO E HOSPITALAR': '1 - Beneficiário',
  'Em diligência com Beneficiário - Corrigir obras': '1 - Beneficiário',
  'diligencia - beneficiario': '1 - Beneficiário',
  'Documentos beneficiário': '1 - Beneficiário',
  'Documentos Beneficiário Agregadora': '1 - Beneficiário',
  // ── 2 - DRS ───────────────────────────────────────────────────────────────
  'Aguardando análise administrativa - DRS': '2 - DRS',
  'Aguardando análise técnica - DRS': '2 - DRS',
  'Aguardando emissão do parecer técnico - DRS': '2 - DRS',
  'Em análise administrativa - DRS': '2 - DRS',
  'Em análise de admissibilidade da DRS': '2 - DRS',
  'Em Análise de Admissibilidade do Órgão/Entidade': '2 - DRS',
  'Em análise técnica - DRS': '2 - DRS',
  'Em emissão parecer técnico DRS': '2 - DRS',
  'Em Validação da Emenda Agregadora - LOA': '2 - DRS',
  'Unificar Emendas': '2 - DRS',
  'Diligência com o Beneficiário - Aguardando análise administrativa - DRS': '2 - DRS',
  'Diligência com o Beneficiário - Em emissão parecer técnico DRS': '2 - DRS',
  'Aguardando processamento da DRS': '2 - DRS',
  'Em diligência com análise administrativa DRS': '2 - DRS',
  'Em análise técnica da DRS': '2 - DRS',
  'Manifestação Técnica e Protocolo': '2 - DRS',
  'Em diligência análise administrativa DRS': '2 - DRS',
  'Diligência análise técnica - DRS': '2 - DRS',
  'Em Análise Técnica da Regional': '2 - DRS',
  'Diligência análise técnica': '2 - DRS',
  'Em diligência técnica DRS': '2 - DRS',
  // ── 3 - CRS ───────────────────────────────────────────────────────────────
  'Aguardando análise técnica - CRS': '3 - CRS',
  'Em análise técnica - CRS': '3 - CRS',
  'Aguardando análise técnica coordenador - CRS': '3 - CRS',
  'Revisão do Órgão Processador - Em análise técnica - CRS': '3 - CRS',
  'Em diligência parecer técnico coordenador – CRS': '3 - CRS',
  'Em diligência análise técnica CRS': '3 - CRS',
  'Em diligência com análise técnica CRS': '3 - CRS',
  'Em análise técnico coordenador - CRS': '3 - CRS',
  'Em análise técnica orçamentária - CRS': '3 - CRS',
  'Em diligência parecer técnico coordenador - CRS': '3 - CRS',
  // ── 4 - CGOF - GGCON ──────────────────────────────────────────────────────
  'Aguardando análise administrativa - GGCON': '4 - CGOF - GGCON',
  'Em análise administrativa - GGCON': '4 - CGOF - GGCON',
  'Formalização da Entidade - LOA - Parecer Referencial 10/2026': '4 - CGOF - GGCON',
  'Formalização da Entidade Transferência Voluntária - Parecer Referencial 09/2026': '4 - CGOF - GGCON',
  'Formalização Prefeitura Transferência Voluntária - Parecer Referencial 11/2026': '4 - CGOF - GGCON',
  'Formalização Prefeitura Obras - Reforma e Custeio - LOA - Parecer Referencial 10/2026': '4 - CGOF - GGCON',
  'Aguardando associação de portfólio para a Transferência Voluntária': '4 - CGOF - GGCON',
  'Aguardando associação de portfólio para a demanda parlamentar': '4 - CGOF - GGCON',
  'Revisão do Órgão Processador - Em análise administrativa - GGCON': '4 - CGOF - GGCON',
  'Aguardando formalização': '4 - CGOF - GGCON',
  'Em formalização da minuta - Transferência Voluntária - Parecer Referencial 03/2024': '4 - CGOF - GGCON',
  'Em formalização da minuta - LOA - Parecer Referencial  01/2024': '4 - CGOF - GGCON',
  'Formalização Prefeitura Obras – LOA – Parecer Referencial 01/2024': '4 - CGOF - GGCON',
  'Em formalização da minuta - LOA - Parecer Referencial 01/2024': '4 - CGOF - GGCON',
  'Em formalização da minuta - LOA - Parecer Referencial 03/2022': '4 - CGOF - GGCON',
  'Em anexo da Resolução do Diário Oficial': '4 - CGOF - GGCON',
  'Em emissão  do parecer referencial': '4 - CGOF - GGCON',
  'Em emissão da minuta - GGCON - LOA - Parecer Referencial 50/2021': '4 - CGOF - GGCON',
  'Aguardando processamento da secretaria': '4 - CGOF - GGCON',
  'Em Analise Técnica da Secretaria': '4 - CGOF - GGCON',
  'Em análise técnica da secretaria': '4 - CGOF - GGCON',
  'Em emissão da minuta GGCON - Demandas': '4 - CGOF - GGCON',
  'Em emissão da minuta - GGCON - LOA': '4 - CGOF - GGCON',
  'Em emissão da minuta - Parecer Referencial 32/21': '4 - CGOF - GGCON',
  'Em formalização da minuta - Parecer Referencial 04/2022': '4 - CGOF - GGCON',
  'Em emissão da minuta - GGCON - LOA - Parecer Referencial 03/2022': '4 - CGOF - GGCON',
  'Em formalização de minuta - LOA - Parecer Referencial 03/2022': '4 - CGOF - GGCON',
  'Em emissão da minuta - Parecer Referencial 47/2021': '4 - CGOF - GGCON',
  'Em emissão da minuta - GGCON - LOA - Parecer Referencial 39/2022': '4 - CGOF - GGCON',
  'Em emissão da minuta - GGCON - LOA - Parecer Referencial 47': '4 - CGOF - GGCON',
  'Em formalização da minuta - LOA - Parecer Referencial  39/2022': '4 - CGOF - GGCON',
  'Formalização Prefeitura Obras – LOA – Parecer Referencial 39/2022': '4 - CGOF - GGCON',
  'Em Instrução Processual - Secretaria': '4 - CGOF - GGCON',
  'Aguardando Emissão da Minuta': '4 - CGOF - GGCON',
  'Aprovação, Assinaturas e Publicação do Convênio': '4 - CGOF - GGCON',
  'Aguardando parecer técnico da coordenadoria': '4 - CGOF - GGCON',
  'Em análise parecer técnico da coordenadoria': '4 - CGOF - GGCON',
  'Em emissão da minuta - Parecer Referencial 04/2022': '4 - CGOF - GGCON',
  'Em emissão do parecer referencial': '4 - CGOF - GGCON',
  'Em formalização da minuta - Transferência Voluntária - Parecer Referencial 41/2022': '4 - CGOF - GGCON',
  'Em diligência análise administrativa GGCON': '4 - CGOF - GGCON',
  'Formalização do Convênio': '4 - CGOF - GGCON',
  'Análise GGCON, Orçamento e Reserva Financeira': '4 - CGOF - GGCON',
  'Em emissão do extrato': '4 - CGOF - GGCON',
  'Aguardando publicação no DOE': '4 - CGOF - GGCON',
  'Formalização Prefeitura Obras – LOA – Parecer Referencial 03/2022': '4 - CGOF - GGCON',
  'Em formalização da minuta - LOA - Parecer Referencial 21/2025': '4 - CGOF - GGCON',
  'Formalização Prefeitura Obras - Reforma e Custeio - LOA - Parecer Referencial 21/2025': '4 - CGOF - GGCON',
  'Em Análise de Admissibilidade do Órgão/Entidade - Remanejada': '4 - CGOF - GGCON',
  'Aguardando liberação de assinatura': '4 - CGOF - GGCON',
  'Aguardando liberação para assinaturas': '4 - CGOF - GGCON',
  'Em emissão da minuta - GGCON': '4 - CGOF - GGCON',
  'Em Análise de Admissibilidade do Órgão/Entidade - Primeiro Remanejamento': '4 - CGOF - GGCON',
  'Em formalização da minuta - LOA - Parecer Referencial 01/2025': '4 - CGOF - GGCON',
  'Em formalização da minuta - Transferência Voluntária - Parecer Referencial 03/2025': '4 - CGOF - GGCON',
  'Em Inclusão da Transferência Voluntária': '4 - CGOF - GGCON',
  'Remanejamento': '4 - CGOF - GGCON',
  // ── 4.1 - CGOF - ORÇAMENTO ────────────────────────────────────────────────
  'Aguardando análise orçamentária - CGOF': '4.1 - CGOF - Orçamento',
  'Aguardando crédito da demanda (Fazenda)(GCO)': '4.1 - CGOF - Orçamento',
  'Disponibilidade Orçamentária': '4.1 - CGOF - Orçamento',
  'Em Análise Orçamentária GCO': '4.1 - CGOF - Orçamento',
  'Em análise orçamentária - CGOF': '4.1 - CGOF - Orçamento',
  'Em processo SIAFEM': '4.1 - CGOF - Orçamento',
  'AGUARDA LIBERAÇÃO DE RECURSOS': '4.1 - CGOF - Orçamento',
  'Demanda contabilizada como impeditiva': '4.1 - CGOF - Orçamento',
  // ── 4.2 - CGOF - FINANCEIRO ───────────────────────────────────────────────
  'Anexar Nota de Reserva - GCF': '4.2 - CGOF - Financeiro',
  'Anexar nota de reserva - GCF': '4.2 - CGOF - Financeiro',
  'Anexar nota de empenho': '4.2 - CGOF - Financeiro',
  'Execução e Liberação de Pagamentos': '4.2 - CGOF - Financeiro',
  'Abrir Processo': '4.2 - CGOF - Financeiro',
  'Nota de Empenho': '4.2 - CGOF - Financeiro',
  // ── 4.3 - CGOF - COORDENADOR ──────────────────────────────────────────────
  'Parecer - Coordenador CGOF': '4.3 - CGOF - Coordenador',
  // ── 5 - CHEFIA DE GABINETE ────────────────────────────────────────────────
  'Aprovação - Chefia de Gabinete': '5 - Chefia de Gabinete',
  'Aguardando Autorização Superior': '5 - Chefia de Gabinete',
  // ── 6 - SECRETÁRIO ────────────────────────────────────────────────────────
  'Aguardando aprovação do Secretario de Estado da Saúde': '6 - Secretário',
  'Autorização do Secretario': '6 - Secretário',
  'Repasse': '6 - Secretário',
  'Demanda reprovada': '6 - Secretário',
  // ── 7 - EM ASSINATURA ─────────────────────────────────────────────────────
  'Em Assinatura': '7 - Em Assinatura',
  'Em assinatura - Fundo a Fundo': '7 - Em Assinatura',
  'Aguardando assinaturas': '7 - Em Assinatura',
  // ── 8 - PAGAMENTO ─────────────────────────────────────────────────────────
  'Aguarda publicação no DOE da Resolução/SES para o repasse fundo a fundo': '8 - Pagamento',
  'Processo SIAFEM -  Fundo a Fundo': '8 - Pagamento',
  'Processo SIAFEM - Fundo a Fundo': '8 - Pagamento',
  'Resolução para Repasse Fundo a Fundo - DOE': '8 - Pagamento',
  'Em Análise de Admissibilidade do Órgão/Entidade - Segundo Remanejamento': '8 - Pagamento',
  // ── 9 - CONCLUÍDO ─────────────────────────────────────────────────────────
  'Convênio e/ou Repasse Fundo a Fundo - Concluído e recurso repassado': '9 - Concluído',
  'Demanda finalizada': '9 - Concluído',
  'Processo SIAFEM': '9 - Concluído',
  '**Emenda Paga': '9 - Concluído',
  'Demanda Concluída': '9 - Concluído',
  'Demanda parlamentar processada': '9 - Concluído',
  'Emenda Executada': '9 - Concluído',
  // ── 9.1 - CANCELADA ───────────────────────────────────────────────────────
  'Transferência Voluntária cancelada': '9.1 - Cancelada',
  'Demanda Cancelada': '9.1 - Cancelada',
  'Cancelada': '9.1 - Cancelada',
  'Demanda parlamentar cancelada': '9.1 - Cancelada',
  'Demanda Cancelada - Desistência do Beneficiário': '9.1 - Cancelada',
  'Excluída': '9.1 - Cancelada',
  'Em análise jurídica': '9.1 - Cancelada',
  // ── 9.2 - IMPEDIDA ────────────────────────────────────────────────────────
  'Impedida Tecnicamente': '9.2 - Impedida',
  'Transferência Voluntária contabilizada como impeditiva': '9.2 - Impedida',
  'Contabilizar em impedidas tecnicamente': '9.2 - Impedida',
  'Demanda parlamentar contabilizada como impeditiva': '9.2 - Impedida',
  // ── OUTRAS ÁREAS (sem mapeamento no sem papel oficial) ────────────────────
  'Em Processamento': 'Repasse Próprio Beneficiário',
  'Em análise de admissibilidade do Órgão Processador': 'Repasse Próprio Beneficiário',
  'Em Análise da Secretaria de Governo e Relações Institucionais': 'Secretaria de Governo',
  'Aguardando Análise da SGRI': 'Secretaria de Governo',
  'Em Análise da Secretaria de Governo e Relações Institucionais - Primeiro Remanejamento': 'Secretaria de Governo',
  'Em Análise da Secretaria de Governo e Relações Institucionais - SGRI': 'Secretaria de Governo',
  'Em processamento da Casa Civil': 'Casa Civil',
  'Aguardando Liberação da Casa Civil': 'Casa Civil',
  'Aguardando Processamento da Casa Civil': 'Casa Civil',
  'Preparando Comunicado ao Parlamentar': 'Casa Civil',
  'Encaminhar para Processamento na Secretaria': 'Casa Civil',
  'Aguardando emissão de comunicado ao parlamentar': 'Casa Civil',
  'Em Análise da Casa Civil': 'Casa Civil',
  'Aguardar Finalização': 'Impedimento Eleitoral',
  'Aguardando Termino do Impedimento Eleitoral': 'Impedimento Eleitoral',
  'Aguardando aprovação do comitê': 'Consultoria Jurídica',
  'Aguardando análise jurídica': 'Consultoria Jurídica',
  'Aguardando análise administrativa inicial - CDSA': 'Saúde Animal',
  'Aguardando análise administrativa - CDSA': 'Saúde Animal',
  'Em análise administrativa - CDSA': 'Saúde Animal',
  'Em análise administrativa inicial - CDSA': 'Saúde Animal',
  'Aguardando análise técnica - CDSA': 'Saúde Animal',
  'Aguardando análise orçamentária - CDSA': 'Saúde Animal',
  'Em análise técnica orçamentária coordenador - CDSA': 'Saúde Animal',
  'Em análise técnica - CDSA': 'Saúde Animal',
  'Em emissão parecer técnico coordenador - CDSA': 'Saúde Animal',
};

/** Deriva Área - Estágio a partir de situacao_demandas_sempapel.
 *  Fallback para area_estagio_situacao_demanda quando SemPapel está vazio.
 *  Tenta correspondência exata → depois padrões semânticos com nomes oficiais.
 *  Retorna string vazia quando não há dado (para não poluir células sem info). */
export function deriveAreaEstagio(r: { situacao_demandas_sempapel?: string | null; area_estagio_situacao_demanda?: string | null }): string {
  const sempapel = ((r.situacao_demandas_sempapel ?? '').trim()
    || (r.area_estagio_situacao_demanda ?? '').trim());
  if (!sempapel) return '';
  const exact = SEMPAPEL_AREA_MAP[sempapel];
  if (exact) return exact;
  const l = sempapel.toLowerCase();

  if (l.startsWith('demanda com o técnico'))                                      return '4 - CGOF - GGCON';
  if (l.startsWith('em análise da documentação'))                                 return '4 - CGOF - GGCON';
  if (l.startsWith('em análise do plano de trabalho'))                            return '4 - CGOF - GGCON';
  if (l.startsWith('aguardando documentação'))                                    return '1 - Beneficiário';
  if (l.startsWith('demanda em diligência documento'))                            return l.includes('crs') ? '3 - CRS' : '2 - DRS';
  if (l.startsWith('demanda em diligência plano de trabalho'))                    return l.includes('drs') ? '2 - DRS' : '3 - CRS';
  if (l.startsWith('demanda em diligência'))                                      return '1 - Beneficiário';
  if (l.startsWith('comitê gestor'))                                              return '4 - CGOF - GGCON';
  if (l.startsWith('outras pendências') || l.startsWith('outras pend'))          return '4 - CGOF - GGCON';
  if (l.startsWith('em conferência'))                                             return '4 - CGOF - GGCON';
  if (l.startsWith('conferência com pendência'))                                  return '4 - CGOF - GGCON';
  if (l.startsWith('laudas'))                                                     return '4.2 - CGOF - Financeiro';
  if (l.startsWith('publicação no doe'))                                          return '9 - Concluído';
  if (l.startsWith('anexar nota de reserva'))                                     return '4.2 - CGOF - Financeiro';
  if (l.startsWith('empenho cancelado'))                                          return '9.1 - Cancelada';
  if (l.startsWith('processo siafem'))                                            return '9 - Concluído';
  if (l.startsWith('em processo siafem'))                                         return '4.1 - CGOF - Orçamento';
  if (l.startsWith('parecer coordenador'))                                        return '4.3 - CGOF - Coordenador';
  if (l.startsWith('aprovação') && l.includes('chefia'))                         return '5 - Chefia de Gabinete';
  if (l.startsWith('aguardando aprovação do secretario'))                         return '6 - Secretário';
  if (l.includes('secretario') || l.includes('secretário'))                       return '6 - Secretário';
  if (l.startsWith('aguardando resolução para emissão') || l.includes('resolução para repasse fundo a fundo')) return '8 - Pagamento';
  if (l.includes('formalização da entidade'))                                     return '4 - CGOF - GGCON';
  if (l.startsWith('documentos beneficiário') || l.startsWith('documento beneficiário')) return '1 - Beneficiário';
  if (l.includes('beneficiário') || l.includes('beneficiario'))                   return '1 - Beneficiário';
  if (l.includes('licitatório') || l.includes('licitatorio'))                     return '1 - Beneficiário';
  if (l.includes('ggamb'))                                                         return '1 - Beneficiário';
  if (l.includes('cancelad') || l.includes('excluíd') || l.includes('excluida')) return '9.1 - Cancelada';
  if (l.includes('finaliz'))                                                       return '9 - Concluído';
  if (l.includes('impedid'))                                                       return '9.2 - Impedida';
  if (l.includes('em assinatura') || l.includes('aguardando assinatura'))         return '7 - Em Assinatura';
  if ((l.includes('formalização') || l.includes('emissão da minuta') || l.includes('emissão do parecer') || l.includes('instrução processual')) && !l.includes('drs') && !l.includes('crs')) return '4 - CGOF - GGCON';
  if (l.includes('crs'))                                                           return '3 - CRS';
  if (l.includes('drs'))                                                           return '2 - DRS';
  if (l.includes('casa civil'))                                                    return 'Casa Civil';
  if (l.includes('secretaria de governo') || l.includes('sgri'))                  return 'Secretaria de Governo';
  if (l.includes('siafem'))                                                        return l.includes('em processo') ? '4.1 - CGOF - Orçamento' : '9 - Concluído';
  if (l.includes('disponibilidade') && l.includes('orç'))                         return '4.1 - CGOF - Orçamento';
  if (l.includes('orçamento') || l.includes('fazenda') || l.includes('gco'))      return '4.1 - CGOF - Orçamento';
  if (l.includes('cgof'))                                                          return '4 - CGOF - GGCON';
  if (l.includes('empenho') || l.includes('pagamento') || l.includes('financ'))   return '4.2 - CGOF - Financeiro';
  if (l.includes('fundo a fundo'))                                                 return '8 - Pagamento';
  if (l.includes('cdsa') || l.includes('saúde animal'))                           return 'Saúde Animal';
  if (l.includes('validação plano de trabalho'))                                   return '1 - Beneficiário';
  if (l.includes('análise do objeto') && l.includes('css'))                       return '1 - Beneficiário';
  if (l.includes('cgcss') || l.includes('css'))                                   return '1 - Beneficiário';
  return sempapel;
}
