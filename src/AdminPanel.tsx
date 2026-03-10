import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, BarChart3, FileText, CheckCheck, ChevronDown, ChevronRight, Filter, Calendar, RefreshCw, Clock, TrendingUp, Upload, CheckCircle, XCircle } from 'lucide-react';
import Papa from 'papaparse';
import { useAuth } from './AuthContext';

// Mapeamento CSV headers → colunas da tabela emendas
const CSV_TO_EMENDAS_MAP: Record<string, string> = {
  'Detalhes da Demanda': 'detalhes',
  'Natureza': 'natureza',
  'Ano Referência': 'ano_refer',
  'Código/Nº Emenda': 'codigo_num',
  'Nº Emenda Agregadora': 'num_emenda',
  'Parecer LDO': 'parecer_ld',
  'Situação Emenda': 'situacao_e',
  'Situação Demanda': 'situacao_d',
  'Data da Última Tramitação Emenda': 'data_ult_e',
  'Data da Última Tramitação Demanda': 'data_ult_d',
  'Nº da Indicação': 'num_indicacao',
  'Parlamentar': 'parlamentar',
  'Partido': 'partido',
  'Tipo Beneficiário': 'tipo_beneficiario',
  'Beneficiário': 'beneficiario',
  'CNPJ': 'cnpj',
  'Município': 'municipio',
  'Objeto': 'objeto',
  'Órgão Entidade/Responsável': 'orgao_entidade',
  'Regional': 'regional',
  'Nº de Convênio': 'num_convenio',
  'Nº de Processo': 'num_processo',
  'Assinatura': 'data_assinatura',
  'Publicação': 'data_publicacao',
  'Agência': 'agencia',
  'Conta': 'conta',
  'Valor': 'valor',
  'Valor da Demanda': 'valor_desembolsado',
  'Portfólio': 'portfolio',
  'Qtd. Dias na Etapa': 'qtd_dias',
  'Vigência': 'vigencia',
  'Data da Primeira Notificação LOA Recebida pelo Beneficiário': 'data_prorrogacao',
  'Dados Bancários': 'dados_bancarios',
  'Status do Pagamento': 'status',
  'Data do Pagamento': 'data_pagamento',
  'Nº do Código Único': 'num_codigo',
  'Notas e Empenho': 'notas_empenho',
  'Valor Total Empenho': 'valor_total_empenhado',
  'Notas de Lançamento': 'notas_liquidacao',
  'Valor Total Lançamento': 'valor_total_liquidado',
  'Programações Desembolso': 'programa',
  'Valor Total Programação Desembolso': 'valor_total_pago',
  'Ordem Bancária': 'ordem_bancaria',
  'Data pagamento Ordem Bancária': 'data_paga',
  'Valor Total Ordem Bancária': 'valor_total_ordem_bancaria',
};

const NUMERIC_COLUMNS = new Set(['valor', 'valor_desembolsado', 'valor_total_empenhado', 'valor_total_liquidado', 'valor_total_pago', 'valor_total_ordem_bancaria']);
const INTEGER_COLUMNS = new Set(['qtd_dias']);

function parseBRNumber(val: string): number {
  if (!val || !/^[0-9.,]+$/.test(val.trim())) return 0;
  return parseFloat(val.trim().replace(/\./g, '').replace(',', '.')) || 0;
}

function mapCsvRowToEmendas(row: Record<string, string>): Record<string, any> | null {
  const mapped: Record<string, any> = {};
  for (const [csvHeader, dbColumn] of Object.entries(CSV_TO_EMENDAS_MAP)) {
    const val = row[csvHeader];
    if (val === undefined) continue;
    if (NUMERIC_COLUMNS.has(dbColumn)) {
      mapped[dbColumn] = parseBRNumber(val);
    } else if (INTEGER_COLUMNS.has(dbColumn)) {
      mapped[dbColumn] = /^\d+$/.test(val.trim()) ? parseInt(val.trim(), 10) : 0;
    } else {
      mapped[dbColumn] = val;
    }
  }
  if (!mapped.codigo_num || String(mapped.codigo_num).trim() === '') return null;
  return mapped;
}

// Categorias de situação para o quadro detalhado
const SITUACAO_CATEGORIAS = [
  { key: 'demandaComTecnico', label: 'Demanda C/ Técnico', short: 'C/ Técnico', match: ['DEMANDA COM O TÉCNICO'] },
  { key: 'emAnalise', label: 'Em Análise', short: 'Análise', match: ['EM ANÁLISE DA DOCUMENTAÇÃO', 'EM ANÁLISE DO PLANO DE TRABALHO'] },
  { key: 'agDoc', label: 'Ag. Doc.', short: 'Ag. Doc.', match: ['AGUARDANDO DOCUMENTAÇÃO'] },
  { key: 'diligencia', label: 'Diligência', short: 'Diligência', match: ['DEMANDA EM DILIGÊNCIA', 'DEMANDA EM DILIGÊNCIA DOCUMENTO', 'DEMANDA EM DILIGÊNCIA PLANO DE TRABALHO'] },
  { key: 'formalizacao', label: 'Formalização', short: 'Formaliz.', match: ['EM FORMALIZAÇÃO'] },
  { key: 'emConferencia', label: 'Em Conferência', short: 'Conferência', match: ['EM CONFERÊNCIA'] },
  { key: 'confPendencia', label: 'Conf / Pendência', short: 'Conf/Pend.', match: ['CONFERÊNCIA COM PENDÊNCIA'] },
  { key: 'emAssinatura', label: 'Em Assinatura', short: 'Assinatura', match: ['EM ASSINATURA'] },
  { key: 'laudasPubli', label: 'Laudas + Publi DOE', short: 'Laudas+DOE', match: ['LAUDAS', 'PUBLICAÇÃO NO DOE'] },
  { key: 'comiteGestor', label: 'Comitê Gestor', short: 'Comitê', match: ['COMITÊ GESTOR'] },
  { key: 'outrasPend', label: 'Outras Pend.', short: 'Outras', match: ['OUTRAS PENDÊNCIAS', 'EMPENHO CANCELADO', 'PROCESSO SIAFEM'] },
];

function matchSituacao(areaEstagio: string, matchPatterns: string[]): boolean {
  const upper = (areaEstagio || '').toUpperCase();
  return matchPatterns.some(pattern => upper.includes(pattern));
}

export function AdminPanel() {
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [rawFormalizacoes, setRawFormalizacoes] = useState<any[]>([]);

  // All collapsed by default
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({
    importarCSV: true,
    quadroTecnico: true,
    situacao: true,
    tempoTecnicos: true,
    concluidasTipo: true,
    topMunicipios: true,
    evolucaoMensal: true,
  });

  // Import CSV state
  const [importStatus, setImportStatus] = useState<'idle' | 'parsing' | 'uploading' | 'syncing' | 'done' | 'error'>('idle');
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filtroTecnico, setFiltroTecnico] = useState('');
  const [filtroRegional, setFiltroRegional] = useState('');
  const [filtroDataInicial, setFiltroDataInicial] = useState('');
  const [filtroDataFinal, setFiltroDataFinal] = useState('');
  const [filtrosAtivos, setFiltrosAtivos] = useState(false);

  const toggleCard = (cardId: string) => {
    setCollapsedCards(prev => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  const BATCH_SIZE = 200;

  const handleImportCSV = async (file: File) => {
    setImportStatus('parsing');
    setImportProgress(0);
    setImportTotal(0);
    setImportMessage('Lendo CSV...');
    setImportError('');

    const token = localStorage.getItem('auth_token');
    if (!token) {
      setImportStatus('error');
      setImportError('Token de autenticação não encontrado');
      return;
    }

    Papa.parse(file, {
      header: true,
      delimiter: ';',
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: async (results) => {
        const rows = results.data as Record<string, string>[];
        const mapped = rows.map(mapCsvRowToEmendas).filter((r): r is Record<string, any> => r !== null);

        // Deduplicate by codigo_num (keep last occurrence)
        const deduped = new Map<string, Record<string, any>>();
        for (const rec of mapped) {
          deduped.set(String(rec.codigo_num), rec);
        }
        const records = Array.from(deduped.values());

        if (records.length === 0) {
          setImportStatus('error');
          setImportError('Nenhum registro válido encontrado no CSV. Verifique se o delimitador é ";" e os cabeçalhos estão corretos.');
          return;
        }

        const totalBatches = Math.ceil(records.length / BATCH_SIZE);
        setImportTotal(records.length);
        setImportStatus('uploading');
        setImportMessage(`Enviando ${records.length} registros em ${totalBatches} lotes...`);

        let uploadedCount = 0;
        for (let i = 0; i < records.length; i += BATCH_SIZE) {
          const batch = records.slice(i, i + BATCH_SIZE);
          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          setImportMessage(`Enviando lote ${batchNum}/${totalBatches} (${Math.min(i + BATCH_SIZE, records.length)}/${records.length})...`);
          
          try {
            const resp = await fetch('/api/admin/import-emendas', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ records: batch }),
            });
            if (!resp.ok) {
              const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
              setImportStatus('error');
              setImportError(`Erro no lote ${batchNum}: ${err.error || resp.statusText}`);
              return;
            }
            uploadedCount += batch.length;
            setImportProgress(Math.round((uploadedCount / records.length) * 90));
          } catch (e: any) {
            setImportStatus('error');
            setImportError(`Erro de rede no lote ${batchNum}: ${e.message}`);
            return;
          }
        }

        // Sync emendas → formalizacao
        setImportStatus('syncing');
        setImportProgress(92);
        setImportMessage('Sincronizando emendas com formalizações...');

        try {
          const syncResp = await fetch('/api/admin/sync-emendas', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          });
          if (!syncResp.ok) {
            const err = await syncResp.json().catch(() => ({ error: 'Erro desconhecido' }));
            setImportStatus('error');
            setImportError(`Erro na sincronização: ${err.error || syncResp.statusText}`);
            return;
          }
          setImportProgress(100);
          setImportStatus('done');
          setImportMessage(`Importação concluída! ${records.length} emendas importadas e sincronizadas.`);
        } catch (e: any) {
          setImportStatus('error');
          setImportError(`Erro de rede na sincronização: ${e.message}`);
        }
      },
      error: (err) => {
        setImportStatus('error');
        setImportError(`Erro ao ler CSV: ${err.message}`);
      }
    });
  };

  const uniqueTecnicos = useMemo(() => {
    return Array.from(new Set(rawFormalizacoes.map((f: any) => f.tecnico || 'Sem Técnico'))).sort();
  }, [rawFormalizacoes]);

  // Filtered source data
  const filtered = useMemo(() => {
    if (!filtrosAtivos || !rawFormalizacoes.length) return rawFormalizacoes;
    let data = [...rawFormalizacoes];
    if (filtroTecnico) data = data.filter((f: any) => (f.tecnico || 'Sem Técnico') === filtroTecnico);
    if (filtroDataInicial) data = data.filter((f: any) => (f.data_entrada || f.created_at || '') >= filtroDataInicial);
    if (filtroDataFinal) data = data.filter((f: any) => (f.data_entrada || f.created_at || '') <= filtroDataFinal);
    return data;
  }, [rawFormalizacoes, filtrosAtivos, filtroTecnico, filtroDataInicial, filtroDataFinal]);

  // Dashboard summary
  const displayData = useMemo(() => {
    const source = filtered;
    if (!source.length && !dashboardData) return null;
    if (!source.length) return dashboardData;

    const totalEmendas = source.filter((f: any) => f.emenda && String(f.emenda).trim() !== '').length;
    const totalDemandas = source.filter((f: any) => f.demandas_formalizacao && String(f.demandas_formalizacao).trim() !== '').length;

    const situacoes = [
      'DEMANDA COM O TÉCNICO', 'EM ANÁLISE DA DOCUMENTAÇÃO', 'EM ANÁLISE DO PLANO DE TRABALHO',
      'AGUARDANDO DOCUMENTAÇÃO', 'DEMANDA EM DILIGÊNCIA', 'DEMANDA EM DILIGÊNCIA DOCUMENTO - DRS',
      'DEMANDA EM DILIGÊNCIA PLANO DE TRABALHO - CRS', 'COMITÊ GESTOR', 'OUTRAS PENDÊNCIAS',
      'EM FORMALIZAÇÃO', 'EM CONFERÊNCIA', 'CONFERÊNCIA COM PENDÊNCIA', 'EM ASSINATURA',
      'EMPENHO CANCELADO', 'LAUDAS', 'PUBLICAÇÃO NO DOE', 'PROCESSO SIAFEM'
    ];
    const situacaoMap = new Map<string, number>();
    situacoes.forEach(sit => {
      const count = source.filter((f: any) => (f.area_estagio_situacao_demanda || '').toUpperCase().includes(sit)).length;
      if (count > 0) situacaoMap.set(sit, count);
    });
    const distribuicaoSituacao = Array.from(situacaoMap.entries())
      .map(([situacao, count]) => ({ situacao, count }))
      .sort((a, b) => b.count - a.count);

    return { totalEmendas, totalDemandas, distribuicaoSituacao };
  }, [filtered, dashboardData]);

  // Quadro detalhado por técnico
  const quadroTecnico = useMemo(() => {
    const source = filtered;
    if (!source.length) return { rows: [] as any[], totals: null as any };

    const tecnicoMap = new Map<string, any>();

    source.forEach((f: any) => {
      const tecnico = f.tecnico || 'Sem Técnico';
      if (!tecnicoMap.has(tecnico)) {
        tecnicoMap.set(tecnico, {
          tecnico,
          recebidas: 0,
          ...Object.fromEntries(SITUACAO_CATEGORIAS.map(c => [c.key, 0])),
          totalGGCON: 0,
          concluida: 0,
          transfVol: 0,
          emendaLOA: 0,
        });
      }
      const row = tecnicoMap.get(tecnico)!;
      row.recebidas++;

      const concluida = f.concluida_em && String(f.concluida_em).trim() !== '';
      if (concluida) {
        row.concluida++;
        const tipo = (f.tipo_formalizacao || f.classificacao_emenda_demanda || '').toUpperCase();
        if (tipo.includes('TRANSFERÊNCIA') || tipo.includes('TRANSFERENCIA') || tipo.includes('VOLUNTÁRIA') || tipo.includes('VOLUNTARIA')) {
          row.transfVol++;
        } else {
          row.emendaLOA++;
        }
      } else {
        const areaEstagio = f.area_estagio_situacao_demanda || '';
        let matched = false;
        for (const cat of SITUACAO_CATEGORIAS) {
          if (matchSituacao(areaEstagio, cat.match)) {
            row[cat.key]++;
            matched = true;
            break;
          }
        }
        if (!matched) row.outrasPend++;
        row.totalGGCON++;
      }
    });

    const rows = Array.from(tecnicoMap.values()).sort((a, b) => b.recebidas - a.recebidas);

    const totals: any = {
      tecnico: 'Total',
      recebidas: 0,
      ...Object.fromEntries(SITUACAO_CATEGORIAS.map(c => [c.key, 0])),
      totalGGCON: 0,
      concluida: 0,
      transfVol: 0,
      emendaLOA: 0,
    };
    rows.forEach(r => {
      totals.recebidas += r.recebidas;
      SITUACAO_CATEGORIAS.forEach(c => { totals[c.key] += r[c.key]; });
      totals.totalGGCON += r.totalGGCON;
      totals.concluida += r.concluida;
      totals.transfVol += r.transfVol;
      totals.emendaLOA += r.emendaLOA;
    });

    return { rows, totals };
  }, [filtered]);

  // Tempo com técnicos
  const tempoComTecnicos = useMemo(() => {
    const hoje = new Date();
    return filtered
      .filter((f: any) => f.tecnico && (!f.concluida_em || String(f.concluida_em).trim() === ''))
      .map((f: any) => {
        const dataRef = f.data_recebimento_demanda || f.data_entrada || f.created_at || '';
        let dias = 0;
        if (dataRef) {
          const partes = dataRef.includes('/') ? dataRef.split('/') : null;
          const dt = partes ? new Date(+partes[2], +partes[1] - 1, +partes[0]) : new Date(dataRef);
          if (!isNaN(dt.getTime())) dias = Math.floor((hoje.getTime() - dt.getTime()) / (1000 * 60 * 60 * 24));
        }
        return { tecnico: f.tecnico, demanda: f.demandas_formalizacao || f.demanda || f.emenda || '—', dias, situacao: f.area_estagio_situacao_demanda || '—' };
      })
      .sort((a: any, b: any) => b.dias - a.dias);
  }, [filtered]);

  // Concluídas por tipo
  const concluidasPorTipo = useMemo(() => {
    const concluidas = filtered.filter((f: any) => f.concluida_em && String(f.concluida_em).trim() !== '');
    const tipoMap = new Map<string, number>();
    concluidas.forEach((f: any) => {
      const tipo = f.tipo_formalizacao || f.classificacao_emenda_demanda || 'Não Informado';
      tipoMap.set(tipo, (tipoMap.get(tipo) || 0) + 1);
    });
    return {
      total: concluidas.length,
      porTipo: Array.from(tipoMap.entries()).map(([tipo, count]) => ({ tipo, count })).sort((a, b) => b.count - a.count)
    };
  }, [filtered]);

  // Top Municípios
  const topMunicipios = useMemo(() => {
    const munMap = new Map<string, number>();
    filtered.forEach((f: any) => {
      const mun = f.municipio || '';
      if (mun.trim()) munMap.set(mun, (munMap.get(mun) || 0) + 1);
    });
    return Array.from(munMap.entries()).map(([municipio, count]) => ({ municipio, count })).sort((a, b) => b.count - a.count).slice(0, 15);
  }, [filtered]);

  // Evolução mensal
  const evolucaoMensal = useMemo(() => {
    const mesMap = new Map<string, { recebidas: number; concluidas: number }>();
    filtered.forEach((f: any) => {
      const dataStr = f.data_recebimento_demanda || f.data_entrada || '';
      if (!dataStr) return;
      let mes = '';
      if (dataStr.includes('/')) {
        const p = dataStr.split('/');
        if (p.length >= 3) mes = `${p[2]}-${p[1].padStart(2, '0')}`;
      } else {
        mes = dataStr.substring(0, 7);
      }
      if (!mes || mes.length < 7) return;
      if (!mesMap.has(mes)) mesMap.set(mes, { recebidas: 0, concluidas: 0 });
      mesMap.get(mes)!.recebidas++;
      if (f.concluida_em && String(f.concluida_em).trim() !== '') mesMap.get(mes)!.concluidas++;
    });
    return Array.from(mesMap.entries()).map(([mes, data]) => ({ mes, ...data })).sort((a, b) => a.mes.localeCompare(b.mes)).slice(-12);
  }, [filtered]);

  const carregarDashboard = async () => {
    try {
      setDashboardLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      const formRes = await fetch('/api/formalizacao', { headers: { 'Authorization': `Bearer ${token}` } });
      const formResult = formRes.ok ? await formRes.json() : [];
      const formalizacoes = Array.isArray(formResult) ? formResult : (formResult.data || []);
      setRawFormalizacoes(formalizacoes);

      const totalEmendas = formalizacoes.filter((f: any) => f.emenda && String(f.emenda).trim() !== '').length;
      const totalDemandas = formalizacoes.filter((f: any) => f.demandas_formalizacao && String(f.demandas_formalizacao).trim() !== '').length;

      const situacoes = [
        'DEMANDA COM O TÉCNICO', 'EM ANÁLISE DA DOCUMENTAÇÃO', 'EM ANÁLISE DO PLANO DE TRABALHO',
        'AGUARDANDO DOCUMENTAÇÃO', 'DEMANDA EM DILIGÊNCIA', 'DEMANDA EM DILIGÊNCIA DOCUMENTO - DRS',
        'DEMANDA EM DILIGÊNCIA PLANO DE TRABALHO - CRS', 'COMITÊ GESTOR', 'OUTRAS PENDÊNCIAS',
        'EM FORMALIZAÇÃO', 'EM CONFERÊNCIA', 'CONFERÊNCIA COM PENDÊNCIA', 'EM ASSINATURA',
        'EMPENHO CANCELADO', 'LAUDAS', 'PUBLICAÇÃO NO DOE', 'PROCESSO SIAFEM'
      ];
      const situacaoMap = new Map<string, number>();
      situacoes.forEach(situacao => {
        const count = formalizacoes.filter((f: any) => (f.area_estagio_situacao_demanda || '').toUpperCase().includes(situacao)).length;
        if (count > 0) situacaoMap.set(situacao, count);
      });
      const distribuicaoSituacao = Array.from(situacaoMap.entries()).map(([situacao, count]) => ({ situacao, count })).sort((a, b) => b.count - a.count);

      setDashboardData({ totalEmendas, totalDemandas, distribuicaoSituacao });
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => { carregarDashboard(); }, []);

  if (user?.role !== 'admin') return null;

  const cellValue = (val: number, variant: 'red' | 'dark' | 'green' = 'red') => {
    if (val === 0) return <span className="text-slate-300">—</span>;
    const colors = { red: 'bg-red-600 text-white', dark: 'bg-slate-800 text-white', green: 'bg-green-600 text-white' };
    return <span className={`inline-block px-2 py-0.5 rounded font-bold text-xs min-w-[28px] text-center ${colors[variant]}`}>{val}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-[#1351B4]" />
          <h3 className="text-base font-bold text-slate-800">Filtros</h3>
          {filtrosAtivos && <span className="ml-2 text-xs bg-[#1351B4] text-white px-2 py-0.5 rounded-full">Ativos</span>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Técnico</label>
            <select value={filtroTecnico} onChange={e => setFiltroTecnico(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/10 outline-none">
              <option value="">Todos</option>
              {uniqueTecnicos.map((t: string) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Data Inicial</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input type="date" value={filtroDataInicial} onChange={e => setFiltroDataInicial(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-700 focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/10 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Data Final</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input type="date" value={filtroDataFinal} onChange={e => setFiltroDataFinal(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-700 focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/10 outline-none" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <button onClick={() => setFiltrosAtivos(true)} className="flex-1 flex items-center justify-center gap-1.5 bg-[#1351B4] hover:bg-[#0C326F] text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors">
              <Filter className="w-4 h-4" /> Aplicar
            </button>
            <button onClick={() => { setFiltroTecnico(''); setFiltroDataInicial(''); setFiltroDataFinal(''); setFiltroRegional(''); setFiltrosAtivos(false); }} className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg px-4 py-2 transition-colors">
              <RefreshCw className="w-4 h-4" /> Limpar
            </button>
          </div>
        </div>
      </div>

      {/* ===== IMPORTAR CSV DE EMENDAS ===== */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <button onClick={() => toggleCard('importarCSV')} className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-500 to-violet-600 text-white hover:from-violet-600 hover:to-violet-700 transition-all">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            <h3 className="text-base font-bold">Importar CSV de Emendas</h3>
          </div>
          {collapsedCards['importarCSV'] ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        <AnimatePresence initial={false}>
          {!collapsedCards['importarCSV'] && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">
                  Selecione o CSV de emendas (delimitador <strong>;</strong>). O sistema importará os registros no banco e sincronizará automaticamente com a tabela de formalizações.
                </p>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImportCSV(f);
                    e.target.value = '';
                  }}
                />

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importStatus === 'uploading' || importStatus === 'syncing' || importStatus === 'parsing'}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-400 text-white text-sm font-semibold rounded-lg px-5 py-2.5 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Selecionar CSV
                  </button>
                  {importStatus === 'done' && (
                    <button
                      onClick={() => { setImportStatus('idle'); setImportProgress(0); setImportMessage(''); setImportError(''); }}
                      className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" /> Nova importação
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                {importStatus !== 'idle' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 font-medium">{importMessage}</span>
                      {importProgress > 0 && <span className="text-slate-500 font-bold">{importProgress}%</span>}
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${importProgress}%` }}
                        transition={{ duration: 0.3 }}
                        className={`h-full rounded-full transition-colors ${
                          importStatus === 'error' ? 'bg-red-500' :
                          importStatus === 'done' ? 'bg-green-500' :
                          'bg-violet-500'
                        }`}
                      />
                    </div>
                    {importTotal > 0 && importStatus === 'uploading' && (
                      <p className="text-xs text-slate-500">
                        {Math.round(importProgress * importTotal / 90)} de {importTotal} registros enviados
                      </p>
                    )}
                  </div>
                )}

                {/* Success message */}
                {importStatus === 'done' && (
                  <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-800 font-medium">{importMessage}</p>
                  </div>
                )}

                {/* Error message */}
                {importStatus === 'error' && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-800 font-medium">{importError}</p>
                      <button
                        onClick={() => { setImportStatus('idle'); setImportProgress(0); setImportMessage(''); setImportError(''); }}
                        className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  </div>
                )}

                {/* Status indicators */}
                {importStatus !== 'idle' && importStatus !== 'error' && (
                  <div className="flex items-center gap-6 text-xs text-slate-500">
                    <span className={`flex items-center gap-1.5 ${importStatus === 'parsing' ? 'text-violet-600 font-semibold' : importProgress > 0 ? 'text-green-600' : ''}`}>
                      {importProgress > 0 ? <CheckCircle className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      Leitura CSV
                    </span>
                    <span className={`flex items-center gap-1.5 ${importStatus === 'uploading' ? 'text-violet-600 font-semibold' : importProgress >= 90 ? 'text-green-600' : ''}`}>
                      {importProgress >= 90 ? <CheckCircle className="w-3.5 h-3.5" /> : importStatus === 'uploading' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />}
                      Upload
                    </span>
                    <span className={`flex items-center gap-1.5 ${importStatus === 'syncing' ? 'text-violet-600 font-semibold' : importStatus === 'done' ? 'text-green-600' : ''}`}>
                      {importStatus === 'done' ? <CheckCircle className="w-3.5 h-3.5" /> : importStatus === 'syncing' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />}
                      Sincronização
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Dashboard */}
      {dashboardLoading ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <RefreshCw className="w-8 h-8 text-[#1351B4] animate-spin mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Carregando dashboard...</p>
        </div>
      ) : displayData ? (
        <div className="space-y-5">
          {/* Cards resumo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-[#1351B4]/5 to-[#1351B4]/15 rounded-2xl p-6 border border-[#1351B4]/20 shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#1351B4] uppercase tracking-wider mb-2">Total de Emendas</p>
                  <p className="text-4xl font-bold text-[#0C326F]">{displayData.totalEmendas}</p>
                </div>
                <div className="bg-[#1351B4]/15 p-3 rounded-xl"><FileText className="text-[#1351B4] w-6 h-6" /></div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-br from-[#0C326F]/5 to-[#0C326F]/15 rounded-2xl p-6 border border-[#0C326F]/20 shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#0C326F] uppercase tracking-wider mb-2">Total de Demandas</p>
                  <p className="text-4xl font-bold text-[#0C326F]">{displayData.totalDemandas}</p>
                </div>
                <div className="bg-[#0C326F]/15 p-3 rounded-xl"><CheckCheck className="text-[#0C326F] w-6 h-6" /></div>
              </div>
            </motion.div>
          </div>

          {/* ===== QUADRO DETALHADO POR TÉCNICO ===== */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <button onClick={() => toggleCard('quadroTecnico')} className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#1351B4] to-[#0C326F] text-white hover:from-[#0C326F] hover:to-[#1351B4] transition-all">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                <h3 className="text-base font-bold">Quadro de Demandas por Técnico</h3>
                <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">{quadroTecnico.rows.length}</span>
              </div>
              {collapsedCards['quadroTecnico'] ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            <AnimatePresence initial={false}>
              {!collapsedCards['quadroTecnico'] && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="p-4">
                    {quadroTecnico.rows.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-800 text-white">
                              <th className="text-left px-3 py-3 font-bold whitespace-nowrap sticky left-0 bg-slate-800 z-10 min-w-[140px]">Técnico</th>
                              <th className="text-center px-2 py-3 font-bold whitespace-nowrap">Deman.<br/>Recebidas</th>
                              {SITUACAO_CATEGORIAS.map(cat => (
                                <th key={cat.key} className="text-center px-2 py-3 font-bold whitespace-nowrap">{cat.short}</th>
                              ))}
                              <th className="text-center px-2 py-3 font-bold whitespace-nowrap bg-slate-700">Total no<br/>GGCON</th>
                              <th className="text-center px-2 py-3 font-bold whitespace-nowrap bg-slate-700">Concluída</th>
                              <th className="text-center px-2 py-3 font-bold whitespace-nowrap bg-slate-700">Transf.<br/>Vol.</th>
                              <th className="text-center px-2 py-3 font-bold whitespace-nowrap bg-slate-700">Emenda<br/>LOA</th>
                            </tr>
                          </thead>
                          <tbody>
                            {quadroTecnico.rows.map((row: any, idx: number) => (
                              <tr key={idx} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                <td className={`px-3 py-2.5 font-semibold text-slate-900 whitespace-nowrap sticky left-0 z-10 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>{row.tecnico}</td>
                                <td className="px-2 py-2.5 text-center font-bold text-slate-800">{row.recebidas}</td>
                                {SITUACAO_CATEGORIAS.map(cat => (
                                  <td key={cat.key} className="px-2 py-2.5 text-center">{cellValue(row[cat.key])}</td>
                                ))}
                                <td className="px-2 py-2.5 text-center font-bold text-slate-800 bg-slate-50">{row.totalGGCON}</td>
                                <td className="px-2 py-2.5 text-center">{cellValue(row.concluida, 'dark')}</td>
                                <td className="px-2 py-2.5 text-center">{cellValue(row.transfVol, 'dark')}</td>
                                <td className="px-2 py-2.5 text-center">{cellValue(row.emendaLOA, 'dark')}</td>
                              </tr>
                            ))}
                          </tbody>
                          {quadroTecnico.totals && (
                            <tfoot>
                              <tr className="bg-slate-800 text-white font-bold">
                                <td className="px-3 py-3 sticky left-0 bg-slate-800 z-10">Total</td>
                                <td className="px-2 py-3 text-center">{quadroTecnico.totals.recebidas}</td>
                                {SITUACAO_CATEGORIAS.map(cat => (
                                  <td key={cat.key} className="px-2 py-3 text-center">{quadroTecnico.totals[cat.key] > 0 ? quadroTecnico.totals[cat.key] : '—'}</td>
                                ))}
                                <td className="px-2 py-3 text-center bg-slate-700">{quadroTecnico.totals.totalGGCON}</td>
                                <td className="px-2 py-3 text-center bg-slate-700">{quadroTecnico.totals.concluida}</td>
                                <td className="px-2 py-3 text-center bg-slate-700">{quadroTecnico.totals.transfVol}</td>
                                <td className="px-2 py-3 text-center bg-slate-700">{quadroTecnico.totals.emendaLOA}</td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    ) : (
                      <p className="text-slate-500 text-center py-8">Nenhum técnico atribuído</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ===== DISTRIBUIÇÃO DE SITUAÇÃO ===== */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <button onClick={() => toggleCard('situacao')} className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#1351B4] to-[#0C326F] text-white hover:from-[#0C326F] hover:to-[#1351B4] transition-all">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                <h3 className="text-base font-bold">Distribuição de Situação da Demanda</h3>
              </div>
              {collapsedCards['situacao'] ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            <AnimatePresence initial={false}>
              {!collapsedCards['situacao'] && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="p-6">
                    {displayData.distribuicaoSituacao.length > 0 ? (
                      <div className="space-y-4">
                        {displayData.distribuicaoSituacao.map((item: any, idx: number) => {
                          const maxCount = Math.max(...displayData.distribuicaoSituacao.map((i: any) => i.count));
                          const percentage = (item.count / maxCount) * 100;
                          return (
                            <div key={idx} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold text-slate-700 flex-1 pr-4">{item.situacao}</label>
                                <div className="bg-[#1351B4]/10 text-[#1351B4] px-3 py-1 rounded-full font-bold text-sm min-w-12 text-center">{item.count}</div>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full bg-gradient-to-r from-[#1351B4] to-[#0C326F] rounded-full shadow-md" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="bg-slate-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4"><AlertCircle className="text-slate-400 w-8 h-8" /></div>
                        <p className="text-slate-500 font-medium">Nenhuma demanda com situação definida</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ===== TEMPO COM TÉCNICOS ===== */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <button onClick={() => toggleCard('tempoTecnicos')} className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 transition-all">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <h3 className="text-base font-bold">Tempo das Demandas com Técnicos</h3>
                <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">{tempoComTecnicos.length}</span>
              </div>
              {collapsedCards['tempoTecnicos'] ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            <AnimatePresence initial={false}>
              {!collapsedCards['tempoTecnicos'] && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="p-6">
                    {tempoComTecnicos.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b-2 border-amber-200">
                              <th className="text-left px-4 py-3 font-bold text-slate-700">Técnico</th>
                              <th className="text-left px-4 py-3 font-bold text-slate-700">Demanda</th>
                              <th className="text-center px-4 py-3 font-bold text-slate-700">Dias</th>
                              <th className="text-left px-4 py-3 font-bold text-slate-700">Situação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tempoComTecnicos.map((item: any, idx: number) => (
                              <tr key={idx} className="border-b border-slate-100 hover:bg-amber-50/50 transition-colors">
                                <td className="px-4 py-3 font-medium text-slate-900">{item.tecnico}</td>
                                <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={item.demanda}>{item.demanda}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-block px-3 py-1 rounded-full font-semibold text-xs ${item.dias > 30 ? 'bg-red-100 text-red-700' : item.dias > 15 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                    {item.dias} dias
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-600 text-xs">{item.situacao}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-slate-500 text-center py-8">Nenhuma demanda não concluída com técnico atribuído</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ===== CONCLUÍDAS POR TIPO ===== */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <button onClick={() => toggleCard('concluidasTipo')} className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-all">
              <div className="flex items-center gap-2">
                <CheckCheck className="w-5 h-5" />
                <h3 className="text-base font-bold">Concluídas por Tipo</h3>
                <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">{concluidasPorTipo.total}</span>
              </div>
              {collapsedCards['concluidasTipo'] ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            <AnimatePresence initial={false}>
              {!collapsedCards['concluidasTipo'] && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="p-6">
                    {concluidasPorTipo.porTipo.length > 0 ? (
                      <div className="space-y-4">
                        {concluidasPorTipo.porTipo.map((item: any, idx: number) => {
                          const maxCount = Math.max(...concluidasPorTipo.porTipo.map((i: any) => i.count));
                          const percentage = (item.count / maxCount) * 100;
                          return (
                            <div key={idx} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold text-slate-700 flex-1 pr-4">{item.tipo}</label>
                                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold text-sm min-w-12 text-center">{item.count}</div>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full shadow-md" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="bg-slate-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4"><AlertCircle className="text-slate-400 w-8 h-8" /></div>
                        <p className="text-slate-500 font-medium">Nenhuma demanda concluída</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ===== TOP MUNICÍPIOS ===== */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <button onClick={() => toggleCard('topMunicipios')} className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 transition-all">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                <h3 className="text-base font-bold">Top 15 Municípios</h3>
              </div>
              {collapsedCards['topMunicipios'] ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            <AnimatePresence initial={false}>
              {!collapsedCards['topMunicipios'] && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="p-6">
                    {topMunicipios.length > 0 ? (
                      <div className="space-y-3">
                        {topMunicipios.map((item: any, idx: number) => {
                          const maxCount = Math.max(...topMunicipios.map((i: any) => i.count));
                          const percentage = (item.count / maxCount) * 100;
                          return (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700 flex-1 pr-4 flex items-center gap-2">
                                  <span className="text-xs text-slate-400 font-bold w-5 text-right">{idx + 1}.</span>
                                  {item.municipio}
                                </span>
                                <div className="bg-indigo-100 text-indigo-700 px-3 py-0.5 rounded-full font-bold text-xs min-w-10 text-center">{item.count}</div>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden ml-7">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.8, delay: idx * 0.05, ease: 'easeOut' }} className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-center py-8">Nenhum município encontrado</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ===== EVOLUÇÃO MENSAL ===== */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <button onClick={() => toggleCard('evolucaoMensal')} className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700 transition-all">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <h3 className="text-base font-bold">Evolução Mensal (Últimos 12 meses)</h3>
              </div>
              {collapsedCards['evolucaoMensal'] ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            <AnimatePresence initial={false}>
              {!collapsedCards['evolucaoMensal'] && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="p-6">
                    {evolucaoMensal.length > 0 ? (
                      <>
                        <div className="flex items-end gap-2 h-48 mb-4">
                          {(() => {
                            const maxVal = Math.max(...evolucaoMensal.map(m => Math.max(m.recebidas, m.concluidas)));
                            return evolucaoMensal.map((item, idx) => (
                              <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                                <div className="flex gap-0.5 items-end h-full w-full justify-center">
                                  <motion.div initial={{ height: 0 }} animate={{ height: `${maxVal > 0 ? (item.recebidas / maxVal) * 100 : 0}%` }} transition={{ duration: 0.6, delay: idx * 0.05 }} className="w-3 bg-teal-400 rounded-t min-h-[2px]" title={`Recebidas: ${item.recebidas}`} />
                                  <motion.div initial={{ height: 0 }} animate={{ height: `${maxVal > 0 ? (item.concluidas / maxVal) * 100 : 0}%` }} transition={{ duration: 0.6, delay: idx * 0.05 + 0.1 }} className="w-3 bg-green-500 rounded-t min-h-[2px]" title={`Concluídas: ${item.concluidas}`} />
                                </div>
                                <span className="text-[10px] text-slate-500 whitespace-nowrap transform -rotate-45 origin-center mt-1">
                                  {item.mes.substring(5)}/{item.mes.substring(2, 4)}
                                </span>
                              </div>
                            ));
                          })()}
                        </div>
                        <div className="flex items-center justify-center gap-6 text-xs text-slate-600">
                          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-teal-400 rounded" /> Recebidas</span>
                          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-500 rounded" /> Concluídas</span>
                        </div>
                        <div className="mt-4 overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-slate-200">
                                <th className="text-left px-2 py-2 font-bold text-slate-600">Mês</th>
                                {evolucaoMensal.map((m, i) => <th key={i} className="text-center px-1 py-2 font-semibold text-slate-500">{m.mes.substring(5)}/{m.mes.substring(2, 4)}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-slate-100">
                                <td className="px-2 py-1.5 font-semibold text-teal-600">Recebidas</td>
                                {evolucaoMensal.map((m, i) => <td key={i} className="text-center px-1 py-1.5 font-medium">{m.recebidas || '—'}</td>)}
                              </tr>
                              <tr>
                                <td className="px-2 py-1.5 font-semibold text-green-600">Concluídas</td>
                                {evolucaoMensal.map((m, i) => <td key={i} className="text-center px-1 py-1.5 font-medium">{m.concluidas || '—'}</td>)}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <p className="text-slate-500 text-center py-8">Nenhum dado de evolução mensal disponível</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
