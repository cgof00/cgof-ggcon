import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart3,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Tag,
  FileText,
  Briefcase,
  Layers,
  Wallet,
  MapPin,
  DollarSign,
  TrendingUp,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from './AuthContext';

// ─────────────────────────── Helpers ────────────────────────────────────────

function groupBy(data: any[], field: string): { label: string; value: number }[] {
  const map = new Map<string, number>();
  data.forEach(row => {
    const raw = String(row[field] ?? '').trim();
    const key = raw || '(não preenchido)';
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(n);
}

// ─────────────────────────── Sub-components ─────────────────────────────────

function HorizontalBar({
  items,
  gradientFrom,
  gradientTo,
  badgeClass,
}: {
  items: { label: string; value: number }[];
  gradientFrom: string;
  gradientTo: string;
  badgeClass: string;
}) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-700 flex-1 leading-snug">
              {item.label}
            </span>
            <div
              className={`${badgeClass} px-3 py-0.5 rounded-full font-bold text-sm min-w-[3rem] text-center flex-shrink-0`}
            >
              {item.value}
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ duration: 0.8, delay: idx * 0.03, ease: 'easeOut' }}
              className={`h-full bg-gradient-to-r ${gradientFrom} ${gradientTo} rounded-full shadow-sm`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  count,
  headerClass,
  gradientFrom,
  gradientTo,
  badgeClass,
  items,
}: {
  title: string;
  icon: React.ElementType;
  count: number;
  headerClass: string;
  gradientFrom: string;
  gradientTo: string;
  badgeClass: string;
  items: { label: string; value: number }[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
    >
      <button
        onClick={() => setCollapsed(c => !c)}
        className={`w-full flex items-center justify-between px-6 py-4 ${headerClass} text-white transition-all hover:opacity-95`}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          <h3 className="text-base font-bold">{title}</h3>
          <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">
            {count} tipo{count !== 1 ? 's' : ''}
          </span>
        </div>
        {collapsed ? (
          <ChevronRight className="w-5 h-5 opacity-80" />
        ) : (
          <ChevronDown className="w-5 h-5 opacity-80" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-5">
              {items.length > 0 ? (
                <HorizontalBar
                  items={items}
                  gradientFrom={gradientFrom}
                  gradientTo={gradientTo}
                  badgeClass={badgeClass}
                />
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">
                  Nenhum dado para exibir.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  colorClass,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  colorClass: string;
  icon: React.ElementType;
}) {
  return (
    <div className={`${colorClass} text-white rounded-2xl px-5 py-4 flex items-center gap-4 shadow-lg`}>
      <div className="bg-white/20 rounded-xl p-2.5 flex-shrink-0">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-white/75">{label}</p>
        <p className="text-xl font-bold leading-tight truncate">{value}</p>
        {sub && <p className="text-xs text-white/60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Simple multi-check dropdown ─────────────────────────────────────────────

function MultiCheckFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const visible = options.filter(o =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);

  return (
    <div ref={ref} className="relative">
      <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">{label}</label>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between hover:border-[#1351B4] transition-colors"
      >
        <span className="truncate text-gray-700">
          {selected.length
            ? `${selected.length} selecionado${selected.length > 1 ? 's' : ''}`
            : 'Todos'}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0 ml-1">
          {selected.length > 0 && (
            <span
              role="button"
              onClick={e => {
                e.stopPropagation();
                onChange([]);
              }}
              className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 w-max min-w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl">
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#1351B4] text-gray-900 bg-white"
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {visible.map(opt => (
              <label
                key={opt}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                  className="rounded accent-[#1351B4]"
                />
                <span>{opt}</span>
              </label>
            ))}
            {visible.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-400">Nenhuma opção</p>
            )}
          </div>
          <div className="border-t border-gray-100 p-2">
            <button
              onClick={() => setOpen(false)}
              className="w-full px-3 py-1.5 text-xs font-bold text-white bg-[#1351B4] rounded-lg hover:bg-[#0C326F] transition-all"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── Chart definitions ───────────────────────────────

const SECTIONS = [
  {
    id: 'classificacao',
    field: 'classificacao_emenda_demanda',
    title: 'Classificação da Emenda / Demanda',
    icon: Tag,
    headerClass: 'bg-gradient-to-r from-[#1351B4] to-[#0C326F]',
    gradientFrom: 'from-[#1351B4]',
    gradientTo: 'to-[#2670E8]',
    badgeClass: 'bg-blue-100 text-[#1351B4]',
  },
  {
    id: 'tipo_formalizacao',
    field: 'tipo_formalizacao',
    title: 'Tipo de Formalização',
    icon: FileText,
    headerClass: 'bg-gradient-to-r from-violet-600 to-violet-800',
    gradientFrom: 'from-violet-500',
    gradientTo: 'to-violet-700',
    badgeClass: 'bg-violet-100 text-violet-700',
  },
  {
    id: 'objeto',
    field: 'objeto',
    title: 'Objeto',
    icon: Briefcase,
    headerClass: 'bg-gradient-to-r from-emerald-600 to-emerald-800',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-emerald-700',
    badgeClass: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'portfolio',
    field: 'portfolio',
    title: 'Portfólio',
    icon: Layers,
    headerClass: 'bg-gradient-to-r from-amber-500 to-amber-700',
    gradientFrom: 'from-amber-400',
    gradientTo: 'to-amber-600',
    badgeClass: 'bg-amber-100 text-amber-700',
  },
  {
    id: 'recurso',
    field: 'recurso',
    title: 'Recurso',
    icon: Wallet,
    headerClass: 'bg-gradient-to-r from-sky-600 to-sky-800',
    gradientFrom: 'from-sky-500',
    gradientTo: 'to-sky-700',
    badgeClass: 'bg-sky-100 text-sky-700',
  },
  {
    id: 'area_estagio',
    field: 'area_estagio',
    title: 'Área / Estágio',
    icon: MapPin,
    headerClass: 'bg-gradient-to-r from-rose-600 to-rose-800',
    gradientFrom: 'from-rose-500',
    gradientTo: 'to-rose-700',
    badgeClass: 'bg-rose-100 text-rose-700',
  },
] as const;

// ─────────────────────────── Main Component ──────────────────────────────────

export function DashboardClassificacao() {
  const { token } = useAuth();

  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState<any[]>([]);

  // Filters
  const [filtroAno, setFiltroAno] = useState<string[]>([]);
  const [filtroRegional, setFiltroRegional] = useState<string[]>([]);
  const [filtroTecnico, setFiltroTecnico] = useState<string[]>([]);
  const [filtroParlamentar, setFiltroParlamentar] = useState<string[]>([]);
  const [filtroDataDe, setFiltroDataDe] = useState('');
  const [filtroDataAte, setFiltroDataAte] = useState('');

  // ── Load all records (same pattern as AdminPanel) ───────────────────────
  const loadData = async () => {
    const authToken = token ?? localStorage.getItem('auth_token');
    if (!authToken) return;
    try {
      setLoading(true);
      let all: any[] = [];
      let offset = 0;
      const batchSize = 1000;
      while (true) {
        const res = await fetch(
          `/api/formalizacao?limit=${batchSize}&offset=${offset}`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        if (!res.ok) break;
        const result = await res.json();
        const batch: any[] = Array.isArray(result) ? result : (result.data ?? []);
        all = all.concat(batch);
        if (batch.length < batchSize) break;
        offset += batchSize;
      }
      setRawData(all);
    } catch (err) {
      console.error('Erro ao carregar dashboard classificação:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Filter option lists ──────────────────────────────────────────────────
  const anoOptions = useMemo(
    () =>
      Array.from(new Set(rawData.map(r => String(r.ano ?? '').trim()).filter(Boolean)))
        .sort()
        .reverse(),
    [rawData]
  );
  const regionalOptions = useMemo(
    () =>
      Array.from(
        new Set(rawData.map(r => String(r.regional ?? '').trim()).filter(Boolean))
      ).sort(),
    [rawData]
  );
  const tecnicoOptions = useMemo(
    () =>
      Array.from(
        new Set(rawData.map(r => String(r.tecnico ?? '').trim()).filter(Boolean))
      ).sort(),
    [rawData]
  );
  const parlamentarOptions = useMemo(
    () =>
      Array.from(
        new Set(rawData.map(r => String(r.parlamentar ?? '').trim()).filter(Boolean))
      ).sort(),
    [rawData]
  );

  // ── Apply filters ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let data = rawData;
    if (filtroAno.length)
      data = data.filter(r => filtroAno.includes(String(r.ano ?? '').trim()));
    if (filtroRegional.length)
      data = data.filter(r => filtroRegional.includes(String(r.regional ?? '').trim()));
    if (filtroTecnico.length)
      data = data.filter(r => filtroTecnico.includes(String(r.tecnico ?? '').trim()));
    if (filtroParlamentar.length)
      data = data.filter(r =>
        filtroParlamentar.includes(String(r.parlamentar ?? '').trim())
      );
    if (filtroDataDe)
      data = data.filter(r => (r.data_liberacao ?? '') >= filtroDataDe);
    if (filtroDataAte)
      data = data.filter(r => (r.data_liberacao ?? '') <= filtroDataAte);
    return data;
  }, [rawData, filtroAno, filtroRegional, filtroTecnico, filtroParlamentar, filtroDataDe, filtroDataAte]);

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const totalValor = useMemo(
    () => filtered.reduce((sum, r) => sum + (Number(r.valor) || 0), 0),
    [filtered]
  );
  const totalConcluidas = useMemo(
    () => filtered.filter(r => String(r.concluida_em ?? '').trim()).length,
    [filtered]
  );

  // ── Per-section aggregations ──────────────────────────────────────────────
  const groupedData = useMemo(
    () =>
      Object.fromEntries(
        SECTIONS.map(s => [s.id, groupBy(filtered, s.field)])
      ) as Record<(typeof SECTIONS)[number]['id'], { label: string; value: number }[]>,
    [filtered]
  );

  const hasActiveFilters =
    filtroAno.length ||
    filtroRegional.length ||
    filtroTecnico.length ||
    filtroParlamentar.length ||
    filtroDataDe ||
    filtroDataAte;

  const clearFilters = () => {
    setFiltroAno([]);
    setFiltroRegional([]);
    setFiltroTecnico([]);
    setFiltroParlamentar([]);
    setFiltroDataDe('');
    setFiltroDataAte('');
  };

  const pctConcluidas =
    filtered.length > 0 ? Math.round((totalConcluidas / filtered.length) * 100) : 0;
  const emAndamento = filtered.length - totalConcluidas;

  return (
    <div className="space-y-6">
      {/* ─── Filters ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-[#1351B4]" />
            <h3 className="text-base font-bold text-slate-800">Filtros</h3>
            {hasActiveFilters ? (
              <span className="text-xs bg-[#1351B4]/10 text-[#1351B4] px-2 py-0.5 rounded-full font-semibold">
                {filtered.length} de {rawData.length}
              </span>
            ) : (
              <span className="text-xs text-slate-400">
                {rawData.length.toLocaleString('pt-BR')} registros
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all"
              >
                <X className="w-3.5 h-3.5" />
                Limpar
              </button>
            )}
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#1351B4] bg-blue-50 rounded-lg hover:bg-blue-100 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MultiCheckFilter
            label="Ano"
            options={anoOptions}
            selected={filtroAno}
            onChange={setFiltroAno}
          />
          <MultiCheckFilter
            label="Regional"
            options={regionalOptions}
            selected={filtroRegional}
            onChange={setFiltroRegional}
          />
          <MultiCheckFilter
            label="Técnico"
            options={tecnicoOptions}
            selected={filtroTecnico}
            onChange={setFiltroTecnico}
          />
          <MultiCheckFilter
            label="Parlamentar"
            options={parlamentarOptions}
            selected={filtroParlamentar}
            onChange={setFiltroParlamentar}
          />
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">
              Data Liberação (de)
            </label>
            <input
              type="date"
              value={filtroDataDe}
              onChange={e => setFiltroDataDe(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:border-[#1351B4] focus:ring-1 focus:ring-[#1351B4]/20 outline-none bg-white text-gray-900"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">
              Data Liberação (até)
            </label>
            <input
              type="date"
              value={filtroDataAte}
              onChange={e => setFiltroDataAte(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:border-[#1351B4] focus:ring-1 focus:ring-[#1351B4]/20 outline-none bg-white text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* ─── Loading state ───────────────────────────────────────────── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1351B4] border-b-transparent" />
          <p className="text-slate-600 font-medium text-sm">Carregando dados...</p>
          <p className="text-slate-400 text-xs">Aguarde, buscando todos os registros</p>
        </div>
      )}

      {!loading && rawData.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
          <BarChart3 className="w-14 h-14 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum dado carregado.</p>
          <p className="text-gray-400 text-sm mt-1">
            Clique em Atualizar para carregar os dados.
          </p>
        </div>
      )}

      {!loading && rawData.length > 0 && (
        <>
          {/* ─── KPI Cards ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Registros filtrados"
              value={fmtCompact(filtered.length)}
              sub={
                hasActiveFilters
                  ? `de ${fmtCompact(rawData.length)} total`
                  : undefined
              }
              colorClass="bg-[#1351B4]"
              icon={BarChart3}
            />
            <KpiCard
              label="Valor Total"
              value={fmtCurrency(totalValor)}
              colorClass="bg-emerald-600"
              icon={DollarSign}
            />
            <KpiCard
              label="Concluídas"
              value={fmtCompact(totalConcluidas)}
              sub={`${pctConcluidas}% do total filtrado`}
              colorClass="bg-violet-600"
              icon={CheckCircle2}
            />
            <KpiCard
              label="Em Andamento"
              value={fmtCompact(emAndamento)}
              sub={`${100 - pctConcluidas}% do total filtrado`}
              colorClass="bg-amber-500"
              icon={TrendingUp}
            />
          </div>

          {/* ─── Classification sections ─────────────────────────────── */}
          <div className="space-y-4">
            {SECTIONS.map(s => (
              <Section
                key={s.id}
                title={s.title}
                icon={s.icon}
                count={groupedData[s.id].length}
                headerClass={s.headerClass}
                gradientFrom={s.gradientFrom}
                gradientTo={s.gradientTo}
                badgeClass={s.badgeClass}
                items={groupedData[s.id]}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
