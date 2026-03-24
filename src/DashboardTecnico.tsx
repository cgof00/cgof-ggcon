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

// ─── Known column ordering for area_estagio_situacao_demanda ───────────────
// These appear in a logical workflow order; additional discovered values go at end
const KNOWN_STAGE_ORDER = [
  'DEMANDA COM O TÉCNICO',
  'EM ANÁLISE DA DOCUMENTAÇÃO',
  'EM ANÁLISE DO PLANO DE TRABALHO',
  'AGUARDANDO DOCUMENTAÇÃO',
  'DEMANDA EM DILIGÊNCIA',
  'DEMANDA EM DILIGÊNCIA DOCUMENTO - DRS',
  'EM FORMALIZAÇÃO',
  'EM CONFERÊNCIA',
  'CONF / PENDÊNCIA',
  'EM ASSINATURA',
  'LAUDAS + PUBLI DOE',
  'COMITE GESTOR',
  'OUTRAS PENDÊNCIAS',
  'TOTAL NO GGCON',
  'CONCLUÍDA',
  'TRANSFERÊNCIA VOLUNTÁRIA',
];

// ─── Color map per stage column ─────────────────────────────────────────────
const STAGE_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  default: { bg: 'bg-red-600', text: 'text-white', badge: 'bg-red-600' },
};

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

  // Stage columns: ordered by known list, then any extra found in data
  const stageColumns = useMemo(() => {
    const found = [...new Set(filtered.map(r => String(r.area_estagio_situacao_demanda ?? '').trim()).filter(Boolean))];
    const ordered = KNOWN_STAGE_ORDER.filter(s => found.includes(s));
    const extras = found.filter(s => !KNOWN_STAGE_ORDER.includes(s)).sort();
    return [...ordered, ...extras];
  }, [filtered]);

  // Person field based on view mode
  const personField = viewMode === 'tecnico' ? 'tecnico' : 'conferencista';

  // Build matrix data: per person, per stage
  const matrixData = useMemo(() => {
    // Group by person
    const personMap = new Map<string, FormalizacaoRow[]>();
    for (const row of filtered) {
      const person = String(row[personField] ?? '').trim() || '(não atribuído)';
      if (!personMap.has(person)) personMap.set(person, []);
      personMap.get(person)!.push(row);
    }

    // Build rows sorted by total desc
    const rows = Array.from(personMap.entries()).map(([person, rows]) => {
      const stageCounts: Record<string, number> = {};
      for (const stage of stageColumns) {
        stageCounts[stage] = rows.filter(r =>
          String(r.area_estagio_situacao_demanda ?? '').trim() === stage
        ).length;
      }
      const total = rows.length;
      const concluidas = rows.filter(r => String(r.concluida_em ?? '').trim()).length;
      const valor = rows.reduce((s, r) => s + (Number(r.valor) || 0), 0);
      const emendas = [...new Set(rows.map(r => String(r.emenda ?? '').trim()).filter(Boolean))].length;
      return { person, stageCounts, total, concluidas, valor, emendas, rows };
    }).sort((a, b) => b.total - a.total);

    // Stage totals
    const stageTotals: Record<string, number> = {};
    for (const stage of stageColumns) {
      stageTotals[stage] = filtered.filter(r =>
        String(r.area_estagio_situacao_demanda ?? '').trim() === stage
      ).length;
    }

    return { rows, stageTotals };
  }, [filtered, stageColumns, personField]);

  // KPIs
  const totalValor = useMemo(() => filtered.reduce((s, r) => s + (Number(r.valor) || 0), 0), [filtered]);
  const totalConcluidas = useMemo(() => filtered.filter(r => String(r.concluida_em ?? '').trim()).length, [filtered]);
  const pctConcluidas = filtered.length > 0 ? Math.round((totalConcluidas / filtered.length) * 100) : 0;
  const totalEmAndamento = filtered.length - totalConcluidas;

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
    const header = ['Técnico/Conferencista', ...stageColumns, 'Total Demandas', 'Concluídas', 'Valor Total'].join(';');
    const body = matrixData.rows.map(r =>
      [r.person, ...stageColumns.map(s => r.stageCounts[s] || 0), r.total, r.concluidas, fmtCurrency(r.valor)].join(';')
    ).join('\n');
    const totalRow = ['TOTAL', ...stageColumns.map(s => matrixData.stageTotals[s] || 0), filtered.length, totalConcluidas, fmtCurrency(totalValor)].join(';');
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#1351B4]" />
            Demonstrativo por Técnico / Conferencista
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {lastUpdated
              ? `Atualizado às ${lastUpdated.toLocaleTimeString('pt-BR')} — ${rawData.length.toLocaleString('pt-BR')} registros`
              : 'Carregando dados...'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden bg-white text-xs font-bold">
            <button onClick={() => setViewMode('tecnico')}
              className={`px-3 py-1.5 flex items-center gap-1.5 transition-all ${viewMode === 'tecnico' ? 'bg-[#1351B4] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              <User className="w-3.5 h-3.5" /> Técnico
            </button>
            <button onClick={() => setViewMode('conferencista')}
              className={`px-3 py-1.5 flex items-center gap-1.5 transition-all ${viewMode === 'conferencista' ? 'bg-[#1351B4] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Users className="w-3.5 h-3.5" /> Conferencista
            </button>
          </div>
          <button onClick={() => setCompact(v => !v)}
            title={compact ? 'Expandir' : 'Compactar'}
            className="p-1.5 border border-gray-300 rounded-lg bg-white text-gray-600 hover:border-[#1351B4] hover:text-[#1351B4] transition-all">
            {compact ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button onClick={exportMatrix}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-all">
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
          <button onClick={loadData} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#1351B4] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#1351B4]" />
            <span className="text-sm font-bold text-slate-700">Filtros</span>
            {hasActiveFilters ? (
              <span className="text-[10px] bg-[#1351B4] text-white px-2 py-0.5 rounded-full font-bold">
                {filtered.length.toLocaleString('pt-BR')} de {rawData.length.toLocaleString('pt-BR')}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">{rawData.length.toLocaleString('pt-BR')} registros</span>
            )}
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 transition-colors">
              <X className="w-3.5 h-3.5" /> Limpar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <MultiCheckFilter label="Ano" options={anoOptions} selected={filtroAno} onChange={setFiltroAno} />
          <MultiCheckFilter label="Regional" options={regionalOptions} selected={filtroRegional} onChange={setFiltroRegional} />
          <MultiCheckFilter label="Técnico" options={tecnicoOptions} selected={filtroTecnico} onChange={setFiltroTecnico} />
          <MultiCheckFilter label="Conferencista" options={conferencistaOptions} selected={filtroConferencista} onChange={setFiltroConferencista} />
          <MultiCheckFilter label="Parlamentar" options={parlamentarOptions} selected={filtroParlamentar} onChange={setFiltroParlamentar} />
          <MultiCheckFilter label="Tipo Formalização" options={tipoOptions} selected={filtroTipo} onChange={setFiltroTipo} />
          <MultiCheckFilter label="Situação/Estágio" options={situacaoOptions} selected={filtroSituacao} onChange={setFiltroSituacao} />
          <div className="col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-1">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Campo de Data</label>
              <select value={filtroDataCampo} onChange={e => setFiltroDataCampo(e.target.value as any)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-700 focus:border-[#1351B4] outline-none">
                <option value="data_liberacao">Data Liberação</option>
                <option value="data_analise_demanda">Data Análise</option>
                <option value="data_recebimento_demanda">Data Recebimento</option>
              </select>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 mt-2.5">
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
            <div className="px-5 py-3 bg-slate-900 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4" />
                {viewMode === 'tecnico' ? 'Demonstrativo por Técnico' : 'Demonstrativo por Conferencista'}
                <span className="text-xs text-slate-400 font-normal">— clique em qualquer número para ver detalhes</span>
              </h3>
              <span className="text-xs text-slate-400">{matrixData.rows.length} {viewMode === 'tecnico' ? 'técnico(s)' : 'conferencista(s)'}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  {/* Stage header row */}
                  <tr className="bg-slate-800">
                    <th className="sticky left-0 z-10 bg-slate-800 px-4 py-2 text-left text-white font-bold min-w-[160px]">
                      {viewMode === 'tecnico' ? 'Técnico' : 'Conferencista'} ▲
                    </th>
                    <th className="px-3 py-2 text-center text-white font-bold whitespace-nowrap bg-slate-700 min-w-[80px]">
                      Demandas Recebidas
                    </th>
                    {stageColumns.map(stage => (
                      <th key={stage}
                        className="px-2 py-2 text-center text-white font-bold whitespace-nowrap min-w-[90px] bg-slate-800 border-l border-slate-700"
                        title={stage}>
                        <div className="max-w-[100px] leading-tight">
                          {stage.length > 20 ? stage.slice(0, 18) + '…' : stage}
                        </div>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center text-white font-bold whitespace-nowrap bg-slate-700 border-l border-slate-600 min-w-[80px]">Concluída</th>
                    <th className="px-3 py-2 text-center text-white font-bold whitespace-nowrap bg-slate-700 min-w-[100px]">Transf. Vol.</th>
                    <th className="px-3 py-2 text-center text-white font-bold whitespace-nowrap bg-slate-700 min-w-[80px]">Emenda LOA</th>
                  </tr>
                </thead>
                <tbody>
                  {matrixData.rows.map((row, idx) => {
                    const isEven = idx % 2 === 0;
                    const bgBase = isEven ? 'bg-white' : 'bg-slate-50';
                    const concluidas = row.rows.filter(r => String(r.concluida_em ?? '').trim()).length;
                    const transfVol = row.rows.filter(r => String(r.tipo_formalizacao ?? '').toLowerCase().includes('transfer')).length;
                    const emendaLoa = row.rows.filter(r => String(r.tipo_formalizacao ?? '').toLowerCase().includes('emenda') || String(r.classificacao_emenda_demanda ?? '').toLowerCase().includes('emenda')).length;

                    return (
                      <tr key={row.person}
                        className={`${bgBase} hover:bg-blue-50 transition-colors group border-b border-slate-100`}>
                        {/* Person name */}
                        <td className={`sticky left-0 z-10 ${bgBase} group-hover:bg-blue-50 px-4 transition-colors border-r border-slate-200`}
                          style={{ minWidth: 160 }}>
                          <button
                            onClick={() => openDrilldown(`${row.person} — Todas as demandas`, row.rows)}
                            className="font-bold text-slate-800 text-left hover:text-[#1351B4] transition-colors w-full truncate"
                            title={row.person}>
                            {compact ? row.person.split(' ')[0] : row.person}
                          </button>
                        </td>
                        {/* Total received */}
                        <td className="px-3 py-1.5 text-center font-semibold text-slate-700 bg-slate-50 border-r border-slate-200">
                          <button onClick={() => openDrilldown(`${row.person} — Todas (${row.total})`, row.rows)}
                            className="font-bold text-slate-800 hover:text-[#1351B4] transition-colors">
                            {row.total}
                          </button>
                        </td>
                        {/* Stage counts */}
                        {stageColumns.map(stage => {
                          const count = row.stageCounts[stage] || 0;
                          const stageRows = row.rows.filter(r =>
                            String(r.area_estagio_situacao_demanda ?? '').trim() === stage
                          );
                          return (
                            <td key={stage} className="px-2 py-1 text-center border-l border-slate-100">
                              {count > 0 ? (
                                <button
                                  onClick={() => openDrilldown(`${row.person} — ${stage} (${count})`, stageRows)}
                                  className="inline-flex items-center justify-center bg-red-600 text-white font-bold rounded px-2 py-0.5 min-w-[28px] hover:bg-red-700 active:scale-95 transition-all shadow-sm text-xs">
                                  {count}
                                </button>
                              ) : (
                                <span className="text-slate-200 text-[10px]">—</span>
                              )}
                            </td>
                          );
                        })}
                        {/* Concluídas */}
                        <td className="px-3 py-1.5 text-center border-l border-slate-200 bg-emerald-50">
                          {concluidas > 0 ? (
                            <button
                              onClick={() => openDrilldown(`${row.person} — Concluídas (${concluidas})`,
                                row.rows.filter(r => String(r.concluida_em ?? '').trim()))}
                              className="inline-flex items-center justify-center bg-emerald-600 text-white font-bold rounded px-2 py-0.5 min-w-[28px] hover:bg-emerald-700 transition-all shadow-sm text-xs">
                              {concluidas}
                            </button>
                          ) : <span className="text-slate-200 text-[10px]">—</span>}
                        </td>
                        {/* Transferência Voluntária */}
                        <td className="px-3 py-1.5 text-center bg-emerald-50">
                          {transfVol > 0 ? (
                            <button
                              onClick={() => openDrilldown(`${row.person} — Transferência Voluntária (${transfVol})`,
                                row.rows.filter(r => String(r.tipo_formalizacao ?? '').toLowerCase().includes('transfer')))}
                              className="font-semibold text-emerald-700 hover:text-emerald-900 transition-colors text-xs">
                              {transfVol}
                            </button>
                          ) : <span className="text-slate-300 text-[10px]">—</span>}
                        </td>
                        {/* Emenda LOA */}
                        <td className="px-3 py-1.5 text-center bg-emerald-50">
                          {emendaLoa > 0 ? (
                            <button
                              onClick={() => openDrilldown(`${row.person} — Emenda LOA (${emendaLoa})`,
                                row.rows.filter(r => String(r.tipo_formalizacao ?? '').toLowerCase().includes('emenda') || String(r.classificacao_emenda_demanda ?? '').toLowerCase().includes('emenda')))}
                              className="font-semibold text-emerald-700 hover:text-emerald-900 transition-colors text-xs">
                              {emendaLoa}
                            </button>
                          ) : <span className="text-slate-300 text-[10px]">—</span>}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Totals row */}
                  <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-600">
                    <td className="sticky left-0 z-10 bg-slate-900 px-4 py-2 text-white font-black" style={{ minWidth: 160 }}>
                      Total
                    </td>
                    <td className="px-3 py-2 text-center font-black text-yellow-300 bg-slate-800">
                      {filtered.length.toLocaleString('pt-BR')}
                    </td>
                    {stageColumns.map(stage => {
                      const t = matrixData.stageTotals[stage] || 0;
                      return (
                        <td key={stage} className="px-2 py-2 text-center border-l border-slate-700">
                          {t > 0 ? (
                            <button
                              onClick={() => openDrilldown(`Total — ${stage} (${t})`,
                                filtered.filter(r => String(r.area_estagio_situacao_demanda ?? '').trim() === stage))}
                              className="inline-flex items-center justify-center bg-red-700 text-white font-bold rounded px-2 py-0.5 min-w-[28px] hover:bg-red-800 active:scale-95 transition-all text-xs">
                              {t}
                            </button>
                          ) : <span className="text-slate-600">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center border-l border-slate-700 font-black text-emerald-400">
                      {totalConcluidas.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-3 py-2 text-center font-black text-emerald-400">
                      {filtered.filter(r => String(r.tipo_formalizacao ?? '').toLowerCase().includes('transfer')).length.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-3 py-2 text-center font-black text-emerald-400">
                      {filtered.filter(r => String(r.tipo_formalizacao ?? '').toLowerCase().includes('emenda') || String(r.classificacao_emenda_demanda ?? '').toLowerCase().includes('emenda')).length.toLocaleString('pt-BR')}
                    </td>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {stageColumns.map(stage => {
                  const count = matrixData.stageTotals[stage] || 0;
                  const pct = filtered.length > 0 ? Math.round((count / filtered.length) * 100) : 0;
                  const stageRows = filtered.filter(r =>
                    String(r.area_estagio_situacao_demanda ?? '').trim() === stage
                  );
                  return (
                    <motion.button
                      key={stage}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => openDrilldown(`${stage} (${count})`, stageRows)}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 text-left hover:shadow-md hover:border-[#1351B4]/40 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="text-[10px] font-bold text-slate-500 uppercase leading-tight flex-1 pr-2" title={stage}>
                          {stage}
                        </div>
                        {count > 0 && (
                          <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded flex-shrink-0">
                            {count}
                          </span>
                        )}
                        {count === 0 && <span className="text-slate-300 text-xs">0</span>}
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-red-500 to-red-700 rounded-full"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5 group-hover:text-[#1351B4] transition-colors">
                        {pct}% do total filtrado
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Top 5 per stage detail ────────────────────────────────── */}
          {!compact && stageColumns.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#1351B4]" />
                Top {viewMode === 'tecnico' ? 'Técnicos' : 'Conferencistas'} por Estágio
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {stageColumns.filter(s => matrixData.stageTotals[s] > 0).map(stage => {
                  const top5 = matrixData.rows
                    .filter(r => r.stageCounts[stage] > 0)
                    .sort((a, b) => b.stageCounts[stage] - a.stageCounts[stage])
                    .slice(0, 5);
                  const maxVal = top5[0]?.stageCounts[stage] || 1;
                  return (
                    <div key={stage} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-4 py-2.5 bg-red-600 flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white truncate flex-1" title={stage}>{stage}</h4>
                        <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-bold flex-shrink-0 ml-2">
                          {matrixData.stageTotals[stage]}
                        </span>
                      </div>
                      <div className="p-3 space-y-2">
                        {top5.map((r, i) => (
                          <div key={r.person}>
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <button
                                onClick={() => openDrilldown(
                                  `${r.person} — ${stage} (${r.stageCounts[stage]})`,
                                  r.rows.filter(row => String(row.area_estagio_situacao_demanda ?? '').trim() === stage)
                                )}
                                className="text-xs font-semibold text-slate-700 truncate flex-1 text-left hover:text-[#1351B4] transition-colors">
                                {r.person}
                              </button>
                              <span className="text-xs font-black text-red-700 flex-shrink-0">{r.stageCounts[stage]}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-red-500 to-red-700 rounded-full transition-all"
                                style={{ width: `${(r.stageCounts[stage] / maxVal) * 100}%` }}
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
