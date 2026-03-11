import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, BarChart3, FileText, CheckCheck, ChevronDown, ChevronRight, Filter, Calendar, RefreshCw, Clock, TrendingUp, AlertTriangle, MapPin, Users, UserCheck, BookOpen, Send, Zap, PieChart } from 'lucide-react';
import { useAuth } from './AuthContext';

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

const COLORS = ['#1351B4', '#0C326F', '#2670E8', '#155BCB', '#3F8EFC', '#1A73E8', '#4285F4', '#5B9CF4', '#7CB3F7', '#A0C8FA', '#0D47A1', '#1565C0', '#1976D2', '#1E88E5', '#2196F3'];

function matchSituacao(areaEstagio: string, matchPatterns: string[]): boolean {
  const upper = (areaEstagio || '').toUpperCase();
  return matchPatterns.some(pattern => upper.includes(pattern));
}

function parseDate(str: string): Date | null {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (!trimmed) return null;
  if (trimmed.includes('/')) {
    const p = trimmed.split('/');
    if (p.length >= 3) { const d = new Date(+p[2], +p[1] - 1, +p[0]); return isNaN(d.getTime()) ? null : d; }
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function CollapsibleCard({ id, title, icon: Icon, count, color, collapsed, toggle, children }: {
  id: string; title: string; icon: any; count?: number; color: string; collapsed: boolean; toggle: () => void; children: React.ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      <button onClick={toggle} className={`w-full flex items-center justify-between px-6 py-4 ${color} text-white transition-all`}>
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          <h3 className="text-base font-bold">{title}</h3>
          {count !== undefined && <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">{count}</span>}
        </div>
        {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="p-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function HorizontalBar({ items, colorFrom, colorTo }: { items: { label: string; value: number }[]; colorFrom: string; colorTo: string }) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700 flex-1 pr-4">{item.label}</span>
            <div className={`${colorFrom.includes('green') ? 'bg-green-100 text-green-700' : colorFrom.includes('indigo') ? 'bg-indigo-100 text-indigo-700' : colorFrom.includes('amber') ? 'bg-amber-100 text-amber-700' : colorFrom.includes('red') ? 'bg-red-100 text-red-700' : 'bg-[#1351B4]/10 text-[#1351B4]'} px-3 py-1 rounded-full font-bold text-sm min-w-12 text-center`}>{item.value}</div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${(item.value / max) * 100}%` }} transition={{ duration: 0.8, delay: idx * 0.03, ease: 'easeOut' }} className={`h-full bg-gradient-to-r ${colorFrom} ${colorTo} rounded-full shadow-md`} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminPanel() {
  const { user } = useAuth();

  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [rawFormalizacoes, setRawFormalizacoes] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);

  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({
    quadroTecnico: true,
    situacao: true,
    detalheSituacao: true,
    tempoTecnicos: true,
    topMunicipios: true,
    evolucaoMensal: true,
    demandasRegional: true,
    conferencistas: true,
    atrasadas: true,
    publicacoesMes: true,
    diligencias: true,
    taxaConclusao: true,
    tempoMedioAnalise: true,
  });

  const [expandedSituacoes, setExpandedSituacoes] = useState<Set<string>>(new Set());

  const [filtroTecnico, setFiltroTecnico] = useState('');
  const [filtroRegional, setFiltroRegional] = useState('');
  const [filtroDataInicial, setFiltroDataInicial] = useState('');
  const [filtroDataFinal, setFiltroDataFinal] = useState('');
  const [filtrosAtivos, setFiltrosAtivos] = useState(false);

  const toggle = (id: string) => setCollapsedCards(prev => ({ ...prev, [id]: !prev[id] }));

  const uniqueTecnicos = useMemo(() => {
    return Array.from(new Set(rawFormalizacoes.map((f: any) => f.tecnico || 'Sem Técnico'))).sort();
  }, [rawFormalizacoes]);

  const uniqueRegionais = useMemo(() => {
    return Array.from(new Set(rawFormalizacoes.map((f: any) => f.regional || '').filter(Boolean))).sort();
  }, [rawFormalizacoes]);

  const filtered = useMemo(() => {
    if (!filtrosAtivos || !rawFormalizacoes.length) return rawFormalizacoes;
    let data = [...rawFormalizacoes];
    if (filtroTecnico) data = data.filter((f: any) => (f.tecnico || 'Sem Técnico') === filtroTecnico);
    if (filtroRegional) data = data.filter((f: any) => (f.regional || '') === filtroRegional);
    if (filtroDataInicial) data = data.filter((f: any) => (f.data_entrada || f.created_at || '') >= filtroDataInicial);
    if (filtroDataFinal) data = data.filter((f: any) => (f.data_entrada || f.created_at || '') <= filtroDataFinal);
    return data;
  }, [rawFormalizacoes, filtrosAtivos, filtroTecnico, filtroRegional, filtroDataInicial, filtroDataFinal]);

  // === METRICS ===

  const displayData = useMemo(() => {
    const source = filtered;
    if (!source.length) return null;
    const totalEmendas = source.filter((f: any) => f.emenda && String(f.emenda).trim() !== '').length;
    const totalDemandas = source.filter((f: any) => f.demandas_formalizacao && String(f.demandas_formalizacao).trim() !== '').length;
    const concluidas = source.filter((f: any) => f.concluida_em && String(f.concluida_em).trim() !== '').length;
    const emAndamento = source.length - concluidas;
    const publicadas = source.filter((f: any) => f.publicacao && String(f.publicacao).trim() !== '').length;

    const situacoes = [
      'DEMANDA COM O TÉCNICO', 'EM ANÁLISE DA DOCUMENTAÇÃO', 'EM ANÁLISE DO PLANO DE TRABALHO',
      'AGUARDANDO DOCUMENTAÇÃO', 'DEMANDA EM DILIGÊNCIA', 'DEMANDA EM DILIGÊNCIA DOCUMENTO',
      'DEMANDA EM DILIGÊNCIA PLANO DE TRABALHO', 'COMITÊ GESTOR', 'OUTRAS PENDÊNCIAS',
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

    return { totalEmendas, totalDemandas, concluidas, emAndamento, publicadas, distribuicaoSituacao };
  }, [filtered]);

  // Detalhamento por situação da demanda (agrupado por area_estagio_situacao_demanda)
  const detalhamentoPorSituacao = useMemo(() => {
    const source = filtered.filter((f: any) => !f.concluida_em || String(f.concluida_em).trim() === '');
    const situacaoMap = new Map<string, any[]>();
    source.forEach((f: any) => {
      const sit = (f.area_estagio_situacao_demanda || '').trim();
      const key = sit || 'SEM SITUAÇÃO DEFINIDA';
      if (!situacaoMap.has(key)) situacaoMap.set(key, []);
      situacaoMap.get(key)!.push({
        tecnico: f.tecnico || 'Sem Técnico',
        demanda: f.demandas_formalizacao || f.demanda || f.emenda || '—',
        municipio: f.municipio || '—',
        data_liberacao: f.data_liberacao || '—',
        data_analise_demanda: f.data_analise_demanda || '—',
        data_liberacao_assinatura_conferencista: f.data_liberacao_assinatura_conferencista || '—',
      });
    });
    return Array.from(situacaoMap.entries())
      .map(([situacao, demandas]) => ({ situacao, demandas, count: demandas.length }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  // Quadro detalhado por técnico
  const quadroTecnico = useMemo(() => {
    const source = filtered;
    if (!source.length) return { rows: [] as any[], totals: null as any };
    const tecnicoMap = new Map<string, any>();
    source.forEach((f: any) => {
      const tecnico = f.tecnico || 'Sem Técnico';
      if (!tecnicoMap.has(tecnico)) {
        tecnicoMap.set(tecnico, {
          tecnico, recebidas: 0,
          ...Object.fromEntries(SITUACAO_CATEGORIAS.map(c => [c.key, 0])),
          totalGGCON: 0, concluida: 0, transfVol: 0, emendaLOA: 0,
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
        } else { row.emendaLOA++; }
      } else {
        const areaEstagio = f.area_estagio_situacao_demanda || '';
        const hasDataLiberacao = f.data_liberacao && String(f.data_liberacao).trim() !== '';
        let matched = false;
        // C/Técnico: tem data_liberacao E area_estagio vazia
        if (hasDataLiberacao && !areaEstagio.trim()) {
          row.demandaComTecnico++;
          matched = true;
        } else {
          for (const cat of SITUACAO_CATEGORIAS) {
            if (matchSituacao(areaEstagio, cat.match)) { row[cat.key]++; matched = true; break; }
          }
        }
        if (!matched) row.outrasPend++;
        row.totalGGCON++;
      }
    });
    const rows = Array.from(tecnicoMap.values()).sort((a, b) => b.recebidas - a.recebidas);
    const totals: any = {
      tecnico: 'Total', recebidas: 0,
      ...Object.fromEntries(SITUACAO_CATEGORIAS.map(c => [c.key, 0])),
      totalGGCON: 0, concluida: 0, transfVol: 0, emendaLOA: 0,
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
        const dt = parseDate(f.data_recebimento_demanda || f.data_entrada || f.created_at || '');
        const dias = dt ? daysBetween(dt, hoje) : 0;
        return { tecnico: f.tecnico, demanda: f.demandas_formalizacao || f.demanda || f.emenda || '—', dias, situacao: f.area_estagio_situacao_demanda || '—' };
      })
      .sort((a: any, b: any) => b.dias - a.dias);
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

  // Evolução mensal por técnico (últimos 12 meses)
  const evolucaoMensal = useMemo(() => {
    const tecnicoMesMap = new Map<string, Map<string, { recebidas: number; concluidas: number }>>();
    const allMeses = new Set<string>();
    filtered.forEach((f: any) => {
      const tecnico = f.tecnico || 'Sem Técnico';
      const dataStr = f.data_recebimento_demanda || f.data_entrada || '';
      if (!dataStr) return;
      let mes = '';
      if (dataStr.includes('/')) {
        const p = dataStr.split('/');
        if (p.length >= 3) mes = `${p[2]}-${p[1].padStart(2, '0')}`;
      } else { mes = dataStr.substring(0, 7); }
      if (!mes || mes.length < 7) return;
      allMeses.add(mes);
      if (!tecnicoMesMap.has(tecnico)) tecnicoMesMap.set(tecnico, new Map());
      const mesMap = tecnicoMesMap.get(tecnico)!;
      if (!mesMap.has(mes)) mesMap.set(mes, { recebidas: 0, concluidas: 0 });
      mesMap.get(mes)!.recebidas++;
      if (f.concluida_em && String(f.concluida_em).trim() !== '') mesMap.get(mes)!.concluidas++;
    });
    const meses = Array.from(allMeses).sort().slice(-12);
    const tecnicos = Array.from(tecnicoMesMap.keys()).sort();
    return { meses, tecnicos, data: tecnicoMesMap };
  }, [filtered]);

  // Demandas por Regional
  const demandasRegional = useMemo(() => {
    const regMap = new Map<string, { total: number; concluidas: number; pendentes: number }>();
    filtered.forEach((f: any) => {
      const reg = f.regional || 'Não Informada';
      if (!regMap.has(reg)) regMap.set(reg, { total: 0, concluidas: 0, pendentes: 0 });
      const r = regMap.get(reg)!;
      r.total++;
      if (f.concluida_em && String(f.concluida_em).trim() !== '') r.concluidas++;
      else r.pendentes++;
    });
    return Array.from(regMap.entries()).map(([regional, data]) => ({ regional, ...data })).sort((a, b) => b.total - a.total);
  }, [filtered]);

  // Demandas por Conferencista
  const demandasConferencista = useMemo(() => {
    const confMap = new Map<string, { total: number; conferidas: number; pendentes: number }>();
    filtered.forEach((f: any) => {
      const conf = f.conferencista || 'Sem Conferencista';
      if (!confMap.has(conf)) confMap.set(conf, { total: 0, conferidas: 0, pendentes: 0 });
      const c = confMap.get(conf)!;
      c.total++;
      if (f.data_liberacao_assinatura_conferencista && String(f.data_liberacao_assinatura_conferencista).trim() !== '') c.conferidas++;
      else c.pendentes++;
    });
    return Array.from(confMap.entries()).map(([conferencista, data]) => ({ conferencista, ...data })).sort((a, b) => b.total - a.total);
  }, [filtered]);

  // Demandas Atrasadas (>30 dias sem conclusão)
  const demandasAtrasadas = useMemo(() => {
    const hoje = new Date();
    return filtered
      .filter((f: any) => {
        if (f.concluida_em && String(f.concluida_em).trim() !== '') return false;
        const dt = parseDate(f.data_recebimento_demanda || f.data_entrada || f.created_at || '');
        return dt ? daysBetween(dt, hoje) > 30 : false;
      })
      .map((f: any) => {
        const dt = parseDate(f.data_recebimento_demanda || f.data_entrada || f.created_at || '')!;
        const dias = daysBetween(dt, hoje);
        return {
          tecnico: f.tecnico || 'Sem Técnico',
          demanda: f.demandas_formalizacao || f.demanda || f.emenda || '—',
          dias,
          situacao: f.area_estagio_situacao_demanda || '—',
          regional: f.regional || '—',
        };
      })
      .sort((a, b) => b.dias - a.dias);
  }, [filtered]);

  // Publicações por mês
  const publicacoesMes = useMemo(() => {
    const mesMap = new Map<string, number>();
    filtered.forEach((f: any) => {
      const pubStr = f.publicacao || '';
      if (!pubStr.trim()) return;
      const dt = parseDate(pubStr);
      if (!dt) return;
      const mes = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      mesMap.set(mes, (mesMap.get(mes) || 0) + 1);
    });
    return Array.from(mesMap.entries()).map(([mes, count]) => ({ mes, count })).sort((a, b) => a.mes.localeCompare(b.mes)).slice(-12);
  }, [filtered]);

  // Diligências em aberto
  const diligenciasAberto = useMemo(() => {
    const diligencias = filtered.filter((f: any) => {
      const sit = (f.area_estagio_situacao_demanda || '').toUpperCase();
      return sit.includes('DILIGÊNCIA') || sit.includes('DILIGENCIA');
    });
    const porTecnico = new Map<string, number>();
    diligencias.forEach((f: any) => {
      const t = f.tecnico || 'Sem Técnico';
      porTecnico.set(t, (porTecnico.get(t) || 0) + 1);
    });
    return {
      total: diligencias.length,
      porTecnico: Array.from(porTecnico.entries()).map(([tecnico, count]) => ({ tecnico, count })).sort((a, b) => b.count - a.count),
    };
  }, [filtered]);

  // Taxa de conclusão por técnico
  const taxaConclusao = useMemo(() => {
    const tecMap = new Map<string, { total: number; concluidas: number }>();
    filtered.forEach((f: any) => {
      const t = f.tecnico || 'Sem Técnico';
      if (!tecMap.has(t)) tecMap.set(t, { total: 0, concluidas: 0 });
      const r = tecMap.get(t)!;
      r.total++;
      if (f.concluida_em && String(f.concluida_em).trim() !== '') r.concluidas++;
    });
    return Array.from(tecMap.entries())
      .map(([tecnico, data]) => ({ tecnico, ...data, taxa: data.total > 0 ? Math.round((data.concluidas / data.total) * 100) : 0 }))
      .sort((a, b) => b.taxa - a.taxa);
  }, [filtered]);

  // Tempo médio de análise por técnico
  const tempoMedioAnalise = useMemo(() => {
    const tecMap = new Map<string, number[]>();
    filtered.forEach((f: any) => {
      if (!f.tecnico) return;
      const dtReceb = parseDate(f.data_recebimento_demanda || f.data_entrada || '');
      const dtAnalise = parseDate(f.data_analise_demanda || '');
      if (!dtReceb || !dtAnalise) return;
      const dias = daysBetween(dtReceb, dtAnalise);
      if (dias < 0 || dias > 365) return;
      if (!tecMap.has(f.tecnico)) tecMap.set(f.tecnico, []);
      tecMap.get(f.tecnico)!.push(dias);
    });
    return Array.from(tecMap.entries())
      .map(([tecnico, dias]) => ({ tecnico, mediaDias: Math.round(dias.reduce((a, b) => a + b, 0) / dias.length), qtd: dias.length }))
      .sort((a, b) => a.mediaDias - b.mediaDias);
  }, [filtered]);

  // === DATA FETCHING - ALL RECORDS ===

  const carregarDashboard = async () => {
    try {
      setDashboardLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      let allData: any[] = [];
      let offset = 0;
      const batchSize = 1000;
      while (true) {
        const res = await fetch(`/api/formalizacao?limit=${batchSize}&offset=${offset}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) break;
        const result = await res.json();
        const batch = Array.isArray(result) ? result : (result.data || []);
        allData = allData.concat(batch);
        if (batch.length < batchSize) break;
        offset += batchSize;
      }
      setRawFormalizacoes(allData);
      setTotalRecords(allData.length);
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
          <h3 className="text-base font-bold text-slate-800">Filtros do Dashboard</h3>
          {filtrosAtivos && <span className="ml-2 text-xs bg-[#1351B4] text-white px-2 py-0.5 rounded-full">Ativos</span>}
          <span className="ml-auto text-xs text-slate-500 font-medium">{totalRecords.toLocaleString()} registros carregados</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Técnico</label>
            <select value={filtroTecnico} onChange={e => setFiltroTecnico(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/10 outline-none">
              <option value="">Todos</option>
              {uniqueTecnicos.map((t: string) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Regional</label>
            <select value={filtroRegional} onChange={e => setFiltroRegional(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/10 outline-none">
              <option value="">Todas</option>
              {uniqueRegionais.map((r: string) => <option key={r} value={r}>{r}</option>)}
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
            <button onClick={() => { setFiltroTecnico(''); setFiltroRegional(''); setFiltroDataInicial(''); setFiltroDataFinal(''); setFiltrosAtivos(false); }} className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg px-4 py-2 transition-colors">
              <RefreshCw className="w-4 h-4" /> Limpar
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard */}
      {dashboardLoading ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <RefreshCw className="w-8 h-8 text-[#1351B4] animate-spin mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Carregando todos os dados da formalização...</p>
        </div>
      ) : displayData ? (
        <div className="space-y-5">

          {/* ===== CARDS RESUMO ===== */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-[#1351B4]/5 to-[#1351B4]/15 rounded-2xl p-5 border border-[#1351B4]/20 shadow-md">
              <p className="text-xs font-semibold text-[#1351B4] uppercase tracking-wider mb-1">Total Emendas</p>
              <p className="text-3xl font-bold text-[#0C326F]">{displayData.totalEmendas.toLocaleString()}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-gradient-to-br from-[#0C326F]/5 to-[#0C326F]/15 rounded-2xl p-5 border border-[#0C326F]/20 shadow-md">
              <p className="text-xs font-semibold text-[#0C326F] uppercase tracking-wider mb-1">Total Demandas</p>
              <p className="text-3xl font-bold text-[#0C326F]">{displayData.totalDemandas.toLocaleString()}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-5 border border-green-200 shadow-md">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">Concluídas</p>
              <p className="text-3xl font-bold text-green-800">{displayData.concluidas.toLocaleString()}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-5 border border-amber-200 shadow-md">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Em Andamento</p>
              <p className="text-3xl font-bold text-amber-800">{displayData.emAndamento.toLocaleString()}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-2xl p-5 border border-violet-200 shadow-md">
              <p className="text-xs font-semibold text-violet-700 uppercase tracking-wider mb-1">Publicadas</p>
              <p className="text-3xl font-bold text-violet-800">{displayData.publicadas.toLocaleString()}</p>
            </motion.div>
          </div>

          {/* ===== QUADRO DETALHADO POR TÉCNICO ===== */}
          <CollapsibleCard id="quadroTecnico" title="Quadro de Demandas por Técnico" icon={BarChart3} count={quadroTecnico.rows.length} color="bg-gradient-to-r from-[#1351B4] to-[#0C326F] hover:from-[#0C326F] hover:to-[#1351B4]" collapsed={collapsedCards.quadroTecnico} toggle={() => toggle('quadroTecnico')}>
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
            ) : <p className="text-slate-500 text-center py-8">Nenhum técnico atribuído</p>}
          </CollapsibleCard>

          {/* ===== TAXA DE CONCLUSÃO POR TÉCNICO ===== */}
          <CollapsibleCard id="taxaConclusao" title="Taxa de Conclusão por Técnico" icon={Zap} count={taxaConclusao.length} color="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700" collapsed={collapsedCards.taxaConclusao} toggle={() => toggle('taxaConclusao')}>
            {taxaConclusao.length > 0 ? (
              <div className="space-y-3">
                {taxaConclusao.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700 flex-1 pr-4">{item.tecnico}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{item.concluidas}/{item.total}</span>
                        <div className={`px-3 py-1 rounded-full font-bold text-sm min-w-16 text-center ${item.taxa >= 70 ? 'bg-green-100 text-green-700' : item.taxa >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{item.taxa}%</div>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${item.taxa}%` }} transition={{ duration: 0.8, delay: idx * 0.03 }} className={`h-full rounded-full shadow-md ${item.taxa >= 70 ? 'bg-gradient-to-r from-green-400 to-green-600' : item.taxa >= 40 ? 'bg-gradient-to-r from-amber-400 to-amber-600' : 'bg-gradient-to-r from-red-400 to-red-600'}`} />
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-slate-500 text-center py-8">Sem dados</p>}
          </CollapsibleCard>

          {/* ===== TEMPO MÉDIO DE ANÁLISE POR TÉCNICO ===== */}
          <CollapsibleCard id="tempoMedioAnalise" title="Tempo Médio de Análise por Técnico (dias)" icon={Clock} count={tempoMedioAnalise.length} color="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700" collapsed={collapsedCards.tempoMedioAnalise} toggle={() => toggle('tempoMedioAnalise')}>
            {tempoMedioAnalise.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-cyan-200">
                      <th className="text-left px-4 py-3 font-bold text-slate-700">Técnico</th>
                      <th className="text-center px-4 py-3 font-bold text-slate-700">Média (dias)</th>
                      <th className="text-center px-4 py-3 font-bold text-slate-700">Qtd Análises</th>
                      <th className="text-left px-4 py-3 font-bold text-slate-700 w-1/3">Desempenho</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tempoMedioAnalise.map((item, idx) => {
                      const max = Math.max(...tempoMedioAnalise.map(i => i.mediaDias), 1);
                      return (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-cyan-50/50">
                          <td className="px-4 py-3 font-medium text-slate-900">{item.tecnico}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full font-semibold text-xs ${item.mediaDias <= 7 ? 'bg-green-100 text-green-700' : item.mediaDias <= 15 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                              {item.mediaDias} dias
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-slate-600">{item.qtd}</td>
                          <td className="px-4 py-3">
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${(item.mediaDias / max) * 100}%` }} transition={{ duration: 0.6, delay: idx * 0.05 }} className={`h-full rounded-full ${item.mediaDias <= 7 ? 'bg-green-500' : item.mediaDias <= 15 ? 'bg-amber-500' : 'bg-red-500'}`} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-slate-500 text-center py-8">Sem dados de análise</p>}
          </CollapsibleCard>

          {/* ===== DISTRIBUIÇÃO DE SITUAÇÃO ===== */}
          <CollapsibleCard id="situacao" title="Distribuição de Situação da Demanda" icon={PieChart} color="bg-gradient-to-r from-[#1351B4] to-[#0C326F] hover:from-[#0C326F] hover:to-[#1351B4]" collapsed={collapsedCards.situacao} toggle={() => toggle('situacao')}>
            {displayData.distribuicaoSituacao.length > 0 ? (
              <HorizontalBar
                items={displayData.distribuicaoSituacao.map((i: any) => ({ label: i.situacao, value: i.count }))}
                colorFrom="from-[#1351B4]" colorTo="to-[#0C326F]"
              />
            ) : (
              <div className="text-center py-12">
                <div className="bg-slate-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4"><AlertCircle className="text-slate-400 w-8 h-8" /></div>
                <p className="text-slate-500 font-medium">Nenhuma demanda com situação definida</p>
              </div>
            )}
          </CollapsibleCard>

          {/* ===== DETALHAMENTO POR SITUAÇÃO DA DEMANDA ===== */}
          <CollapsibleCard id="detalheSituacao" title="Detalhamento por Situação da Demanda" icon={FileText} count={detalhamentoPorSituacao.length} color="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700" collapsed={collapsedCards.detalheSituacao} toggle={() => toggle('detalheSituacao')}>
            {detalhamentoPorSituacao.length > 0 ? (
              <div className="space-y-3">
                {detalhamentoPorSituacao.map((grupo, idx) => {
                  const isExpanded = expandedSituacoes.has(grupo.situacao);
                  return (
                    <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedSituacoes(prev => {
                          const next = new Set(prev);
                          if (next.has(grupo.situacao)) next.delete(grupo.situacao); else next.add(grupo.situacao);
                          return next;
                        })}
                        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                          <span className="text-sm font-bold text-slate-800">{grupo.situacao}</span>
                        </div>
                        <span className="bg-indigo-100 text-indigo-700 px-3 py-0.5 rounded-full font-bold text-xs">{grupo.count}</span>
                      </button>
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                            <div className="overflow-x-auto max-h-72 overflow-y-auto">
                              <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-indigo-50">
                                  <tr className="border-b border-indigo-200">
                                    <th className="text-left px-3 py-2 font-bold text-slate-700">Técnico</th>
                                    <th className="text-left px-3 py-2 font-bold text-slate-700">Nº Demanda</th>
                                    <th className="text-left px-3 py-2 font-bold text-slate-700">Município</th>
                                    <th className="text-center px-3 py-2 font-bold text-slate-700">Dt. Liberação</th>
                                    <th className="text-center px-3 py-2 font-bold text-slate-700">Dt. Análise</th>
                                    <th className="text-center px-3 py-2 font-bold text-slate-700">Dt. Lib. Assin. Conf.</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {grupo.demandas.map((d: any, dIdx: number) => (
                                    <tr key={dIdx} className={`border-b border-slate-100 hover:bg-indigo-50/50 ${dIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                      <td className="px-3 py-2 font-medium text-slate-900 whitespace-nowrap">{d.tecnico}</td>
                                      <td className="px-3 py-2 text-slate-700 max-w-[200px] truncate" title={d.demanda}>{d.demanda}</td>
                                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{d.municipio}</td>
                                      <td className="px-3 py-2 text-center text-slate-600 whitespace-nowrap">{d.data_liberacao}</td>
                                      <td className="px-3 py-2 text-center text-slate-600 whitespace-nowrap">{d.data_analise_demanda}</td>
                                      <td className="px-3 py-2 text-center text-slate-600 whitespace-nowrap">{d.data_liberacao_assinatura_conferencista}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-slate-500 text-center py-8">Nenhuma demanda com situação definida</p>}
          </CollapsibleCard>

          {/* ===== DEMANDAS ATRASADAS (>30 dias) ===== */}
          <CollapsibleCard id="atrasadas" title="Demandas Atrasadas (>30 dias sem conclusão)" icon={AlertTriangle} count={demandasAtrasadas.length} color="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700" collapsed={collapsedCards.atrasadas} toggle={() => toggle('atrasadas')}>
            {demandasAtrasadas.length > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-red-50 rounded-xl p-4 text-center border border-red-200">
                    <p className="text-2xl font-bold text-red-700">{demandasAtrasadas.filter(d => d.dias > 90).length}</p>
                    <p className="text-xs font-semibold text-red-600 mt-1">Críticas (&gt;90 dias)</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-200">
                    <p className="text-2xl font-bold text-amber-700">{demandasAtrasadas.filter(d => d.dias > 60 && d.dias <= 90).length}</p>
                    <p className="text-xs font-semibold text-amber-600 mt-1">Alerta (61-90 dias)</p>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-4 text-center border border-yellow-200">
                    <p className="text-2xl font-bold text-yellow-700">{demandasAtrasadas.filter(d => d.dias <= 60).length}</p>
                    <p className="text-xs font-semibold text-yellow-600 mt-1">Atenção (31-60 dias)</p>
                  </div>
                </div>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b-2 border-red-200">
                        <th className="text-left px-4 py-3 font-bold text-slate-700">Técnico</th>
                        <th className="text-left px-4 py-3 font-bold text-slate-700">Demanda</th>
                        <th className="text-center px-4 py-3 font-bold text-slate-700">Dias</th>
                        <th className="text-left px-4 py-3 font-bold text-slate-700">Regional</th>
                        <th className="text-left px-4 py-3 font-bold text-slate-700">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demandasAtrasadas.slice(0, 50).map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-red-50/50">
                          <td className="px-4 py-2.5 font-medium text-slate-900 text-xs">{item.tecnico}</td>
                          <td className="px-4 py-2.5 text-slate-600 text-xs max-w-xs truncate" title={item.demanda}>{item.demanda}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${item.dias > 90 ? 'bg-red-600 text-white' : item.dias > 60 ? 'bg-amber-500 text-white' : 'bg-yellow-400 text-yellow-900'}`}>{item.dias}d</span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 text-xs">{item.regional}</td>
                          <td className="px-4 py-2.5 text-slate-500 text-xs truncate max-w-[200px]" title={item.situacao}>{item.situacao}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {demandasAtrasadas.length > 50 && <p className="text-xs text-slate-500 text-center py-2">Mostrando 50 de {demandasAtrasadas.length} demandas atrasadas</p>}
                </div>
              </>
            ) : <p className="text-slate-500 text-center py-8">Nenhuma demanda atrasada</p>}
          </CollapsibleCard>

          {/* ===== DILIGÊNCIAS EM ABERTO ===== */}
          <CollapsibleCard id="diligencias" title="Diligências em Aberto por Técnico" icon={Send} count={diligenciasAberto.total} color="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700" collapsed={collapsedCards.diligencias} toggle={() => toggle('diligencias')}>
            {diligenciasAberto.porTecnico.length > 0 ? (
              <HorizontalBar
                items={diligenciasAberto.porTecnico.map(i => ({ label: i.tecnico, value: i.count }))}
                colorFrom="from-orange-400" colorTo="to-orange-600"
              />
            ) : <p className="text-slate-500 text-center py-8">Nenhuma diligência em aberto</p>}
          </CollapsibleCard>

          {/* ===== DEMANDAS POR CONFERENCISTA ===== */}
          <CollapsibleCard id="conferencistas" title="Demandas por Conferencista" icon={UserCheck} count={demandasConferencista.length} color="bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700" collapsed={collapsedCards.conferencistas} toggle={() => toggle('conferencistas')}>
            {demandasConferencista.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-violet-200">
                      <th className="text-left px-4 py-3 font-bold text-slate-700">Conferencista</th>
                      <th className="text-center px-4 py-3 font-bold text-slate-700">Total</th>
                      <th className="text-center px-4 py-3 font-bold text-slate-700">Conferidas</th>
                      <th className="text-center px-4 py-3 font-bold text-slate-700">Pendentes</th>
                      <th className="text-left px-4 py-3 font-bold text-slate-700 w-1/4">Progresso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demandasConferencista.map((item, idx) => {
                      const pct = item.total > 0 ? Math.round((item.conferidas / item.total) * 100) : 0;
                      return (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-violet-50/50">
                          <td className="px-4 py-3 font-medium text-slate-900">{item.conferencista}</td>
                          <td className="px-4 py-3 text-center font-bold text-slate-800">{item.total}</td>
                          <td className="px-4 py-3 text-center">{cellValue(item.conferidas, 'green')}</td>
                          <td className="px-4 py-3 text-center">{cellValue(item.pendentes)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: idx * 0.05 }} className="h-full bg-gradient-to-r from-violet-400 to-violet-600 rounded-full" />
                              </div>
                              <span className="text-xs font-semibold text-slate-500 w-10">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-slate-500 text-center py-8">Sem conferencistas</p>}
          </CollapsibleCard>

          {/* ===== DEMANDAS POR REGIONAL ===== */}
          <CollapsibleCard id="demandasRegional" title="Demandas por Regional" icon={MapPin} count={demandasRegional.length} color="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700" collapsed={collapsedCards.demandasRegional} toggle={() => toggle('demandasRegional')}>
            {demandasRegional.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-indigo-200">
                      <th className="text-left px-4 py-3 font-bold text-slate-700">Regional</th>
                      <th className="text-center px-4 py-3 font-bold text-slate-700">Total</th>
                      <th className="text-center px-4 py-3 font-bold text-slate-700">Concluídas</th>
                      <th className="text-center px-4 py-3 font-bold text-slate-700">Pendentes</th>
                      <th className="text-left px-4 py-3 font-bold text-slate-700 w-1/4">Progresso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demandasRegional.map((item, idx) => {
                      const pct = item.total > 0 ? Math.round((item.concluidas / item.total) * 100) : 0;
                      return (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-indigo-50/50">
                          <td className="px-4 py-3 font-medium text-slate-900">{item.regional}</td>
                          <td className="px-4 py-3 text-center font-bold text-slate-800">{item.total}</td>
                          <td className="px-4 py-3 text-center">{cellValue(item.concluidas, 'green')}</td>
                          <td className="px-4 py-3 text-center">{cellValue(item.pendentes)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: idx * 0.05 }} className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full" />
                              </div>
                              <span className="text-xs font-semibold text-slate-500 w-10">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-slate-500 text-center py-8">Sem dados de regional</p>}
          </CollapsibleCard>

          {/* ===== TOP MUNICÍPIOS ===== */}
          <CollapsibleCard id="topMunicipios" title="Top 15 Municípios" icon={MapPin} color="bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700" collapsed={collapsedCards.topMunicipios} toggle={() => toggle('topMunicipios')}>
            {topMunicipios.length > 0 ? (
              <div className="space-y-3">
                {topMunicipios.map((item: any, idx: number) => {
                  const maxCount = Math.max(...topMunicipios.map((i: any) => i.count));
                  const pct = (item.count / maxCount) * 100;
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700 flex-1 pr-4 flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-bold w-5 text-right">{idx + 1}.</span>
                          {item.municipio}
                        </span>
                        <div className="bg-sky-100 text-sky-700 px-3 py-0.5 rounded-full font-bold text-xs min-w-10 text-center">{item.count}</div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden ml-7">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: idx * 0.05, ease: 'easeOut' }} className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-full" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-slate-500 text-center py-8">Nenhum município encontrado</p>}
          </CollapsibleCard>

          {/* ===== PUBLICAÇÕES POR MÊS ===== */}
          <CollapsibleCard id="publicacoesMes" title="Publicações por Mês" icon={BookOpen} count={publicacoesMes.reduce((a, b) => a + b.count, 0)} color="bg-gradient-to-r from-fuchsia-500 to-fuchsia-600 hover:from-fuchsia-600 hover:to-fuchsia-700" collapsed={collapsedCards.publicacoesMes} toggle={() => toggle('publicacoesMes')}>
            {publicacoesMes.length > 0 ? (
              <>
                <div className="flex items-end gap-2 h-48 mb-4">
                  {(() => {
                    const maxVal = Math.max(...publicacoesMes.map(m => m.count), 1);
                    return publicacoesMes.map((item, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <span className="text-[10px] font-bold text-fuchsia-700">{item.count}</span>
                        <motion.div initial={{ height: 0 }} animate={{ height: `${(item.count / maxVal) * 100}%` }} transition={{ duration: 0.6, delay: idx * 0.05 }} className="w-full max-w-8 bg-gradient-to-t from-fuchsia-600 to-fuchsia-400 rounded-t min-h-[2px]" title={`${item.count} publicações`} />
                        <span className="text-[10px] text-slate-500 whitespace-nowrap transform -rotate-45 origin-center mt-1">
                          {item.mes.substring(5)}/{item.mes.substring(2, 4)}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </>
            ) : <p className="text-slate-500 text-center py-8">Nenhuma publicação registrada</p>}
          </CollapsibleCard>

          {/* ===== TEMPO COM TÉCNICOS ===== */}
          <CollapsibleCard id="tempoTecnicos" title="Tempo das Demandas com Técnicos" icon={Clock} count={tempoComTecnicos.length} color="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700" collapsed={collapsedCards.tempoTecnicos} toggle={() => toggle('tempoTecnicos')}>
            {tempoComTecnicos.length > 0 ? (
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b-2 border-amber-200">
                      <th className="text-left px-4 py-3 font-bold text-slate-700">Técnico</th>
                      <th className="text-left px-4 py-3 font-bold text-slate-700">Demanda</th>
                      <th className="text-center px-4 py-3 font-bold text-slate-700">Dias</th>
                      <th className="text-left px-4 py-3 font-bold text-slate-700">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tempoComTecnicos.slice(0, 100).map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-amber-50/50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-slate-900 text-xs">{item.tecnico}</td>
                        <td className="px-4 py-2.5 text-slate-600 text-xs max-w-xs truncate" title={item.demanda}>{item.demanda}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full font-semibold text-xs ${item.dias > 30 ? 'bg-red-100 text-red-700' : item.dias > 15 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                            {item.dias} dias
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 text-xs">{item.situacao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {tempoComTecnicos.length > 100 && <p className="text-xs text-slate-500 text-center py-2">Mostrando 100 de {tempoComTecnicos.length}</p>}
              </div>
            ) : <p className="text-slate-500 text-center py-8">Nenhuma demanda não concluída com técnico atribuído</p>}
          </CollapsibleCard>

          {/* ===== EVOLUÇÃO MENSAL POR TÉCNICO ===== */}
          <CollapsibleCard id="evolucaoMensal" title="Evolução Mensal por Técnico (Últimos 12 meses)" icon={TrendingUp} color="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700" collapsed={collapsedCards.evolucaoMensal} toggle={() => toggle('evolucaoMensal')}>
            {evolucaoMensal.meses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-teal-700 text-white">
                      <th className="text-left px-3 py-3 font-bold whitespace-nowrap sticky left-0 bg-teal-700 z-10 min-w-[140px]">Técnico</th>
                      {evolucaoMensal.meses.map((m, i) => (
                        <th key={i} className="text-center px-2 py-3 font-semibold whitespace-nowrap">{m.substring(5)}/{m.substring(2, 4)}</th>
                      ))}
                      <th className="text-center px-3 py-3 font-bold whitespace-nowrap bg-teal-800">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evolucaoMensal.tecnicos.map((tecnico, idx) => {
                      const mesMap = evolucaoMensal.data.get(tecnico)!;
                      const total = evolucaoMensal.meses.reduce((sum, m) => sum + (mesMap.get(m)?.recebidas || 0), 0);
                      return (
                        <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-teal-50/30'}`}>
                          <td className={`px-3 py-2.5 font-semibold text-slate-900 whitespace-nowrap sticky left-0 z-10 ${idx % 2 === 0 ? 'bg-white' : 'bg-teal-50'}`}>{tecnico}</td>
                          {evolucaoMensal.meses.map((m, i) => {
                            const val = mesMap.get(m)?.recebidas || 0;
                            return <td key={i} className="px-2 py-2.5 text-center">{val > 0 ? <span className="inline-block px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold text-xs">{val}</span> : <span className="text-slate-300">—</span>}</td>;
                          })}
                          <td className="px-3 py-2.5 text-center font-bold text-teal-800 bg-teal-50">{total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-teal-700 text-white font-bold">
                      <td className="px-3 py-3 sticky left-0 bg-teal-700 z-10">Total</td>
                      {evolucaoMensal.meses.map((m, i) => {
                        const total = evolucaoMensal.tecnicos.reduce((sum, t) => sum + (evolucaoMensal.data.get(t)?.get(m)?.recebidas || 0), 0);
                        return <td key={i} className="px-2 py-3 text-center">{total || '—'}</td>;
                      })}
                      <td className="px-3 py-3 text-center bg-teal-800">
                        {evolucaoMensal.meses.reduce((sum, m) => sum + evolucaoMensal.tecnicos.reduce((s, t) => s + (evolucaoMensal.data.get(t)?.get(m)?.recebidas || 0), 0), 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : <p className="text-slate-500 text-center py-8">Nenhum dado de evolução mensal disponível</p>}
          </CollapsibleCard>

        </div>
      ) : null}
    </div>
  );
}
