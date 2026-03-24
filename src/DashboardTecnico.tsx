import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart3, Filter, RefreshCw, X, ChevronDown, ChevronUp,
  Users, CheckCircle2, DollarSign, TrendingUp, AlertCircle,
  Search, Download, ArrowUpDown, User, MapPin, Calendar,
  Clock, FileText, Eye, EyeOff, Maximize2, Minimize2
} from 'lucide-react';
import { useAuth } from './AuthContext';

// ─── Types ──────────────────────────────────────────────────────────────────
interface FormalizacaoRow {
  id?: number;
  ano?: string;
  parlamentar?: string;
  partido?: string;
  emenda?: string;
  demanda?: string;
  demandas_formalizacao?: string;
  numero_convenio?: string;
  classificacao_emenda_demanda?: string;
  tipo_formalizacao?: string;
  regional?: string;
  municipio?: string;
  conveniado?: string;
  objeto?: string;
  portfolio?: string;
  valor?: number;
  situacao_demandas_sempapel?: string;
  area_estagio?: string;
  recurso?: string;
  tecnico?: string;
  data_liberacao?: string;
  area_estagio_situacao_demanda?: string;
  situacao_analise_demanda?: string;
  data_analise_demanda?: string;
  conferencista?: string;
  data_recebimento_demanda?: string;
  data_retorno?: string;
  publicacao?: string;
  vigencia?: string;
  concluida_em?: string;
  falta_assinatura?: string;
  assinatura?: string;
}

// ─── Fixed column definitions ─────────────────────────────────────────────
const FIXED_COLS = [
  { key: 'demandas_recebidas', line1: 'Deman.',      line2: 'Recebidas',  bgHead: 'bg-slate-700',  bgTotal: 'bg-slate-600' },
  { key: 'c_tecnico',          line1: 'Demanda',      line2: 'C/ Técnico', bgHead: 'bg-red-800',    bgTotal: 'bg-red-900' },
  { key: 'em_analise',         line1: 'Em',           line2: 'Análise',    bgHead: 'bg-slate-800',  bgTotal: 'bg-slate-700' },
  { key: 'ag_doc',             line1: 'Ag. Doc.',     line2: '',           bgHead: 'bg-slate-800',  bgTotal: 'bg-slate-700' },
  { key: 'diligencia',         line1: 'Diligência',   line2: '',           bgHead: 'bg-slate-800',  bgTotal: 'bg-slate-700' },
  { key: 'formalizacao',       line1: 'Formalização', line2: '',           bgHead: 'bg-slate-800',  bgTotal: 'bg-slate-700' },
  { key: 'em_conferencia',     line1: 'Em',           line2: 'Conferência',bgHead: 'bg-slate-800',  bgTotal: 'bg-slate-700' },
  { key: 'conf_pendencia',     line1: 'Conf /',       line2: 'Pendência',  bgHead: 'bg-slate-800',  bgTotal: 'bg-slate-700' },
  { key: 'em_assinatura',      line1: 'Em',           line2: 'Assinatura', bgHead: 'bg-slate-800',  bgTotal: 'bg-slate-700' },
  { key: 'laudas',             line1: 'Laudas +',     line2: 'Publi DOE',  bgHead: 'bg-slate-800',  bgTotal: 'bg-slate-700' },
  { key: 'comite',             line1: 'Comite',       line2: 'Gestor',     bgHead: 'bg-slate-800',  bgTotal: 'bg-slate-700' },
  { key: 'outras',             line1: 'Outras',       line2: 'Pend.',      bgHead: 'bg-slate-800',  bgTotal: 'bg-slate-700' },
  { key: 'total_ggcon',        line1: 'Total no',     line2: 'GGCON',      bgHead: 'bg-blue-900',   bgTotal: 'bg-blue-950', isTotalGgcon: true },
  { key: 'concluida',          line1: 'Concluída',    line2: '',           bgHead: 'bg-emerald-800',bgTotal: 'bg-emerald-900' },
  { key: 'transf_vol',         line1: 'Transf.',      line2: 'Vol.',       bgHead: 'bg-teal-800',   bgTotal: 'bg-teal-900' },
  { key: 'emenda_loa',         line1: 'Emenda',       line2: 'LOA',        bgHead: 'bg-violet-800', bgTotal: 'bg-violet-900' },
] as const;
type ColKey = typeof FIXED_COLS[number]['key'];

// Stage helpers (uppercase comparison)
const stg = (r: FormalizacaoRow) => (r.area_estagio_situacao_demanda ?? '').trim().toUpperCase();
const cls = (r: FormalizacaoRow) => (r.classificacao_emenda_demanda ?? '').trim().toUpperCase();

function computeColValues(rows: FormalizacaoRow[]): Record<ColKey, number> {
  const cTecnico        = rows.filter(r => !!(r.data_liberacao ?? '').trim() && (stg(r) === '' || stg(r) === 'DEMANDA COM O TÉCNICO')).length;
  const emAnalise       = rows.filter(r => stg(r) === 'EM ANÁLISE DA DOCUMENTAÇÃO' || stg(r) === 'EM ANÁLISE DO PLANO DE TRABALHO').length;
  const agDoc           = rows.filter(r => stg(r) === 'AGUARDANDO DOCUMENTAÇÃO').length;
  const diligencia      = rows.filter(r => stg(r) === 'DEMANDA EM DILIGÊNCIA' || stg(r) === 'DEMANDA EM DILIGÊNCIA DOCUMENTO - DRS').length;
  const formalizacao    = rows.filter(r => stg(r) === 'EM FORMALIZAÇÃO').length;
  const emConferencia   = rows.filter(r => stg(r) === 'EM CONFERÊNCIA').length;
  const confPendencia   = rows.filter(r => stg(r) === 'CONF / PENDÊNCIA').length;
  const emAssinatura    = rows.filter(r => stg(r) === 'EM ASSINATURA').length;
  const laudas          = rows.filter(r => stg(r) === 'LAUDAS + PUBLI DOE').length;
  const comite          = rows.filter(r => stg(r) === 'COMITE GESTOR').length;
  const outras          = rows.filter(r => stg(r) === 'OUTRAS PENDÊNCIAS').length;
  // Total GGCON = C/Técnico + Em Análise + Ag.Doc + Formalização + Em Conferência + Conf/Pend. + Em Assinatura + Laudas + Comitê + Outras Pend. (Diligência NOT included)
  const totalGgcon      = cTecnico + emAnalise + agDoc + formalizacao + emConferencia + confPendencia + emAssinatura + laudas + comite + outras;
  const concluida       = rows.filter(r => stg(r) === 'CONCLUÍDA').length;
  const transfVol       = rows.filter(r => cls(r).includes('TRANSFER')).length;
  const emendaLoa       = rows.filter(r => cls(r).includes('LOA') || cls(r).includes('EMENDA LOA')).length;
  return {
    demandas_recebidas: rows.length, c_tecnico: cTecnico, em_analise: emAnalise,
    ag_doc: agDoc, diligencia, formalizacao, em_conferencia: emConferencia,
    conf_pendencia: confPendencia, em_assinatura: emAssinatura, laudas, comite, outras,
    total_ggcon: totalGgcon, concluida, transf_vol: transfVol, emenda_loa: emendaLoa,
  };
}

function getColRows(colKey: ColKey, rows: FormalizacaoRow[]): FormalizacaoRow[] {
  switch (colKey) {
    case 'demandas_recebidas': return rows;
    case 'c_tecnico':      return rows.filter(r => !!(r.data_liberacao ?? '').trim() && (stg(r) === '' || stg(r) === 'DEMANDA COM O TÉCNICO'));
    case 'em_analise':     return rows.filter(r => stg(r) === 'EM ANÁLISE DA DOCUMENTAÇÃO' || stg(r) === 'EM ANÁLISE DO PLANO DE TRABALHO');
    case 'ag_doc':         return rows.filter(r => stg(r) === 'AGUARDANDO DOCUMENTAÇÃO');
    case 'diligencia':     return rows.filter(r => stg(r) === 'DEMANDA EM DILIGÊNCIA' || stg(r) === 'DEMANDA EM DILIGÊNCIA DOCUMENTO - DRS');
    case 'formalizacao':   return rows.filter(r => stg(r) === 'EM FORMALIZAÇÃO');
    case 'em_conferencia': return rows.filter(r => stg(r) === 'EM CONFERÊNCIA');
    case 'conf_pendencia': return rows.filter(r => stg(r) === 'CONF / PENDÊNCIA');
    case 'em_assinatura':  return rows.filter(r => stg(r) === 'EM ASSINATURA');
    case 'laudas':         return rows.filter(r => stg(r) === 'LAUDAS + PUBLI DOE');
    case 'comite':         return rows.filter(r => stg(r) === 'COMITE GESTOR');
    case 'outras':         return rows.filter(r => stg(r) === 'OUTRAS PENDÊNCIAS');
    case 'total_ggcon':    return rows.filter(r => {
      const s = stg(r);
      if (!!(r.data_liberacao ?? '').trim() && (s === '' || s === 'DEMANDA COM O TÉCNICO')) return true;
      return ['EM ANÁLISE DA DOCUMENTAÇÃO','EM ANÁLISE DO PLANO DE TRABALHO','AGUARDANDO DOCUMENTAÇÃO',
        'EM FORMALIZAÇÃO','EM CONFERÊNCIA','CONF / PENDÊNCIA','EM ASSINATURA','LAUDAS + PUBLI DOE','COMITE GESTOR','OUTRAS PENDÊNCIAS'].includes(s);
    });
    case 'concluida':      return rows.filter(r => stg(r) === 'CONCLUÍDA');
    case 'transf_vol':     return rows.filter(r => cls(r).includes('TRANSFER'));
    case 'emenda_loa':     return rows.filter(r => cls(r).includes('LOA') || cls(r).includes('EMENDA LOA'));
    default: return [];
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtCurrency(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
}
function fmtCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
function fmtDate(s?: string) {
  if (!s) return '—';
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('pt-BR');
}

// ─── MultiCheckFilter ────────────────────────────────────────────────────────
function MultiCheckFilter({
  label, options, selected, onChange, placeholder = 'Buscar...'
}: {
  label: string; options: string[]; selected: string[];
  onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  const visible = useMemo(
    () => options.filter(o => o.toLowerCase().includes(search.toLowerCase())),
    [options, search]
  );

  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);

  return (
    <div ref={ref} className="relative min-w-0">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">{label}</label>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white text-left flex items-center justify-between transition-colors ${
          selected.length ? 'border-[#1351B4] ring-1 ring-[#1351B4]/20' : 'border-gray-300 hover:border-[#1351B4]'
        }`}
      >
        <span className="truncate text-gray-700 flex-1">
          {selected.length ? `${selected.length} sel.` : 'Todos'}
        </span>
        <div className="flex items-center gap-1 ml-1 flex-shrink-0">
          {selected.length > 0 && (
            <span role="button" onClick={e => { e.stopPropagation(); onChange([]); }}
              className="text-gray-400 hover:text-red-500 cursor-pointer">
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </div>
      </button>
      {open && (
        <div className="absolute z-50 left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl min-w-[200px] w-max max-w-xs">
          <div className="p-2 border-b border-gray-100">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full px-2 py-1 text-xs border border-gray-200 rounded-lg outline-none focus:border-[#1351B4] bg-white"
              onClick={e => e.stopPropagation()} />
          </div>
          <div className="max-h-52 overflow-y-auto">
            <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-xs text-gray-500 border-b border-gray-100">
              <input type="checkbox" checked={selected.length === options.length}
                onChange={() => onChange(selected.length === options.length ? [] : [...options])}
                className="rounded accent-[#1351B4]" />
              <span className="font-semibold">{selected.length === options.length ? 'Desmarcar todos' : 'Selecionar todos'}</span>
            </label>
            {visible.map(opt => (
              <label key={opt} className="flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 cursor-pointer text-xs text-gray-700">
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)}
                  className="rounded accent-[#1351B4]" />
                <span className="truncate max-w-[160px]" title={opt}>{opt}</span>
              </label>
            ))}
            {visible.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">Nenhuma opção</p>}
          </div>
          <div className="border-t border-gray-100 p-2">
            <button onClick={() => setOpen(false)}
              className="w-full px-2 py-1 text-xs font-bold text-white bg-[#1351B4] rounded-lg hover:bg-[#0C326F]">
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string; sub?: string; color: string; icon: React.ElementType
}) {
  return (
    <div className={`${color} text-white rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-lg`}>
      <div className="bg-white/20 rounded-xl p-2 flex-shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-white/70 uppercase tracking-wide">{label}</p>
        <p className="text-lg font-bold leading-tight truncate">{value}</p>
        {sub && <p className="text-[10px] text-white/55 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Drilldown Modal ─────────────────────────────────────────────────────────
function DrilldownModal({
  title, rows, onClose
}: { title: string; rows: FormalizacaoRow[]; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string>('demandas_formalizacao');
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return rows.filter(r =>
      !s ||
      String(r.demandas_formalizacao ?? '').toLowerCase().includes(s) ||
      String(r.conveniado ?? '').toLowerCase().includes(s) ||
      String(r.regional ?? '').toLowerCase().includes(s) ||
      String(r.classificacao_emenda_demanda ?? '').toLowerCase().includes(s) ||
      String(r.situacao_demandas_sempapel ?? '').toLowerCase().includes(s)
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = String((a as any)[sortCol] ?? '');
      const bv = String((b as any)[sortCol] ?? '');
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortCol, sortAsc]);

  const cols: { key: keyof FormalizacaoRow; label: string; width?: number }[] = [
    { key: 'demandas_formalizacao', label: 'Demanda', width: 90 },
    { key: 'tecnico', label: 'Técnico', width: 110 },
    { key: 'classificacao_emenda_demanda', label: 'Classificação', width: 120 },
    { key: 'regional', label: 'Regional', width: 130 },
    { key: 'conveniado', label: 'Conveniado', width: 180 },
    { key: 'situacao_analise_demanda', label: 'Situação Análise', width: 180 },
    { key: 'situacao_demandas_sempapel', label: 'SemPapel', width: 200 },
    { key: 'data_liberacao', label: 'Dt. Lib.', width: 90 },
  ];

  // Export CSV
  const exportCSV = () => {
    const header = cols.map(c => c.label).join(';');
    const body = sorted.map(r => cols.map(c => `"${String(r[c.key] ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + header + '\n' + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'drilldown.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (key: string) => {
    if (sortCol === key) setSortAsc(v => !v);
    else { setSortCol(key); setSortAsc(true); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/50 z-[9000]" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed inset-4 md:inset-8 z-[9001] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-[#1351B4] text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            <h3 className="font-bold text-base">{title}</h3>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{sorted.length} registro{sorted.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white/20 hover:bg-white/30 rounded-lg transition-all">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input type="text" placeholder="Buscar dentro dos resultados..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#1351B4] bg-white" />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                {cols.map(col => (
                  <th key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="px-3 py-2 text-left font-bold text-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-100 select-none border-b border-slate-200"
                    style={{ minWidth: col.width }}>
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortCol === col.key
                        ? (sortAsc ? <ChevronUp className="w-3 h-3 text-[#1351B4]" /> : <ChevronDown className="w-3 h-3 text-[#1351B4]" />)
                        : <ArrowUpDown className="w-3 h-3 text-gray-300" />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((r, i) => (
                <tr key={r.id ?? i} className="hover:bg-blue-50 transition-colors">
                  {cols.map(col => (
                    <td key={col.key} className="px-3 py-1.5 text-slate-700 max-w-[220px] truncate"
                      title={String(r[col.key] ?? '')}>
                      {col.key === 'data_liberacao' ? fmtDate(r[col.key] as string) : (r[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={cols.length} className="text-center py-8 text-gray-400">Nenhum registro</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export function DashboardTecnico() {
  const { token } = useAuth();

  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState<FormalizacaoRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // View mode: 'tecnico' | 'conferencista'
  const [viewMode, setViewMode] = useState<'tecnico' | 'conferencista'>('tecnico');

  // Compact mode
  const [compact, setCompact] = useState(false);
  // Filter panel collapsed
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Drilldown state
  const [drilldown, setDrilldown] = useState<{ title: string; rows: FormalizacaoRow[] } | null>(null);

  // Filters
  const [filtroAno, setFiltroAno] = useState<string[]>([]);
  const [filtroRegional, setFiltroRegional] = useState<string[]>([]);
  const [filtroTecnico, setFiltroTecnico] = useState<string[]>([]);
  const [filtroConferencista, setFiltroConferencista] = useState<string[]>([]);
  const [filtroParlamentar, setFiltroParlamentar] = useState<string[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<string[]>([]);
  const [filtroSituacao, setFiltroSituacao] = useState<string[]>([]);
  const [filtroDataDe, setFiltroDataDe] = useState('');
  const [filtroDataAte, setFiltroDataAte] = useState('');
  const [filtroDataCampo, setFiltroDataCampo] = useState<'data_liberacao' | 'data_analise_demanda' | 'data_recebimento_demanda'>('data_liberacao');

  // Load all data
  const loadData = useCallback(async () => {
    const authToken = token ?? localStorage.getItem('auth_token');
    if (!authToken) return;
    setLoading(true);
    try {
      let all: FormalizacaoRow[] = [];
      let offset = 0;
      const batchSize = 1000;
      while (true) {
        const res = await fetch(`/api/formalizacao?limit=${batchSize}&offset=${offset}`,
          { headers: { Authorization: `Bearer ${authToken}` } });
        if (!res.ok) break;
        const result = await res.json();
        const batch: FormalizacaoRow[] = Array.isArray(result) ? result : (result.data ?? []);
        all = all.concat(batch);
        if (batch.length < batchSize) break;
        offset += batchSize;
      }
      setRawData(all);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  // Option lists
  const anoOptions = useMemo(() =>
    [...new Set(rawData.map(r => String(r.ano ?? '').trim()).filter(Boolean))].sort().reverse(), [rawData]);
  const regionalOptions = useMemo(() =>
    [...new Set(rawData.map(r => String(r.regional ?? '').trim()).filter(Boolean))].sort(), [rawData]);
  const tecnicoOptions = useMemo(() =>
    [...new Set(rawData.map(r => String(r.tecnico ?? '').trim()).filter(Boolean))].sort(), [rawData]);
  const conferencistaOptions = useMemo(() =>
    [...new Set(rawData.map(r => String(r.conferencista ?? '').trim()).filter(Boolean))].sort(), [rawData]);
  const parlamentarOptions = useMemo(() =>
    [...new Set(rawData.map(r => String(r.parlamentar ?? '').trim()).filter(Boolean))].sort(), [rawData]);
  const tipoOptions = useMemo(() =>
    [...new Set(rawData.map(r => String(r.tipo_formalizacao ?? '').trim()).filter(Boolean))].sort(), [rawData]);
  const situacaoOptions = useMemo(() =>
    [...new Set(rawData.map(r => String(r.area_estagio_situacao_demanda ?? '').trim()).filter(Boolean))].sort(), [rawData]);

  // Apply global filters
  const filtered = useMemo(() => {
    let data = rawData;
    if (filtroAno.length) data = data.filter(r => filtroAno.includes(String(r.ano ?? '').trim()));
    if (filtroRegional.length) data = data.filter(r => filtroRegional.includes(String(r.regional ?? '').trim()));
    if (filtroTecnico.length) data = data.filter(r => filtroTecnico.includes(String(r.tecnico ?? '').trim()));
    if (filtroConferencista.length) data = data.filter(r => filtroConferencista.includes(String(r.conferencista ?? '').trim()));
    if (filtroParlamentar.length) data = data.filter(r => filtroParlamentar.includes(String(r.parlamentar ?? '').trim()));
    if (filtroTipo.length) data = data.filter(r => filtroTipo.includes(String(r.tipo_formalizacao ?? '').trim()));
    if (filtroSituacao.length) data = data.filter(r => filtroSituacao.includes(String(r.area_estagio_situacao_demanda ?? '').trim()));
    if (filtroDataDe) data = data.filter(r => (String(r[filtroDataCampo] ?? '')) >= filtroDataDe);
    if (filtroDataAte) data = data.filter(r => (String(r[filtroDataCampo] ?? '')) <= filtroDataAte);
    return data;
  }, [rawData, filtroAno, filtroRegional, filtroTecnico, filtroConferencista, filtroParlamentar, filtroTipo, filtroSituacao, filtroDataDe, filtroDataAte, filtroDataCampo]);

  // Person field based on view mode
  const personField = viewMode === 'tecnico' ? 'tecnico' : 'conferencista';

  // Build matrix data using fixed columns
  const matrixData = useMemo(() => {
    const personMap = new Map<string, FormalizacaoRow[]>();
    for (const row of filtered) {
      const person = String(row[personField] ?? '').trim() || '(não atribuído)';
      if (!personMap.has(person)) personMap.set(person, []);
      personMap.get(person)!.push(row);
    }
    const rows = Array.from(personMap.entries()).map(([person, pRows]) => {
      return { person, cols: computeColValues(pRows), rows: pRows };
    }).sort((a, b) => b.cols.demandas_recebidas - a.cols.demandas_recebidas);
    const totalCols = computeColValues(filtered);
    return { rows, totalCols };
  }, [filtered, personField]);

  // KPIs
  const totalValor = useMemo(() => filtered.reduce((s, r) => s + (Number(r.valor) || 0), 0), [filtered]);
  const totalConcluidas = useMemo(() => matrixData.totalCols.concluida, [matrixData]);
  const pctConcluidas = filtered.length > 0 ? Math.round((totalConcluidas / filtered.length) * 100) : 0;
  const totalEmAndamento = matrixData.totalCols.total_ggcon;

  const hasActiveFilters = filtroAno.length || filtroRegional.length || filtroTecnico.length ||
    filtroConferencista.length || filtroParlamentar.length || filtroTipo.length ||
    filtroSituacao.length || filtroDataDe || filtroDataAte;

  const clearFilters = () => {
    setFiltroAno([]); setFiltroRegional([]); setFiltroTecnico([]); setFiltroConferencista([]);
    setFiltroParlamentar([]); setFiltroTipo([]); setFiltroSituacao([]);
    setFiltroDataDe(''); setFiltroDataAte('');
  };

  // Export matrix CSV
  const exportMatrix = () => {
    const colHeaders = ['Técnico/Conferencista', ...FIXED_COLS.map(c => `${c.line1}${c.line2 ? ' ' + c.line2 : ''}`)];
    const header = colHeaders.join(';');
    const body = matrixData.rows.map(r =>
      [r.person, ...FIXED_COLS.map(c => r.cols[c.key] || 0)].join(';')
    ).join('\n');
    const totalRow = ['TOTAL', ...FIXED_COLS.map(c => matrixData.totalCols[c.key] || 0)].join(';');
    const blob = new Blob(['\uFEFF' + header + '\n' + body + '\n' + totalRow], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
    a.download = `dashboard_${viewMode}_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const openDrilldown = (title: string, rows: FormalizacaoRow[]) => {
    if (rows.length === 0) return;
    setDrilldown({ title, rows });
  };

  return (
    <div className="space-y-4">
      {/* ── Drilldown modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {drilldown && (
          <DrilldownModal title={drilldown.title} rows={drilldown.rows} onClose={() => setDrilldown(null)} />
        )}
      </AnimatePresence>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <BarChart3 className="w-4 h-4 text-[#1351B4] flex-shrink-0" />
          <h2 className="text-base font-bold text-slate-800 truncate">Demonstrativo por Técnico / Conferencista</h2>
          {lastUpdated && (
            <span className="text-[10px] text-slate-400 hidden md:inline flex-shrink-0">
              · {rawData.length.toLocaleString('pt-BR')} registros · {lastUpdated.toLocaleTimeString('pt-BR')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden bg-white text-[11px] font-bold">
            <button onClick={() => setViewMode('tecnico')}
              className={`px-2.5 py-1 flex items-center gap-1 transition-all ${viewMode === 'tecnico' ? 'bg-[#1351B4] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              <User className="w-3 h-3" /> Técnico
            </button>
            <button onClick={() => setViewMode('conferencista')}
              className={`px-2.5 py-1 flex items-center gap-1 transition-all ${viewMode === 'conferencista' ? 'bg-[#1351B4] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Users className="w-3 h-3" /> Conferencista
            </button>
          </div>
          <button onClick={exportMatrix}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-all">
            <Download className="w-3 h-3" /> CSV
          </button>
          <button onClick={loadData} disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#1351B4] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all disabled:opacity-50">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <button
          onClick={() => setFiltersOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50 rounded-xl transition-colors">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#1351B4]" />
            <span className="text-xs font-bold text-slate-700">Filtros</span>
            {hasActiveFilters ? (
              <span className="text-[10px] bg-[#1351B4] text-white px-2 py-0.5 rounded-full font-bold">
                {filtered.length.toLocaleString('pt-BR')} / {rawData.length.toLocaleString('pt-BR')}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">{rawData.length.toLocaleString('pt-BR')} registros</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button onClick={e => { e.stopPropagation(); clearFilters(); }}
                className="flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-700 transition-colors">
                <X className="w-3 h-3" /> Limpar
              </button>
            )}
            {filtersOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>
        {filtersOpen && (
          <div className="px-4 pb-3 border-t border-slate-100">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 mt-2.5">
              <MultiCheckFilter label="Ano" options={anoOptions} selected={filtroAno} onChange={setFiltroAno} />
              <MultiCheckFilter label="Regional" options={regionalOptions} selected={filtroRegional} onChange={setFiltroRegional} />
              <MultiCheckFilter label="Técnico" options={tecnicoOptions} selected={filtroTecnico} onChange={setFiltroTecnico} />
              <MultiCheckFilter label="Conferencista" options={conferencistaOptions} selected={filtroConferencista} onChange={setFiltroConferencista} />
              <MultiCheckFilter label="Parlamentar" options={parlamentarOptions} selected={filtroParlamentar} onChange={setFiltroParlamentar} />
              <MultiCheckFilter label="Tipo Form." options={tipoOptions} selected={filtroTipo} onChange={setFiltroTipo} />
              <MultiCheckFilter label="Situação/Estágio" options={situacaoOptions} selected={filtroSituacao} onChange={setFiltroSituacao} />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Campo Data</label>
                <select value={filtroDataCampo} onChange={e => setFiltroDataCampo(e.target.value as any)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-700 focus:border-[#1351B4] outline-none">
                  <option value="data_liberacao">Data Liberação</option>
                  <option value="data_analise_demanda">Data Análise</option>
                  <option value="data_recebimento_demanda">Data Recebimento</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Data Início</label>
                <input type="date" value={filtroDataDe} onChange={e => setFiltroDataDe(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:border-[#1351B4] outline-none bg-white text-gray-900" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Data Fim</label>
                <input type="date" value={filtroDataAte} onChange={e => setFiltroDataAte(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:border-[#1351B4] outline-none bg-white text-gray-900" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Loading ───────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="relative">
            <div className="animate-spin rounded-full h-14 w-14 border-4 border-[#1351B4]/20 border-t-[#1351B4]" />
            <BarChart3 className="absolute inset-0 m-auto w-5 h-5 text-[#1351B4]" />
          </div>
          <p className="text-slate-600 font-semibold text-sm">Carregando demonstrativo...</p>
          <p className="text-slate-400 text-xs">Buscando todos os registros do banco de dados</p>
        </div>
      )}

      {!loading && rawData.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum dado carregado.</p>
          <button onClick={loadData} className="mt-3 px-4 py-2 text-xs font-bold text-white bg-[#1351B4] rounded-lg">
            Carregar dados
          </button>
        </div>
      )}

      {!loading && rawData.length > 0 && (
        <>
          {/* ── KPI Cards ───────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <KpiCard label="Total de Demandas" value={filtered.length.toLocaleString('pt-BR')}
              sub={hasActiveFilters ? `de ${rawData.length.toLocaleString('pt-BR')} total` : undefined}
              color="bg-gradient-to-br from-[#1351B4] to-[#0C326F]" icon={BarChart3} />
            <KpiCard label="Valor Total" value={fmtCompact(totalValor)}
              sub={fmtCurrency(totalValor)} color="bg-gradient-to-br from-emerald-500 to-emerald-700" icon={DollarSign} />
            <KpiCard label="Concluídas" value={`${totalConcluidas.toLocaleString('pt-BR')} (${pctConcluidas}%)`}
              sub="com data de conclusão" color="bg-gradient-to-br from-violet-500 to-violet-700" icon={CheckCircle2} />
            <KpiCard label="Em Andamento" value={totalEmAndamento.toLocaleString('pt-BR')}
              sub={`${(100 - pctConcluidas)}% do total`} color="bg-gradient-to-br from-orange-500 to-orange-700" icon={TrendingUp} />
          </div>

          {/* ── Matrix Table ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
            {/* Table header bar */}
            <div className="px-4 py-2.5 bg-slate-900 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 flex-shrink-0" />
                {viewMode === 'tecnico' ? 'Demonstrativo por Técnico' : 'Demonstrativo por Conferencista'}
                <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">— clique num número para ver detalhes</span>
              </h3>
              <span className="text-[11px] text-slate-400 flex-shrink-0">
                {matrixData.rows.length} {viewMode === 'tecnico' ? 'técnico(s)' : 'conferencista(s)'}
              </span>
            </div>

            {/* Scrollable table wrapper — max height so it fits on screen */}
            <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
              <table className="border-collapse text-[11px] w-max min-w-full">
                <thead className="sticky top-0 z-20">
                  <tr>
                    {/* Sticky name column */}
                    <th className="sticky left-0 z-30 bg-slate-800 border-r border-slate-600 px-3 py-2 text-left text-white font-bold align-middle"
                      style={{ minWidth: 180, maxWidth: 220 }}>
                      <span className="text-xs">{viewMode === 'tecnico' ? 'Técnico' : 'Conferencista'}</span>
                    </th>
                    {/* Fixed columns — horizontal 2-line headers */}
                    {FIXED_COLS.map(col => (
                      <th key={col.key}
                        className={`${col.bgHead} border-l border-slate-700 px-1.5 py-2 text-center align-middle`}
                        style={{ minWidth: 68 }}>
                        <span className="block text-[10px] font-bold text-white leading-snug whitespace-nowrap">{col.line1}</span>
                        {col.line2 && <span className="block text-[10px] font-bold text-white leading-snug whitespace-nowrap">{col.line2}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixData.rows.map((row, idx) => {
                    const isEven = idx % 2 === 0;
                    const bg = isEven ? 'bg-white' : 'bg-slate-50/60';
                    return (
                      <tr key={row.person} className={`${bg} hover:bg-blue-50 transition-colors group border-b border-slate-100`}>
                        {/* Sticky name */}
                        <td className={`sticky left-0 z-10 ${bg} group-hover:bg-blue-50 px-3 py-1 border-r border-slate-200 transition-colors`}
                          style={{ minWidth: 180, maxWidth: 220 }}>
                          <button
                            onClick={() => openDrilldown(`${row.person} — Todas (${row.cols.demandas_recebidas})`, row.rows)}
                            className="font-semibold text-slate-800 text-left hover:text-[#1351B4] transition-colors w-full truncate text-[11px]"
                            title={row.person}>
                            {row.person}
                          </button>
                        </td>
                        {/* Fixed column cells */}
                        {FIXED_COLS.map(col => {
                          const count = row.cols[col.key] || 0;
                          const colLabel = `${col.line1}${col.line2 ? ' ' + col.line2 : ''}`;
                          // Badge color per column type
                          const isGgcon = col.key === 'total_ggcon';
                          const isConcluida = col.key === 'concluida';
                          const isTransf = col.key === 'transf_vol';
                          const isEmenda = col.key === 'emenda_loa';
                          const isRecebidas = col.key === 'demandas_recebidas';
                          const badgeClass = isGgcon ? 'bg-blue-700 hover:bg-blue-800'
                            : isConcluida ? 'bg-emerald-600 hover:bg-emerald-700'
                            : isTransf ? 'bg-teal-600 hover:bg-teal-700'
                            : isEmenda ? 'bg-violet-600 hover:bg-violet-700'
                            : isRecebidas ? 'bg-slate-600 hover:bg-slate-700'
                            : 'bg-red-600 hover:bg-red-700';
                          return (
                            <td key={col.key} className={`py-1 px-0.5 text-center border-l border-slate-100 ${isGgcon ? 'bg-blue-50/60' : isConcluida || isTransf || isEmenda ? 'bg-emerald-50/30' : ''}`}>
                              {count > 0 ? (
                                <button
                                  onClick={() => openDrilldown(`${row.person} — ${colLabel} (${count})`, getColRows(col.key, row.rows))}
                                  className={`inline-flex items-center justify-center ${badgeClass} text-white font-bold rounded text-[11px] px-1.5 py-0.5 min-w-[28px] active:scale-95 transition-all shadow-sm`}>
                                  {count}
                                </button>
                              ) : (
                                <span className="text-slate-200 text-[9px] select-none">·</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* Totals row — sticky bottom */}
                  <tr className="bg-slate-900 border-t-2 border-slate-600 sticky bottom-0 z-10">
                    <td className="sticky left-0 z-20 bg-slate-900 px-3 py-1.5 text-white font-black text-[11px] border-r border-slate-600"
                      style={{ minWidth: 180 }}>
                      TOTAL
                    </td>
                    {FIXED_COLS.map(col => {
                      const t = matrixData.totalCols[col.key] || 0;
                      const colLabel = `${col.line1}${col.line2 ? ' ' + col.line2 : ''}`;
                      const textClass = col.key === 'total_ggcon' ? 'text-yellow-300'
                        : col.key === 'concluida' ? 'text-emerald-400'
                        : col.key === 'transf_vol' ? 'text-teal-300'
                        : col.key === 'emenda_loa' ? 'text-violet-300'
                        : col.key === 'demandas_recebidas' ? 'text-white'
                        : 'text-red-300';
                      return (
                        <td key={col.key} className={`py-1.5 px-0.5 text-center border-l border-slate-700 ${col.bgTotal}`}>
                          {t > 0 ? (
                            <button onClick={() => openDrilldown(`Total — ${colLabel} (${t})`, getColRows(col.key, filtered))}
                              className={`font-black ${textClass} hover:underline text-[11px] transition-colors`}>
                              {t.toLocaleString('pt-BR')}
                            </button>
                          ) : <span className="text-slate-600 text-[9px]">·</span>}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Stage Summary Cards ───────────────────────────────────── */}
          {!compact && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#1351B4]" />
                Resumo por Estágio / Situação da Demanda
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8 gap-2">
                {FIXED_COLS.map(col => {
                  const count = matrixData.totalCols[col.key] || 0;
                  const pct = filtered.length > 0 ? Math.round((count / filtered.length) * 100) : 0;
                  const colLabel = `${col.line1}${col.line2 ? ' ' + col.line2 : ''}`;
                  const barColor = col.key === 'total_ggcon' ? 'from-blue-500 to-blue-700'
                    : col.key === 'concluida' ? 'from-emerald-500 to-emerald-700'
                    : col.key === 'transf_vol' ? 'from-teal-500 to-teal-700'
                    : col.key === 'emenda_loa' ? 'from-violet-500 to-violet-700'
                    : 'from-red-500 to-red-700';
                  return (
                    <motion.button
                      key={col.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => openDrilldown(`${colLabel} (${count})`, getColRows(col.key, filtered))}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 text-left hover:shadow-md hover:border-[#1351B4]/40 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="text-[10px] font-bold text-slate-500 uppercase leading-tight flex-1 pr-1">
                          {colLabel}
                        </div>
                        <span className={`text-xs font-black px-1.5 py-0.5 rounded flex-shrink-0 text-white ${col.key === 'total_ggcon' ? 'bg-blue-600' : col.key === 'concluida' ? 'bg-emerald-600' : col.key === 'transf_vol' ? 'bg-teal-600' : col.key === 'emenda_loa' ? 'bg-violet-600' : 'bg-red-600'}`}>
                          {count.toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={`h-full bg-gradient-to-r ${barColor} rounded-full`}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 group-hover:text-[#1351B4] transition-colors">
                        {pct}% do total
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Top 5 per column ─────────────────────────────────────── */}
          {!compact && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#1351B4]" />
                Top {viewMode === 'tecnico' ? 'Técnicos' : 'Conferencistas'} por Estágio
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {FIXED_COLS.filter(col => matrixData.totalCols[col.key] > 0 && col.key !== 'demandas_recebidas').map(col => {
                  const colLabel = `${col.line1}${col.line2 ? ' ' + col.line2 : ''}`;
                  const top5 = matrixData.rows
                    .filter(r => r.cols[col.key] > 0)
                    .sort((a, b) => b.cols[col.key] - a.cols[col.key])
                    .slice(0, 5);
                  const maxVal = top5[0]?.cols[col.key] || 1;
                  const headerColor = col.key === 'total_ggcon' ? 'bg-blue-700' : col.key === 'concluida' ? 'bg-emerald-600' : col.key === 'transf_vol' ? 'bg-teal-600' : col.key === 'emenda_loa' ? 'bg-violet-600' : 'bg-red-600';
                  return (
                    <div key={col.key} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className={`px-4 py-2.5 ${headerColor} flex items-center justify-between`}>
                        <h4 className="text-xs font-bold text-white">{colLabel}</h4>
                        <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-bold flex-shrink-0 ml-2">
                          {(matrixData.totalCols[col.key] || 0).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="p-3 space-y-2">
                        {top5.map(r => (
                          <div key={r.person}>
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <button
                                onClick={() => openDrilldown(`${r.person} — ${colLabel} (${r.cols[col.key]})`, getColRows(col.key, r.rows))}
                                className="text-xs font-semibold text-slate-700 truncate flex-1 text-left hover:text-[#1351B4] transition-colors">
                                {r.person}
                              </button>
                              <span className="text-xs font-black text-red-700 flex-shrink-0">{r.cols[col.key]}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-red-500 to-red-700 rounded-full transition-all"
                                style={{ width: `${(r.cols[col.key] / maxVal) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                        {top5.length === 0 && <p className="text-xs text-slate-400 text-center py-2">Nenhum dado</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
