import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart3, Filter, RefreshCw, X, ChevronDown, ChevronUp, ChevronRight,
  Users, CheckCircle2, DollarSign, TrendingUp, AlertCircle,
  Search, Download, ArrowUpDown, User, MapPin, Calendar,
  Clock, FileText, Eye, EyeOff, Maximize2, Minimize2,
  Flame, PieChart, Activity
} from 'lucide-react';
import { useAuth } from './AuthContext';
import * as XLSX from 'xlsx';

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
  data_liberacao_assinatura_conferencista?: string;
  data_liberacao_assinatura?: string;
  publicacao?: string;
  vigencia?: string;
  encaminhado_em?: string;
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
  { key: 'diligencia',         line1: 'Diligência',   line2: '',           bgHead: 'bg-amber-700',  bgTotal: 'bg-amber-800', isDiligencia: true },
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

// Normaliza estágios Fundo a Fundo para o nome canônico de cada coluna
// Regex captura sufixos "– FUNDO A FUNDO", "- FUNDO A FUNDO", etc. (en/em dash ou hífen)
const FF_SUFFIX = /\s*[–—-]\s*FUNDO A FUNDO\s*$/;
const FUNDO_REMAP: Record<string, string> = {
  // Mapeamento de nomes completos especiais (sem sufixo removível)
  'AGUARDANDO RESOLUÇÃO PARA EMISSÃO RESOLUÇÃO PARA REPASSE FUNDO A FUNDO - DOE': 'LAUDAS + PUBLI DOE',
  // Mapeamento de bases após remoção do sufixo
  'EM ANÁLISE ORÇAMENTÁRIA CGOF':                          'EM ANÁLISE DA DOCUMENTAÇÃO',
  'PARECER COORDENADOR CGOF':                              'EM ANÁLISE DA DOCUMENTAÇÃO',
  'APROVAÇÃO - CHEFIA DE GABINETE':                        'EM ANÁLISE DA DOCUMENTAÇÃO',
  'AGUARDANDO APROVAÇÃO DO SECRETARIO DE ESTADO DA SAÚDE': 'AGUARDANDO DOCUMENTAÇÃO',
  'CONFERÊNCIA COM PENDÊNCIA':                             'CONF / PENDÊNCIA',
  'LAUDAS':                                                'LAUDAS + PUBLI DOE',
  'PUBLICAÇÃO NO DOE':                                     'LAUDAS + PUBLI DOE',
  'COMITÊ GESTOR':                                         'COMITE GESTOR',
  'EMPENHO CANCELADO':                                     'OUTRAS PENDÊNCIAS',
  'PROCESSO SIAFEM':                                       'OUTRAS PENDÊNCIAS',
};
const stgNorm = (r: FormalizacaoRow): string => {
  const raw = stg(r);
  // Só aplica remapeamento se o estágio for de Fundo a Fundo — evita
  // contaminar contagens de registros que têm estágios homônimos sem o sufixo FF
  if (!raw.includes('FUNDO A FUNDO')) return raw;
  // Nome completo especial (não tem sufixo removível)
  if (FUNDO_REMAP[raw]) return FUNDO_REMAP[raw];
  // Remove sufixo FF e busca nome canônico; se não houver, usa a base limpa
  const base = raw.replace(FF_SUFFIX, '').trim();
  return FUNDO_REMAP[base] ?? base;
};

// ─── Situação color mapping ───────────────────────────────────────────────
function getSituacaoStyle(label: string): { bar: string; badge: string; border: string } {
  const u = label.toUpperCase();
  if (u.includes('CANCELAD'))       return { bar: 'from-red-500 to-red-700',         badge: 'bg-red-600',     border: 'border-red-300' };
  if (u.includes('EXCLUÍD') || u.includes('EXCLUIDA') || u.includes('EXCLUÍDO'))
                                    return { bar: 'from-rose-700 to-red-900',         badge: 'bg-rose-700',    border: 'border-rose-300' };
  if (u.includes('IMPEDID') || u.includes('IMPEDIMENTO') || u.includes('BLOQUEADA'))
                                    return { bar: 'from-orange-600 to-red-600',       badge: 'bg-orange-600',  border: 'border-orange-300' };
  if (u.includes('DEVOLVID') || u.includes('DEVOLUÇÃO'))
                                    return { bar: 'from-orange-400 to-orange-600',   badge: 'bg-orange-500',  border: 'border-orange-200' };
  if (u.includes('SUSPENS') || u.includes('PARALISAD'))
                                    return { bar: 'from-amber-500 to-amber-700',      badge: 'bg-amber-600',   border: 'border-amber-300' };
  if (u.includes('ARQUIVAD') || u.includes('INAPTA') || u.includes('INAPTO'))
                                    return { bar: 'from-gray-500 to-gray-700',        badge: 'bg-gray-600',    border: 'border-gray-300' };
  if (u.includes('CONCLUÍD') || u.includes('CONCLUIDA') || u.includes('CONCLUÍDO'))
                                    return { bar: 'from-emerald-500 to-emerald-700',  badge: 'bg-emerald-600', border: 'border-emerald-300' };
  if (u.includes('APROVAD') || u.includes('REGULAR'))
                                    return { bar: 'from-blue-500 to-blue-700',        badge: 'bg-blue-600',    border: 'border-blue-300' };
  if (u.includes('DILIGÊNCIA') || u.includes('DILIGENCIA'))
                                    return { bar: 'from-amber-600 to-orange-600',     badge: 'bg-amber-700',   border: 'border-amber-300' };
  if (u.includes('ANÁLISE') || u.includes('ANALISE'))
                                    return { bar: 'from-indigo-500 to-indigo-700',    badge: 'bg-indigo-600',  border: 'border-indigo-300' };
  if (u.includes('PENDÊNCIA') || u.includes('PENDENCIA') || u.includes('AGUARDAND'))
                                    return { bar: 'from-amber-400 to-amber-600',      badge: 'bg-amber-500',   border: 'border-amber-200' };
  if (u.includes('FORMALIZ'))       return { bar: 'from-cyan-500 to-cyan-700',        badge: 'bg-cyan-600',    border: 'border-cyan-300' };
  if (u.includes('CONFERÊN') || u.includes('CONFERENCIA'))
                                    return { bar: 'from-sky-500 to-sky-700',          badge: 'bg-sky-600',     border: 'border-sky-300' };
  if (u.includes('ASSINATURA'))     return { bar: 'from-teal-500 to-teal-700',        badge: 'bg-teal-600',    border: 'border-teal-300' };
  return                              { bar: 'from-slate-500 to-slate-700',        badge: 'bg-slate-600',   border: 'border-slate-300' };
}

// Stages that count toward Total GGCON (Diligência excluded) — usa nomes canônicos (stgNorm)
const GGCON_STAGES = new Set([
  'DEMANDA COM O TÉCNICO',
  'EM ANÁLISE DA DOCUMENTAÇÃO',
  'EM ANÁLISE DO PLANO DE TRABALHO',
  'AGUARDANDO DOCUMENTAÇÃO',
  'EM FORMALIZAÇÃO',
  'EM CONFERÊNCIA',
  'CONF / PENDÊNCIA',
  'EM ASSINATURA',
  'LAUDAS + PUBLI DOE',
  'COMITE GESTOR',
  'OUTRAS PENDÊNCIAS',
]);

function computeColValues(rows: FormalizacaoRow[]): Record<ColKey, number> {
  const cTecnico        = rows.filter(r => stgNorm(r) === 'DEMANDA COM O TÉCNICO').length;
  const emAnalise       = rows.filter(r => stgNorm(r) === 'EM ANÁLISE DA DOCUMENTAÇÃO' || stgNorm(r) === 'EM ANÁLISE DO PLANO DE TRABALHO').length;
  const agDoc           = rows.filter(r => stgNorm(r) === 'AGUARDANDO DOCUMENTAÇÃO').length;
  const diligencia      = rows.filter(r => stgNorm(r).startsWith('DEMANDA EM DILIGÊNCIA')).length;
  const formalizacao    = rows.filter(r => stgNorm(r) === 'EM FORMALIZAÇÃO').length;
  const emConferencia   = rows.filter(r => stgNorm(r) === 'EM CONFERÊNCIA').length;
  const confPendencia   = rows.filter(r => stgNorm(r) === 'CONF / PENDÊNCIA').length;
  const emAssinatura    = rows.filter(r => stgNorm(r) === 'EM ASSINATURA').length;
  const laudas          = rows.filter(r => stgNorm(r) === 'LAUDAS + PUBLI DOE').length;
  const comite          = rows.filter(r => stgNorm(r) === 'COMITE GESTOR').length;
  const outras          = rows.filter(r => stgNorm(r) === 'OUTRAS PENDÊNCIAS').length;
  // Total GGCON = soma dos estágios GGCON_STAGES (Diligência NOT included)
  const totalGgcon      = rows.filter(r => GGCON_STAGES.has(stgNorm(r))).length;
  // Concluída = tem data preenchida em concluida_em
  const concluida       = rows.filter(r => !!(r.concluida_em ?? '').trim()).length;
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
    case 'c_tecnico':      return rows.filter(r => stgNorm(r) === 'DEMANDA COM O TÉCNICO');
    case 'em_analise':     return rows.filter(r => stgNorm(r) === 'EM ANÁLISE DA DOCUMENTAÇÃO' || stgNorm(r) === 'EM ANÁLISE DO PLANO DE TRABALHO');
    case 'ag_doc':         return rows.filter(r => stgNorm(r) === 'AGUARDANDO DOCUMENTAÇÃO');
    case 'diligencia':     return rows.filter(r => stgNorm(r).startsWith('DEMANDA EM DILIGÊNCIA'));
    case 'formalizacao':   return rows.filter(r => stgNorm(r) === 'EM FORMALIZAÇÃO');
    case 'em_conferencia': return rows.filter(r => stgNorm(r) === 'EM CONFERÊNCIA');
    case 'conf_pendencia': return rows.filter(r => stgNorm(r) === 'CONF / PENDÊNCIA');
    case 'em_assinatura':  return rows.filter(r => stgNorm(r) === 'EM ASSINATURA');
    case 'laudas':         return rows.filter(r => stgNorm(r) === 'LAUDAS + PUBLI DOE');
    case 'comite':         return rows.filter(r => stgNorm(r) === 'COMITE GESTOR');
    case 'outras':         return rows.filter(r => stgNorm(r) === 'OUTRAS PENDÊNCIAS');
    case 'total_ggcon':    return rows.filter(r => GGCON_STAGES.has(stgNorm(r)));
    case 'concluida':      return rows.filter(r => !!(r.concluida_em ?? '').trim());
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
          {selected.length === 0 ? 'Todos' : selected.length <= 2 ? selected.join(', ') : `${selected.length} sel.`}
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
const PAGE_SIZE = 100;
function DrilldownModal({
  title, rows, onClose
}: { title: string; rows: FormalizacaoRow[]; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string>('demandas_formalizacao');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);
  const [isDraggingScroll, setIsDraggingScroll] = useState(false);
  const dragStateRef = useRef({ isDown: false, startX: 0, scrollLeft: 0, hasMoved: false });

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return rows.filter(r =>
      !s ||
      String(r.demandas_formalizacao ?? '').toLowerCase().includes(s) ||
      String(r.conveniado ?? '').toLowerCase().includes(s) ||
      String(r.regional ?? '').toLowerCase().includes(s) ||
      String(r.classificacao_emenda_demanda ?? '').toLowerCase().includes(s) ||
      String(r.situacao_demandas_sempapel ?? '').toLowerCase().includes(s) ||
      String(r.area_estagio_situacao_demanda ?? '').toLowerCase().includes(s) ||
      String(r.falta_assinatura ?? '').toLowerCase().includes(s)
    );
  }, [rows, search]);

  // Reset page when search changes
  useEffect(() => { setPage(0); }, [search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = String((a as any)[sortCol] ?? '');
      const bv = String((b as any)[sortCol] ?? '');
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortCol, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = useMemo(() => sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [sorted, page]);

  const handleDrillMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = tableRef.current;
    if (!el) return;
    dragStateRef.current = { isDown: true, startX: e.pageX, scrollLeft: el.scrollLeft, hasMoved: false };
    setIsDraggingScroll(true);
  };
  const handleDrillMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.isDown) return;
    const el = tableRef.current;
    if (!el) return;
    const walk = e.pageX - dragStateRef.current.startX;
    if (Math.abs(walk) > 3) {
      dragStateRef.current.hasMoved = true;
      el.scrollLeft = dragStateRef.current.scrollLeft - walk;
    }
  };
  const handleDrillMouseUp = () => {
    dragStateRef.current.isDown = false;
    setIsDraggingScroll(false);
  };
  const handleDrillMouseLeave = () => {
    dragStateRef.current.isDown = false;
    setIsDraggingScroll(false);
  };

  const cols: { key: keyof FormalizacaoRow | '_demanda'; label: string; width?: number }[] = [
    { key: '_demanda',                        label: 'Demanda',          width: 130 },
    { key: 'ano',                             label: 'Ano',              width: 70  },
    { key: 'tecnico',                         label: 'Técnico',          width: 110 },
    { key: 'conferencista',                   label: 'Conferencista',    width: 110 },
    { key: 'classificacao_emenda_demanda',    label: 'Classificação',    width: 120 },
    { key: 'municipio',                       label: 'Município',        width: 150 },
    { key: 'regional',                        label: 'Regional',         width: 130 },
    { key: 'conveniado',                      label: 'Conveniado',       width: 180 },
    { key: 'area_estagio_situacao_demanda',   label: 'Área / Situação',  width: 180 },
    { key: 'situacao_analise_demanda',        label: 'Situação Análise', width: 180 },
    { key: 'falta_assinatura',                label: 'Falta Assinatura', width: 150 },
    { key: 'situacao_demandas_sempapel',      label: 'SemPapel',         width: 200 },
    { key: 'data_liberacao',                  label: 'Dt. Lib.',         width: 90 },
    { key: 'data_recebimento_demanda',        label: 'Dt. Receb.',       width: 90 },
    { key: 'publicacao',                      label: 'Publicação',       width: 90 },
  ];

  const getCellValue = (r: FormalizacaoRow, key: string): string => {
    if (key === '_demanda') return r.demandas_formalizacao || r.demanda || r.emenda || String(r.id ?? '') || '—';
    return String((r as any)[key] ?? '—') || '—';
  };

  // Export XLSX
  const exportXLSX = () => {
    const header = cols.map(c => c.label);
    const body = sorted.map(r => cols.map(c => getCellValue(r, c.key)));
    const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
    ws['!cols'] = cols.map(c => ({ wch: Math.round((c.width ?? 120) / 7) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Detalhes');
    XLSX.writeFile(wb, 'drilldown.xlsx');
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
            <button onClick={exportXLSX}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white/20 hover:bg-white/30 rounded-lg transition-all">
              <Download className="w-3.5 h-3.5" /> XLSX
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
        <div ref={tableRef}
          onMouseDown={handleDrillMouseDown}
          onMouseMove={handleDrillMouseMove}
          onMouseUp={handleDrillMouseUp}
          onMouseLeave={handleDrillMouseLeave}
          className={`flex-1 overflow-auto select-none ${isDraggingScroll ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ WebkitUserSelect: 'none', userSelect: 'none' }}>
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
              {paged.map((r, i) => (
                <tr key={r.id ?? i} className="hover:bg-blue-50 transition-colors">
                  {cols.map(col => {
                    const val = getCellValue(r, col.key);
                    const isDate = col.key === 'data_liberacao' || col.key === 'data_recebimento_demanda' || col.key === 'publicacao';
                    return (
                      <td key={col.key} className={`px-3 py-1.5 text-slate-700 max-w-[220px] truncate${col.key === 'tecnico' || col.key === 'conferencista' ? ' font-bold' : ''}`}
                        title={val}>
                        {isDate ? fmtDate(val === '—' ? '' : val) : val}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={cols.length} className="text-center py-8 text-gray-400">Nenhum registro</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-slate-50 flex-shrink-0">
            <span className="text-[11px] text-slate-500">
              {(page * PAGE_SIZE + 1)}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} de {sorted.length}
            </span>
            <div className="flex items-center gap-1">
              <button disabled={page === 0} onClick={() => { setPage(0); tableRef.current?.scrollTo(0, 0); }}
                className="px-2 py-1 text-[11px] font-bold rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-100 transition-colors">««</button>
              <button disabled={page === 0} onClick={() => { setPage(p => p - 1); tableRef.current?.scrollTo(0, 0); }}
                className="px-2 py-1 text-[11px] font-bold rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-100 transition-colors">‹</button>
              <span className="text-[11px] font-bold text-slate-700 px-2">{page + 1} / {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => { setPage(p => p + 1); tableRef.current?.scrollTo(0, 0); }}
                className="px-2 py-1 text-[11px] font-bold rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-100 transition-colors">›</button>
              <button disabled={page >= totalPages - 1} onClick={() => { setPage(totalPages - 1); tableRef.current?.scrollTo(0, 0); }}
                className="px-2 py-1 text-[11px] font-bold rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-100 transition-colors">»»</button>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}

// ─── Timeline helpers & constants ──────────────────────────────────────────
// Ordered stages of a demand's lifecycle (last = concluded, excluded from pending view)
const TIMELINE_STAGES = [
  { key: 'data_liberacao'                          as keyof FormalizacaoRow, label: 'Liberação',                  short: 'Liberação',      dot: 'bg-blue-600'    },
  { key: 'data_analise_demanda'                    as keyof FormalizacaoRow, label: 'Análise Técnica',             short: 'Anál. Técnica',  dot: 'bg-indigo-500'  },
  { key: 'data_recebimento_demanda'                as keyof FormalizacaoRow, label: 'Atrib. Conferencista',        short: 'Atrib. Conf.',   dot: 'bg-violet-500'  },
  { key: 'data_liberacao_assinatura_conferencista' as keyof FormalizacaoRow, label: 'Conferência Concluída',       short: 'Conf. Concl.',   dot: 'bg-purple-500'  },
  { key: 'data_liberacao_assinatura'               as keyof FormalizacaoRow, label: 'Lib. para Assinatura',        short: 'Lib. Assin.',    dot: 'bg-orange-500'  },
  { key: 'assinatura'                              as keyof FormalizacaoRow, label: 'Assinado',                    short: 'Assinado',       dot: 'bg-amber-500'   },
  { key: 'publicacao'                              as keyof FormalizacaoRow, label: 'Publicado no DOE',             short: 'Publicado',      dot: 'bg-teal-500'    },
  { key: 'concluida_em'                            as keyof FormalizacaoRow, label: 'Concluído',                   short: 'Concluído',      dot: 'bg-emerald-500' },
] as const;

// Stages shown in the pending view (all except 'Concluído')
const ACTIVE_STAGES = TIMELINE_STAGES.slice(0, -1);

function parseDateTL(s?: string | null): Date | null {
  if (!s?.trim()) return null;
  const d = new Date(s.includes('T') ? s : `${s}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}
function daysSinceTL(s?: string | null): number {
  const d = parseDateTL(s);
  if (!d) return 0;
  return Math.max(0, Math.round((Date.now() - d.getTime()) / 86400000));
}

// ─── Timeline Section component ──────────────────────────────────────────────
function TimelineSection({
  filtered, personField, openDrilldown, viewMode,
}: {
  filtered: FormalizacaoRow[];
  personField: keyof FormalizacaoRow;
  openDrilldown: (title: string, rows: FormalizacaoRow[]) => void;
  viewMode: 'tecnico' | 'conferencista';
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Only include demands that are NOT yet concluded
  const pending = useMemo(
    () => filtered.filter(r => !(r.concluida_em ?? '').trim()),
    [filtered]
  );

  // Determine which ACTIVE_STAGES index is the current stage for a demand
  // = last ACTIVE stage that has a date filled
  const getCurrentStageIdx = (r: FormalizacaoRow): number => {
    for (let i = ACTIVE_STAGES.length - 1; i >= 0; i--) {
      if ((r[ACTIVE_STAGES[i].key] as string)?.trim()) return i;
    }
    return -1;
  };

  const grouped = useMemo(() => {
    const map = new Map<string, FormalizacaoRow[]>();
    for (const r of pending) {
      const p = String(r[personField] ?? '').trim() || '(não atribuído)';
      if (!map.has(p)) map.set(p, []);
      map.get(p)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [pending, personField]);

  if (pending.length === 0) return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
      <p className="text-emerald-700 font-bold text-sm">Todas as demandas estão concluídas!</p>
    </div>
  );

  return (
    <div>
      <h3 className="text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-[#1351B4]" />
        Linha do Tempo — Demandas em Andamento
        <span className="text-[10px] text-slate-400 font-normal">
          ({pending.length.toLocaleString('pt-BR')} pendentes · concluídas ocultadas · por {viewMode === 'tecnico' ? 'técnico' : 'conferencista'})
        </span>
      </h3>
      <p className="text-[11px] text-slate-400 mb-3">
        Mostra em qual etapa do processo cada demanda está. Clique no nome para ver o detalhe de cada uma.
      </p>

      {/* Stage legend — numbered for easy reference */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {ACTIVE_STAGES.map((s, i) => (
          <div key={String(s.key)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-white ${s.dot}`}>
            <span className="opacity-60 text-[9px] font-black">{i + 1}</span>
            {s.short}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {grouped.map(([person, rows]) => {
          const isOpen = expanded.has(person);

          // Count how many demands are at each stage
          const stageCounts = ACTIVE_STAGES.map((s, i) => ({
            ...s, idx: i,
            count: rows.filter(r => getCurrentStageIdx(r) === i).length,
          })).filter(sc => sc.count > 0);

          const maxDays = Math.max(0, ...rows.map(r => daysSinceTL(r.data_liberacao)));

          return (
            <div key={person} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* ── Accordion header ─────────────────────────────── */}
              <button
                onClick={() => { const n = new Set(expanded); n.has(person) ? n.delete(person) : n.add(person); setExpanded(n); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
              >
                {isOpen
                  ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-sm font-bold text-slate-800">{person}</span>
                    <span className="text-xs text-slate-400">{rows.length} demanda{rows.length !== 1 ? 's' : ''} pendente{rows.length !== 1 ? 's' : ''}</span>
                    {maxDays > 90 && (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                        ⚠ mais antiga aguarda há {maxDays} dias
                      </span>
                    )}
                  </div>
                  {/* Stage chips — "quantas estão em cada etapa" */}
                  <div className="flex flex-wrap gap-1.5">
                    {stageCounts.map(sc => (
                      <div key={String(sc.key)} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold text-white ${sc.dot}`}>
                        <span>{sc.count}</span>
                        <span className="opacity-90">em {sc.short}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </button>

              {/* ── Expanded detail ───────────────────────────────── */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-slate-100 overflow-x-auto">
                      {/* Column header */}
                      <div className="flex gap-3 px-4 py-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wide min-w-max border-b border-slate-100">
                        <span className="w-36 flex-shrink-0">Nº / Nome da Demanda</span>
                        <span className="w-52 flex-shrink-0">Etapa Atual (há quantos dias)</span>
                        <span className="w-36 flex-shrink-0">Progresso no Processo</span>
                        <span className="w-24 flex-shrink-0 text-right">Aguardando há</span>
                      </div>

                      {[...rows]
                        .sort((a, b) => daysSinceTL(b.data_liberacao) - daysSinceTL(a.data_liberacao))
                        .slice(0, 50)
                        .map((r, idx) => {
                          const si = getCurrentStageIdx(r);
                          const stage = si >= 0 ? ACTIVE_STAGES[si] : null;
                          const daysAtStage = stage ? daysSinceTL(r[stage.key] as string) : 0;
                          const daysTotal = daysSinceTL(r.data_liberacao);
                          // Progress: fraction of stages completed
                          const pct = si >= 0 ? Math.round(((si + 1) / ACTIVE_STAGES.length) * 100) : 0;
                          const demandaLabel = String(r.demandas_formalizacao ?? r.demanda ?? `#${r.id}`);

                          return (
                            <div
                              key={r.id ?? idx}
                              className={`flex gap-3 items-center px-4 py-2.5 border-b border-slate-50 last:border-0 min-w-max ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                            >
                              {/* Demand name */}
                              <button
                                onClick={() => openDrilldown(`${demandaLabel} — ${person}`, [r])}
                                className="w-36 flex-shrink-0 text-[12px] font-semibold text-slate-700 hover:text-[#1351B4] text-left truncate transition-colors"
                                title={demandaLabel}
                              >
                                {demandaLabel}
                              </button>

                              {/* Current stage as a clear badge */}
                              <div className="w-52 flex-shrink-0">
                                {stage ? (
                                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-[11px] font-bold leading-none ${stage.dot}`}>
                                    <span className="opacity-60 text-[9px] font-black">{si + 1}.</span>
                                    <span>{stage.label}</span>
                                    {daysAtStage > 0 && (
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${daysAtStage > 30 ? 'bg-black/30' : 'bg-black/15'}`}>
                                        {daysAtStage}d
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">sem etapa registrada</span>
                                )}
                              </div>

                              {/* Progress bar + fraction */}
                              <div className="w-36 flex-shrink-0 flex items-center gap-2">
                                <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      pct >= 85 ? 'bg-emerald-500'
                                      : pct >= 55 ? 'bg-blue-500'
                                      : pct >= 30 ? 'bg-amber-500'
                                      : 'bg-slate-400'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-slate-500 flex-shrink-0 whitespace-nowrap">
                                  etapa {si >= 0 ? si + 1 : '?'} de {ACTIVE_STAGES.length}
                                </span>
                              </div>

                              {/* Total waiting time */}
                              <div className="w-24 flex-shrink-0 text-right">
                                <span className={`text-[12px] font-bold ${
                                  daysTotal > 90 ? 'text-red-600'
                                  : daysTotal > 30 ? 'text-amber-600'
                                  : 'text-slate-500'
                                }`}>
                                  {daysTotal > 0 ? `${daysTotal} dias` : '—'}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      }

                      {rows.length > 50 && (
                        <button
                          onClick={() => openDrilldown(`${person} — Todas as pendências (${rows.length})`, rows)}
                          className="w-full py-2.5 text-xs font-bold text-[#1351B4] hover:bg-blue-50 transition-colors border-t border-slate-100"
                        >
                          + Ver todas as {rows.length} demandas →
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Collapsible Section ─────────────────────────────────────────────────────
function CollapsibleSection({ title, icon: Icon, count, headerBg = 'bg-slate-800', collapsed, onToggle, children }: {
  title: string; icon?: React.ElementType; count?: number;
  headerBg?: string; collapsed: boolean; onToggle: () => void; children?: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-4 py-3 ${headerBg} text-white ${collapsed ? 'rounded-xl' : 'rounded-t-xl'} transition-all`}
      >
        <span className="flex items-center gap-2 text-sm font-bold">
          {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
          {title}
          {count !== undefined && <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">{count}</span>}
        </span>
        {collapsed ? <ChevronRight className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden rounded-b-xl border border-t-0 border-slate-200 shadow-sm bg-white">
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const MESES_PT_PROD = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const fmtMesProd = (m: string) => { const p = m.split('-'); return p.length >= 2 ? `${MESES_PT_PROD[parseInt(p[1]) - 1]}/${p[0].substring(2)}` : m; };

/** Parses DD/MM/YYYY or YYYY-MM-DD (or ISO) safely, returns null on failure. */
function parseDateProd(str: string): Date | null {
  if (!str) return null;
  const t = str.trim();
  if (!t) return null;
  if (t.includes('/')) {
    const p = t.split('/');
    if (p.length >= 3) {
      const d = new Date(+p[2], +p[1] - 1, +p[0]);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }
  const d = new Date(t.includes('T') ? t : `${t}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

function toMes(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

type PessoaProd = {
  nome: string;
  rows: { mes: string; lib: number; pub: number; conc: number; naoConcl: number; dilig: number; mediaDias: number | null }[];
  totLib: number; totPub: number; totConc: number; totNaoConcl: number; totDilig: number; taxa: number; medG: number | null;
};

function perfScore(taxa: number, medG: number | null) {
  if (taxa >= 80 && (medG === null || medG <= 30)) return { label: 'A', ring: 'ring-2 ring-emerald-400', bg: 'bg-emerald-500', text: 'Excelente' };
  if (taxa >= 60 && (medG === null || medG <= 60)) return { label: 'B', ring: 'ring-2 ring-blue-400',    bg: 'bg-blue-500',    text: 'Bom' };
  if (taxa >= 40 && (medG === null || medG <= 90)) return { label: 'C', ring: 'ring-2 ring-amber-400',   bg: 'bg-amber-500',   text: 'Regular' };
  return                                                 { label: 'D', ring: 'ring-2 ring-red-400',     bg: 'bg-red-500',     text: 'Crítico' };
}

// ─── Professional Productivity Analysis Component ────────────────────────────
function ProdutividadeAnalise({ pessoas, label, allMeses, filtered, dateField, openDrilldown }: {
  pessoas: PessoaProd[];
  label: string;
  allMeses: string[];
  filtered: FormalizacaoRow[];
  dateField: keyof FormalizacaoRow;
  openDrilldown: (title: string, rows: FormalizacaoRow[]) => void;
}) {
  const [anoSel, setAnoSel]   = useState<string>('all');
  const [mesSel, setMesSel]   = useState<string>('all'); // 'all' | '01'..'12'
  const [sortBy, setSortBy]   = useState<'lib' | 'taxa' | 'dias'>('lib');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Distinct years and months derived from allMeses
  const anosDisp = useMemo(() => [...new Set(allMeses.map(m => m.split('-')[0]))].sort().reverse(), [allMeses]);
  const mesesDisp = useMemo(() => {
    const base = anoSel === 'all' ? allMeses : allMeses.filter(m => m.startsWith(anoSel));
    return [...new Set(base.map(m => m.split('-')[1]))].sort();
  }, [allMeses, anoSel]);

  // Reset month when year changes to avoid invalid combinations
  const handleAnoChange = (ano: string) => { setAnoSel(ano); setMesSel('all'); };

  // When switching month, recompute per-person aggregates for that month only
  const pessoasFiltradas: PessoaProd[] = useMemo(() => {
    const matchesMes = (mes: string) => {
      const [y, m] = mes.split('-');
      if (anoSel !== 'all' && y !== anoSel) return false;
      if (mesSel !== 'all' && m !== mesSel) return false;
      return true;
    };
    const isFiltered = anoSel !== 'all' || mesSel !== 'all';
    if (!isFiltered) return pessoas;
    return pessoas.flatMap(p => {
      const rows = p.rows.filter(r => matchesMes(r.mes));
      if (rows.length === 0) return [];
      const totLib  = rows.reduce((s, r) => s + r.lib, 0);
      const totPub  = rows.reduce((s, r) => s + r.pub, 0);
      const totConc = rows.reduce((s, r) => s + r.conc, 0);
      const totNaoConcl = rows.reduce((s, r) => s + r.naoConcl, 0);
      const totDilig = rows.reduce((s, r) => s + r.dilig, 0);
      const dr = rows.filter(r => r.mediaDias !== null);
      const medG = dr.length > 0 ? Math.round(dr.reduce((s, r) => s + r.mediaDias!, 0) / dr.length) : null;
      return [{ ...p, rows, totLib, totPub, totConc, totNaoConcl, totDilig, taxa: totLib > 0 ? Math.round((totPub / totLib) * 100) : 0, medG }];
    });
  }, [pessoas, anoSel, mesSel]);

  const sorted = useMemo(() => {
    const arr = [...pessoasFiltradas];
    if (sortBy === 'lib')  arr.sort((a, b) => b.totLib - a.totLib);
    if (sortBy === 'taxa') arr.sort((a, b) => b.taxa - a.taxa);
    if (sortBy === 'dias') arr.sort((a, b) => (a.medG ?? 9999) - (b.medG ?? 9999));
    return arr;
  }, [pessoasFiltradas, sortBy]);

  const kpis = useMemo(() => {
    const totLib  = sorted.reduce((s, p) => s + p.totLib, 0);
    const totPub  = sorted.reduce((s, p) => s + p.totPub, 0);
    const totConc = sorted.reduce((s, p) => s + p.totConc, 0);
    const totNaoConcl = sorted.reduce((s, p) => s + p.totNaoConcl, 0);
    const totDilig = sorted.reduce((s, p) => s + p.totDilig, 0);
    const comDias = sorted.filter(p => p.medG !== null);
    const medG    = comDias.length > 0 ? Math.round(comDias.reduce((s, p) => s + p.medG!, 0) / comDias.length) : null;
    const taxa    = totLib > 0 ? Math.round((totPub / totLib) * 100) : 0;
    const scores  = sorted.map(p => perfScore(p.taxa, p.medG).label);
    const scoreCount = { A: scores.filter(s => s === 'A').length, B: scores.filter(s => s === 'B').length, C: scores.filter(s => s === 'C').length, D: scores.filter(s => s === 'D').length };
    return { totLib, totPub, totConc, totNaoConcl, totDilig, medG, taxa, scoreCount };
  }, [sorted]);

  const maxLib = Math.max(1, ...sorted.map(p => p.totLib));

  const toggleExpand = (nome: string) =>
    setExpanded(s => { const ns = new Set(s); if (ns.has(nome)) ns.delete(nome); else ns.add(nome); return ns; });

  // Returns raw rows for a given person, optionally filtered to a specific month
  const getRows = (nome: string, mes?: string): FormalizacaoRow[] => {
    const personKey = dateField === 'data_liberacao' ? 'tecnico' : 'conferencista';
    return filtered.filter(r => {
      if (String(r[personKey] ?? '').trim() !== nome) return false;
      if (!mes) return true;
      const d = parseDateProd((r[dateField] as string) ?? ''); if (!d) return false;
      return toMes(d) === mes;
    });
  };

  if (pessoas.length === 0)
    return <p className="text-slate-400 text-center py-10 text-sm">Sem dados de liberação para o período. Verifique se <code className="bg-slate-100 px-1 rounded">data_liberacao</code> está preenchido.</p>;

  const exportXLSX = () => {
    // Sheet 1: Resumo por pessoa
    const resumoHeader = ['Posição', label, 'Lib.', 'Pub.', 'Conc.', 'Pend.', 'Dilig.', 'Taxa %'];
    const resumoRows = sorted.map((p, i) => [
      i + 1, p.nome, p.totLib, p.totPub, p.totConc, p.totNaoConcl, p.totDilig, p.taxa,
    ]);
    const wsResumo = XLSX.utils.aoa_to_sheet([resumoHeader, ...resumoRows]);
    wsResumo['!cols'] = [{ wch: 6 }, { wch: 32 }, ...Array(6).fill({ wch: 10 })];

    // Sheet 2: Mês a mês
    const mesHeader = [label, 'Mês', 'Lib.', 'Pub.', 'Conc.', 'Pend.', 'Dilig.', 'Taxa %'];
    const mesRows: (string | number)[][] = [];
    sorted.forEach(p => {
      p.rows.forEach(r => {
        mesRows.push([p.nome, fmtMesProd(r.mes), r.lib, r.pub, r.conc, r.naoConcl, r.dilig,
          r.lib > 0 ? Math.round((r.pub / r.lib) * 100) : 0]);
      });
    });
    const wsMes = XLSX.utils.aoa_to_sheet([mesHeader, ...mesRows]);
    wsMes['!cols'] = [{ wch: 32 }, { wch: 12 }, ...Array(6).fill({ wch: 10 })];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
    XLSX.utils.book_append_sheet(wb, wsMes, 'Mês a Mês');
    const periodoLabel = [
      mesSel !== 'all' ? MESES_PT_PROD[parseInt(mesSel) - 1] : '',
      anoSel !== 'all' ? anoSel : '',
    ].filter(Boolean).join('-') || 'todos';
    XLSX.writeFile(wb, `produtividade_${label.toLowerCase()}_${periodoLabel}.xlsx`);
  };

  return (
    <div className="space-y-4">

      {/* ── Toolbar ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        <Calendar className="w-4 h-4 text-teal-600 flex-shrink-0" />
        {/* Year selector */}
        <select
          value={anoSel}
          onChange={e => handleAnoChange(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none cursor-pointer"
        >
          <option value="all">Todos os anos</option>
          {anosDisp.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {/* Month selector */}
        <select
          value={mesSel}
          onChange={e => setMesSel(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none cursor-pointer"
        >
          <option value="all">Todos os meses</option>
          {mesesDisp.map(m => (
            <option key={m} value={m}>
              {MESES_PT_PROD[parseInt(m) - 1]}
            </option>
          ))}
        </select>
        <div className="h-5 w-px bg-slate-200 hidden sm:block" />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 font-semibold mr-1">Ordenar:</span>
          {([['lib', 'Volume'], ['taxa', 'Taxa %'], ['dias', 'Velocidade']] as const).map(([k, lbl]) => (
            <button key={k} onClick={() => setSortBy(k)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${sortBy === k ? 'bg-teal-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-teal-50 hover:border-teal-300'}`}>
              {lbl}
            </button>
          ))}
        </div>
        {(anoSel !== 'all' || mesSel !== 'all') && (
          <span className="ml-auto text-xs bg-teal-100 text-teal-800 px-3 py-1 rounded-full font-bold border border-teal-200">
            {mesSel !== 'all' ? `${MESES_PT_PROD[parseInt(mesSel) - 1]}` : ''}{mesSel !== 'all' && anoSel !== 'all' ? '/' : ''}{anoSel !== 'all' ? anoSel.substring(2) : ''}
          </span>
        )}
        <button
          onClick={exportXLSX}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-all flex-shrink-0"
          title="Exportar produtividade como XLSX">
          <Download className="w-3.5 h-3.5" /> XLSX
        </button>
      </div>

      {/* ── KPI Summary Strip ────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {[
          { lbl: 'Liberadas',  val: kpis.totLib,  cls: 'bg-blue-50 text-blue-700 border-blue-200' },
          { lbl: 'Publicadas', val: kpis.totPub,  cls: 'bg-violet-50 text-violet-700 border-violet-200' },
          { lbl: 'Concluídas', val: kpis.totConc, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { lbl: 'Pendentes',  val: kpis.totNaoConcl, cls: kpis.totNaoConcl === 0 ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-orange-50 text-orange-700 border-orange-200' },
          { lbl: 'Diligência', val: kpis.totDilig, cls: kpis.totDilig === 0 ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-amber-50 text-amber-700 border-amber-200' },
          { lbl: 'Taxa Geral', val: `${kpis.taxa}%`, cls: kpis.taxa >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : kpis.taxa >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200' },
          { lbl: 'Média Dias', val: kpis.medG !== null ? `${kpis.medG}d` : '—', cls: kpis.medG === null ? 'bg-slate-50 text-slate-400 border-slate-200' : kpis.medG <= 30 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : kpis.medG <= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200' },
          { lbl: label,        val: `${sorted.length}`,  cls: 'bg-slate-50 text-slate-700 border-slate-200' },
        ].map(k => (
          <div key={k.lbl} className={`border rounded-xl px-3 py-2.5 flex flex-col items-center ${k.cls}`}>
            <span className="text-xl font-extrabold leading-tight">{k.val}</span>
            <span className="text-[11px] font-medium text-current opacity-70 mt-0.5 text-center">{k.lbl}</span>
          </div>
        ))}
      </div>

      {/* ── Person Cards ─────────────────────────────────────── */}
      <div className="space-y-2">
        {sorted.map((p, pi) => {
          const score    = perfScore(p.taxa, p.medG);
          const isOpen   = expanded.has(p.nome);
          const barW     = Math.round((p.totLib / maxLib) * 100);
          const pubBarW  = p.totLib > 0 ? Math.round((p.totPub / p.totLib) * 100) : 0;

          return (
            <div key={p.nome} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">

              {/* Card header — left side toggles expand, right side opens drilldown */}
              <div className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70 transition-colors">

                {/* Rank */}
                <span className="text-[11px] font-bold text-slate-400 w-5 text-center flex-shrink-0">#{pi + 1}</span>

                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-teal-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 uppercase">
                  {p.nome.charAt(0)}
                </div>

                {/* Name + bars */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(p.nome)}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <button
                      onClick={e => { e.stopPropagation(); const rows = getRows(p.nome); openDrilldown(`${p.nome} — todas as demandas (${rows.length})`, rows); }}
                      className="text-sm font-bold text-slate-800 truncate hover:text-teal-700 hover:underline text-left transition-colors"
                    >{p.nome}</button>
                    <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">{p.totLib} lib.</span>
                      <span className="text-xs font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-md">{p.totPub} pub.</span>
                      {p.totConc > 0 && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">{p.totConc} conc.</span>}
                      {p.totNaoConcl > 0 && <span className="text-xs font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md">{p.totNaoConcl} pend.</span>}
                      {p.totDilig > 0 && <span className="text-xs font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">{p.totDilig} dilig.</span>}
                      {p.medG !== null && (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${p.medG <= 30 ? 'bg-emerald-100 text-emerald-700' : p.medG <= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          ⌀ {p.medG}d
                        </span>
                      )}
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${p.taxa >= 70 ? 'bg-emerald-100 text-emerald-700' : p.taxa >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {p.taxa}%
                      </span>
                    </div>
                  </div>
                  {/* Volume bar (relative to max) */}
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden" title={`${p.totLib} liberadas`}>
                    <motion.div style={{ width: `${barW}%` }} initial={{ width: 0 }} animate={{ width: `${barW}%` }} transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600" />
                  </div>
                  {/* Publication rate bar */}
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-0.5" title={`${p.taxa}% publicadas`}>
                    <motion.div style={{ width: `${pubBarW}%` }} initial={{ width: 0 }} animate={{ width: `${pubBarW}%` }} transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
                      className={`h-full rounded-full ${p.taxa >= 70 ? 'bg-emerald-400' : p.taxa >= 40 ? 'bg-amber-400' : 'bg-red-400'}`} />
                  </div>
                </div>

                {/* Expand chevron */}
                <button onClick={() => toggleExpand(p.nome)} className="flex-shrink-0 ml-1 p-1 rounded hover:bg-slate-200 transition-colors">
                  {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>
              </div>

              {/* Month-by-month detail table */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                    <div className="overflow-x-auto border-t border-slate-100">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-teal-800 text-white">
                            <th className="text-left px-3 py-2 font-bold whitespace-nowrap">Mês</th>
                            <th className="text-center px-3 py-2 font-bold">Lib.</th>
                            <th className="text-center px-3 py-2 font-bold">Pub.</th>
                            <th className="text-center px-3 py-2 font-bold">Conc.</th>
                            <th className="text-center px-3 py-2 font-bold whitespace-nowrap">Pend.</th>
                            <th className="text-center px-3 py-2 font-bold whitespace-nowrap">Dilig.</th>
                            <th className="text-center px-3 py-2 font-bold">Taxa</th>
                            <th className="px-3 py-2 font-bold whitespace-nowrap w-28">Progresso</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.rows.map((r, ri) => {
                            const t = r.lib > 0 ? Math.round((r.pub / r.lib) * 100) : 0;
                            const mesRows = getRows(p.nome, r.mes);
                            return (
                              <tr key={ri} className={`border-b border-slate-100 ${ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                <td className="px-3 py-1.5 font-semibold text-slate-700 whitespace-nowrap">
                                  <button
                                    onClick={() => openDrilldown(`${p.nome} — ${fmtMesProd(r.mes)} (${mesRows.length})`, mesRows)}
                                    className="hover:text-teal-700 hover:underline transition-colors text-left"
                                  >{fmtMesProd(r.mes)}</button>
                                </td>
                                <td className="px-3 py-1.5 text-center">
                                  <span className="inline-flex items-center justify-center w-7 bg-blue-100 text-blue-700 rounded font-bold">{r.lib}</span>
                                </td>
                                <td className="px-3 py-1.5 text-center">
                                  {r.pub > 0
                                    ? <span className="inline-flex items-center justify-center w-7 bg-violet-100 text-violet-700 rounded font-bold">{r.pub}</span>
                                    : <span className="text-slate-300">—</span>}
                                </td>
                                <td className="px-3 py-1.5 text-center">
                                  {r.conc > 0
                                    ? <span className="inline-flex items-center justify-center w-7 bg-emerald-100 text-emerald-700 rounded font-bold">{r.conc}</span>
                                    : <span className="text-slate-300">—</span>}
                                </td>
                                <td className="px-3 py-1.5 text-center">
                                  {r.naoConcl > 0
                                    ? <button onClick={() => { const rws = getRows(p.nome, r.mes).filter(x => !(x.concluida_em ?? '').trim()); openDrilldown(`${p.nome} — Pend. ${fmtMesProd(r.mes)} (${rws.length})`, rws); }} className="inline-flex items-center justify-center w-7 bg-orange-100 text-orange-700 rounded font-bold hover:bg-orange-200 transition-colors">{r.naoConcl}</button>
                                    : <span className="text-slate-300">—</span>}
                                </td>
                                <td className="px-3 py-1.5 text-center">
                                  {r.dilig > 0
                                    ? <button onClick={() => { const rws = getRows(p.nome, r.mes).filter(x => (x.area_estagio_situacao_demanda ?? '').trim().toUpperCase().startsWith('DEMANDA EM DILIGÊNCIA')); openDrilldown(`${p.nome} — Dilig. ${fmtMesProd(r.mes)} (${rws.length})`, rws); }} className="inline-flex items-center justify-center w-7 bg-amber-100 text-amber-700 rounded font-bold hover:bg-amber-200 transition-colors border border-amber-300">{r.dilig}</button>
                                    : <span className="text-slate-300">—</span>}
                                </td>
                                <td className="px-3 py-1.5 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded font-bold ${t >= 70 ? 'bg-emerald-100 text-emerald-700' : t >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{t}%</span>
                                </td>
                                <td className="px-3 py-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                      <div style={{ width: `${t}%` }} className={`h-full rounded-full transition-all ${t >= 70 ? 'bg-emerald-500' : t >= 40 ? 'bg-amber-400' : 'bg-red-400'}`} />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-teal-800 text-white font-bold text-xs">
                            <td className="px-3 py-2 whitespace-nowrap">Total / Média</td>
                            <td className="px-3 py-2 text-center">{p.totLib}</td>
                            <td className="px-3 py-2 text-center">{p.totPub}</td>
                            <td className="px-3 py-2 text-center">{p.totConc}</td>
                            <td className="px-3 py-2 text-center">{p.totNaoConcl > 0 ? p.totNaoConcl : '—'}</td>
                            <td className="px-3 py-2 text-center">{p.totDilig > 0 ? p.totDilig : '—'}</td>
                            <td className="px-3 py-2 text-center">{p.taxa}%</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                <div className="flex-1 h-2 bg-teal-600/50 rounded-full overflow-hidden">
                                  <div style={{ width: `${p.taxa}%` }} className="h-full bg-white/80 rounded-full" />
                                </div>
                              </div>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">
            Nenhum dado para {anoSel !== 'all' || mesSel !== 'all'
              ? [mesSel !== 'all' ? MESES_PT_PROD[parseInt(mesSel) - 1] : '', anoSel !== 'all' ? anoSel : ''].filter(Boolean).join('/')
              : 'o período selecionado'}.
          </p>
        )}
      </div>

      {/* ── Legend ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3 text-xs text-slate-400 pt-3 border-t border-slate-100">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> barra azul = volume de liberações</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> barra colorida = % publicadas</span>
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export function DashboardTecnico({ initialData }: { initialData?: FormalizacaoRow[] } = {}) {
  const { token } = useAuth();

  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState<FormalizacaoRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // View mode: 'tecnico' | 'conferencista'
  const [viewMode, setViewMode] = useState<'tecnico' | 'conferencista'>('tecnico');

  // Compact mode
  const [compact, setCompact] = useState(false);
  // Section collapse states (true = collapsed)
  const [sec, setSec] = useState({ matrix: true, criticas: true, topEstagio: true, atrasadas: true, timeline: true, produtividade: true });
  const toggleSec = (k: keyof typeof sec) => setSec(p => ({ ...p, [k]: !p[k] }));
  // Filter panel collapsed
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Drilldown state
  const [drilldown, setDrilldown] = useState<{ title: string; rows: FormalizacaoRow[] } | null>(null);

  // Matrix horizontal scroll ref
  const matrixScrollRef = useRef<HTMLDivElement>(null);
  const [isMatrixDragging, setIsMatrixDragging] = useState(false);
  const matrixDragRef = useRef({ isDown: false, startX: 0, scrollLeft: 0, hasMoved: false });

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
  // Quick-filter: '' = todos | 'fundo_a_fundo' = somente Fundo a Fundo
  const [filtroTipoRapido, setFiltroTipoRapido] = useState<'' | 'fundo_a_fundo'>('');
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
      const PARALLEL = 6;
      // Parallel batch fetching for speed
      while (true) {
        const offsets = Array.from({ length: PARALLEL }, (_, i) => offset + i * batchSize);
        const results = await Promise.all(
          offsets.map(o =>
            fetch(`/api/formalizacao?limit=${batchSize}&offset=${o}`,
              { headers: { Authorization: `Bearer ${authToken}` } })
              .then(r => r.ok ? r.json() : [])
              .then(r => Array.isArray(r) ? r : (r.data ?? []))
              .catch(() => [])
          )
        );
        let done = false;
        for (const batch of results) {
          all = all.concat(batch);
          if (batch.length < batchSize) { done = true; break; }
        }
        if (done) break;
        offset += PARALLEL * batchSize;
      }
      setRawData(all);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Use initialData from parent cache if available
  useEffect(() => {
    if (initialData && initialData.length > 0 && rawData.length === 0) {
      setRawData(initialData as FormalizacaoRow[]);
      setLastUpdated(new Date());
    } else if (!initialData || initialData.length === 0) {
      loadData();
    }
  }, [initialData, loadData]);

  const handleMatrixMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = matrixScrollRef.current;
    if (!el) return;
    matrixDragRef.current = { isDown: true, startX: e.pageX, scrollLeft: el.scrollLeft, hasMoved: false };
    setIsMatrixDragging(true);
  };
  const handleMatrixMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!matrixDragRef.current.isDown) return;
    const el = matrixScrollRef.current;
    if (!el) return;
    const walk = e.pageX - matrixDragRef.current.startX;
    if (Math.abs(walk) > 3) {
      matrixDragRef.current.hasMoved = true;
      el.scrollLeft = matrixDragRef.current.scrollLeft - walk;
    }
  };
  const handleMatrixMouseUp = () => {
    matrixDragRef.current.isDown = false;
    setIsMatrixDragging(false);
  };
  const handleMatrixMouseLeave = () => {
    matrixDragRef.current.isDown = false;
    setIsMatrixDragging(false);
  };

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
    // Quick filter: Fundo a Fundo — filtra pelo campo Área/Estágio da Situação da Demanda
    if (filtroTipoRapido === 'fundo_a_fundo')
      data = data.filter(r => (r.area_estagio_situacao_demanda ?? '').toUpperCase().includes('FUNDO A FUNDO'));
    return data;
  }, [rawData, filtroAno, filtroRegional, filtroTecnico, filtroConferencista, filtroParlamentar, filtroTipo, filtroSituacao, filtroDataDe, filtroDataAte, filtroDataCampo, filtroTipoRapido]);

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
  const totalConcluidas = useMemo(() => matrixData.totalCols.concluida, [matrixData]);
  const pctConcluidas = filtered.length > 0 ? Math.round((totalConcluidas / filtered.length) * 100) : 0;
  const totalEmAndamento = matrixData.totalCols.total_ggcon;

  const hasActiveFilters = filtroAno.length || filtroRegional.length || filtroTecnico.length ||
    filtroConferencista.length || filtroParlamentar.length || filtroTipo.length ||
    filtroSituacao.length || filtroDataDe || filtroDataAte || filtroTipoRapido;

  // Produtividade mês a mês (data_liberacao → publicacao) por técnico e conferencista
  const produtividadeData = useMemo(() => {
    type MR = { lib: number; pub: number; conc: number; dilig: number; td: number; cd: number };

    // Compute ALL months from ALL filtered records (any date field), so the
    // month selector shows every month that exists in the system.
    const allMesesGlobal = new Set<string>();
    const DATE_FIELDS: (keyof FormalizacaoRow)[] = [
      'data_liberacao', 'data_recebimento_demanda', 'data_analise_demanda',
      'publicacao', 'concluida_em', 'data_retorno', 'encaminhado_em',
    ];
    filtered.forEach(r => {
      for (const f of DATE_FIELDS) {
        const d = parseDateProd((r[f] as string) ?? '');
        if (d) { allMesesGlobal.add(toMes(d)); break; }
      }
      if (r.ano) {
        const yr = String(r.ano).trim();
        if (/^\d{4}$/.test(yr)) allMesesGlobal.add(`${yr}-01`);
      }
    });
    const allMeses = [...allMesesGlobal].sort();

    // personField = 'tecnico' | 'conferencista'
    // dateField   = the "start" date for that role:
    //   técnico       → data_liberacao
    //   conferencista → data_recebimento_demanda
    const buildMap = (personField: keyof FormalizacaoRow, dateField: keyof FormalizacaoRow) => {
      const personMap = new Map<string, Map<string, MR>>();
      filtered.forEach(r => {
        const person = String(r[personField] ?? '').trim(); if (!person) return;
        const d = parseDateProd((r[dateField] as string) ?? ''); if (!d) return;
        const mes = toMes(d);
        if (!personMap.has(person)) personMap.set(person, new Map());
        const mm = personMap.get(person)!;
        if (!mm.has(mes)) mm.set(mes, { lib: 0, pub: 0, conc: 0, dilig: 0, td: 0, cd: 0 });
        const row = mm.get(mes)!;
        row.lib++;
        // diligência
        const estagioUp = (r.area_estagio_situacao_demanda ?? '').trim().toUpperCase();
        if (estagioUp.startsWith('DEMANDA EM DILIGÊNCIA')) row.dilig++;
        const dp = parseDateProd((r.publicacao as string) ?? '');
        if (dp) {
          row.pub++;
          const dias = Math.round((dp.getTime() - d.getTime()) / 86400000);
          if (dias >= 0 && dias <= 730) { row.td += dias; row.cd++; }
        }
        if ((r.concluida_em ?? '').trim()) row.conc++;
      });
      const meses = [...new Set([
        ...allMeses,
        ...Array.from(personMap.values()).flatMap(mm => [...mm.keys()])
      ])].sort();
      return Array.from(personMap.keys()).sort().map(nome => {
        const mm = personMap.get(nome)!;
        const rows = meses.map(mes => {
          const d2 = mm.get(mes) ?? { lib: 0, pub: 0, conc: 0, td: 0, cd: 0 };
          return { mes, lib: d2.lib, pub: d2.pub, conc: d2.conc, naoConcl: d2.lib - d2.conc, dilig: d2.dilig, mediaDias: d2.cd > 0 ? Math.round(d2.td / d2.cd) : null };
        }).filter(rr => rr.lib > 0);
        const totLib = rows.reduce((s, rr) => s + rr.lib, 0);
        const totPub = rows.reduce((s, rr) => s + rr.pub, 0);
        const totConc = rows.reduce((s, rr) => s + rr.conc, 0);
        const totNaoConcl = rows.reduce((s, rr) => s + rr.naoConcl, 0);
        const totDilig = rows.reduce((s, rr) => s + rr.dilig, 0);
        const dr = rows.filter(rr => rr.mediaDias !== null);
        const medG = dr.length > 0 ? Math.round(dr.reduce((s, rr) => s + rr.mediaDias!, 0) / dr.length) : null;
        return { nome, rows, totLib, totPub, totConc, totNaoConcl, totDilig, taxa: totLib > 0 ? Math.round((totPub / totLib) * 100) : 0, medG };
      }).filter(p => p.totLib > 0);
    };
    return {
      tecnicos:       buildMap('tecnico',       'data_liberacao'),           // técnico: liberação
      conferencistas: buildMap('conferencista', 'data_recebimento_demanda'), // conferencista: recebimento
      allMeses,
    };
  }, [filtered]);

  const clearFilters = () => {
    setFiltroAno([]); setFiltroRegional([]); setFiltroTecnico([]); setFiltroConferencista([]);
    setFiltroParlamentar([]); setFiltroTipo([]); setFiltroSituacao([]);
    setFiltroDataDe(''); setFiltroDataAte('');
    setFiltroTipoRapido('');
  };

  // Export matrix XLSX
  const exportMatrix = () => {
    const colHeaders = ['Técnico/Conferencista', ...FIXED_COLS.map(c => `${c.line1}${c.line2 ? ' ' + c.line2 : ''}`)];
    const dataRows = matrixData.rows.map(r =>
      [r.person, ...FIXED_COLS.map(c => r.cols[c.key] || 0)]
    );
    const totalRow = ['TOTAL', ...FIXED_COLS.map(c => matrixData.totalCols[c.key] || 0)];
    const ws = XLSX.utils.aoa_to_sheet([colHeaders, ...dataRows, totalRow]);
    ws['!cols'] = [{ wch: 28 }, ...FIXED_COLS.map(() => ({ wch: 12 }))];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, viewMode === 'tecnico' ? 'Técnicos' : 'Conferencistas');
    XLSX.writeFile(wb, `demonstrativo_${viewMode}_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
          {/* Quick filter: Fundo a Fundo */}
          <button
            onClick={() => setFiltroTipoRapido(v => v === 'fundo_a_fundo' ? '' : 'fundo_a_fundo')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all flex items-center gap-1 ${
              filtroTipoRapido === 'fundo_a_fundo'
                ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                : 'bg-white text-teal-700 border-teal-400 hover:bg-teal-50'
            }`}
            title="Filtrar somente registros Fundo a Fundo">
            <DollarSign className="w-3 h-3" />
            Fundo a Fundo
            {filtroTipoRapido === 'fundo_a_fundo' && (
              <span className="ml-1 bg-white/25 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                {filtered.length.toLocaleString('pt-BR')}
              </span>
            )}
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <KpiCard label="Total de Demandas" value={filtered.length.toLocaleString('pt-BR')}
              sub={hasActiveFilters ? `de ${rawData.length.toLocaleString('pt-BR')} total` : undefined}
              color="bg-gradient-to-br from-[#1351B4] to-[#0C326F]" icon={BarChart3} />
            <KpiCard label="Concluídas" value={`${totalConcluidas.toLocaleString('pt-BR')} (${pctConcluidas}%)`}
              sub="com data de conclusão" color="bg-gradient-to-br from-violet-500 to-violet-700" icon={CheckCircle2} />
            <KpiCard label="Em Andamento (GGCON)" value={totalEmAndamento.toLocaleString('pt-BR')}
              sub="total no GGCON" color="bg-gradient-to-br from-orange-500 to-orange-700" icon={TrendingUp} />
          </div>

          {/* ── Matrix Table ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
            {/* Table header bar - click to collapse/expand */}
            <div className="flex items-center bg-slate-900">
              {/* Toggle area */}
              <button onClick={() => toggleSec('matrix')} className="flex-1 px-4 py-2.5 flex items-center justify-between hover:bg-slate-800 transition-colors text-left">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 flex-shrink-0" />
                  {viewMode === 'tecnico' ? 'Demonstrativo por Técnico' : 'Demonstrativo por Conferencista'}
                  <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">— clique num número para ver detalhes</span>
                </h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] text-slate-400">
                    {matrixData.rows.length} {viewMode === 'tecnico' ? 'técnico(s)' : 'conferencista(s)'}
                  </span>
                  {sec.matrix ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>
              {/* Ações separadas — XLSX e Atualizar isolados para evitar clique acidental */}
              <div className="flex items-center gap-1.5 px-3 py-2 border-l border-slate-700 flex-shrink-0">
                <button
                  onClick={exportMatrix}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 bg-emerald-900/50 border border-emerald-700 rounded-lg hover:bg-emerald-700 transition-all"
                  title="Exportar tabela como XLSX">
                  <Download className="w-3 h-3" /> XLSX
                </button>
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-blue-300 bg-blue-900/50 border border-blue-700 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                  title="Recarregar dados do servidor">
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Atualizar
                </button>
              </div>
            </div>

            {/* Table wrapper */}
            <AnimatePresence initial={false}>
            {!sec.matrix && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'clip' }}>
              {/* overflow:clip clips animation sem quebrar position:sticky do thead */}
              <div ref={matrixScrollRef}
                onMouseDown={handleMatrixMouseDown}
                onMouseMove={handleMatrixMouseMove}
                onMouseUp={handleMatrixMouseUp}
                onMouseLeave={handleMatrixMouseLeave}
                className={`overflow-x-auto overflow-y-auto select-none ${isMatrixDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                style={{ WebkitUserSelect: 'none', userSelect: 'none', maxHeight: '65vh' }}>
              <table className="border-collapse text-[13px] w-max min-w-full">
                <thead className="sticky top-0 z-20">
                  <tr>
                    <th className="sticky left-0 z-30 bg-slate-800 border-r border-slate-600 px-3 py-2 text-left text-white font-bold align-middle"
                      style={{ minWidth: 180, maxWidth: 220 }}>
                      <span className="text-sm">{viewMode === 'tecnico' ? 'Técnico' : 'Conferencista'}</span>
                    </th>
                    {FIXED_COLS.map(col => (
                      <th key={col.key}
                        className={`${col.bgHead} border-l border-slate-700 px-1.5 py-2 text-center align-middle`}
                        style={{ minWidth: 68 }}>
                        <span className="block text-[11px] font-bold text-white leading-snug whitespace-nowrap">{col.line1}</span>
                        {col.line2 && <span className="block text-[11px] font-bold text-white leading-snug whitespace-nowrap">{col.line2}</span>}
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
                            className="font-semibold text-slate-800 text-left hover:text-[#1351B4] transition-colors w-full truncate text-[13px]"
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
                          const isDiligencia = col.key === 'diligencia';
                          const badgeClass = isGgcon ? 'bg-blue-700 hover:bg-blue-800'
                            : isConcluida ? 'bg-emerald-600 hover:bg-emerald-700'
                            : isTransf ? 'bg-teal-600 hover:bg-teal-700'
                            : isEmenda ? 'bg-violet-600 hover:bg-violet-700'
                            : isDiligencia ? 'bg-amber-600 hover:bg-amber-700'
                            : isRecebidas ? 'bg-slate-600 hover:bg-slate-700'
                            : 'bg-red-600 hover:bg-red-700';
                          return (
                            <td key={col.key} className={`py-1 px-0.5 text-center border-l border-slate-100 ${isGgcon ? 'bg-blue-50/60' : isDiligencia ? 'bg-amber-50/50' : isConcluida || isTransf || isEmenda ? 'bg-emerald-50/30' : ''}`}>
                              {count > 0 ? (
                                <button
                                  onClick={() => openDrilldown(`${row.person} — ${colLabel} (${count})`, getColRows(col.key, row.rows))}
                                  className={`inline-flex items-center justify-center ${badgeClass} text-white font-bold rounded text-[13px] px-2 py-0.5 min-w-[30px] active:scale-95 transition-all shadow-sm`}>
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

                  {/* Totals row */}
                  <tr className="bg-slate-900 border-t-2 border-slate-600">
                    <td className="sticky left-0 z-20 bg-slate-900 px-3 py-1.5 text-white font-black text-[13px] border-r border-slate-600"
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
                        : col.key === 'diligencia' ? 'text-amber-300'
                        : col.key === 'demandas_recebidas' ? 'text-white'
                        : 'text-red-300';
                      return (
                        <td key={col.key} className={`py-1.5 px-0.5 text-center border-l border-slate-700 ${col.bgTotal}`}>
                          {t > 0 ? (
                            <button onClick={() => openDrilldown(`Total — ${colLabel} (${t})`, getColRows(col.key, filtered))}
                              className={`font-black ${textClass} hover:underline text-[13px] transition-colors`}>
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
            </motion.div>
            )}
            </AnimatePresence>
          </div>

          {/* ── Demonstrativo de Situações Críticas ──────────────────── */}
          <CollapsibleSection title="Situações Críticas" icon={AlertCircle} headerBg="bg-red-700 hover:bg-red-800" collapsed={sec.criticas} onToggle={() => toggleSec('criticas')}>
          {(() => {
            const isMatch = (r: FormalizacaoRow, keyword: string) => {
              const u = keyword.toUpperCase();
              return [r.situacao_analise_demanda, r.situacao_demandas_sempapel, r.area_estagio_situacao_demanda]
                .some(v => (v ?? '').toUpperCase().includes(u));
            };
            const grupos = [
              { label: 'Canceladas',  keyword: 'CANCELAD', sty: getSituacaoStyle('CANCELADA') },
              { label: 'Impedidas',   keyword: 'IMPEDID',  sty: getSituacaoStyle('IMPEDIDA')  },
              { label: 'Excluídas',   keyword: 'EXCLUÍD',  sty: getSituacaoStyle('EXCLUÍDA')  },
            ].map(g => ({ ...g, rows: filtered.filter(r => isMatch(r, g.keyword)) }))
             .filter(g => g.rows.length > 0);
            if (grupos.length === 0) return null;
            return (
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Demonstrativo de Situações Críticas
                  <span className="text-[10px] text-slate-400 font-normal">(Canceladas · Impedidas · Excluídas)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {grupos.map(g => {
                    const count = g.rows.length;
                    const pct = filtered.length > 0 ? Math.round((count / filtered.length) * 100) : 0;
                    return (
                      <motion.button
                        key={g.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => openDrilldown(`${g.label} (${count})`, g.rows)}
                        className={`bg-white rounded-xl border ${g.sty.border} shadow-sm p-4 text-left hover:shadow-md transition-all group`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-slate-700">{g.label}</span>
                          <span className={`text-base font-black px-2 py-0.5 rounded text-white ${g.sty.badge}`}>
                            {count.toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={`h-full bg-gradient-to-r ${g.sty.bar} rounded-full`}
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5 group-hover:text-[#1351B4] transition-colors">{pct}% do total · clique para detalhar</p>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          </CollapsibleSection>

          {/* ── Top 5 per column ─────────────────────────────────────── */}
          <CollapsibleSection title={`Top ${viewMode === 'tecnico' ? 'Técnicos' : 'Conferencistas'} por Estágio`} icon={TrendingUp} headerBg="bg-slate-700 hover:bg-slate-800" collapsed={sec.topEstagio} onToggle={() => toggleSec('topEstagio')}>
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {FIXED_COLS.filter(col => matrixData.totalCols[col.key] > 0 && col.key !== 'demandas_recebidas').map(col => {
                  const colLabel = `${col.line1}${col.line2 ? ' ' + col.line2 : ''}`;
                  const top5 = matrixData.rows
                    .filter(r => r.cols[col.key] > 0)
                    .sort((a, b) => b.cols[col.key] - a.cols[col.key])
                    .slice(0, 5);
                  const maxVal = top5[0]?.cols[col.key] || 1;
                  const headerColor = col.key === 'total_ggcon' ? 'bg-blue-700' : col.key === 'concluida' ? 'bg-emerald-600' : col.key === 'transf_vol' ? 'bg-teal-600' : col.key === 'emenda_loa' ? 'bg-violet-600' : col.key === 'diligencia' ? 'bg-amber-600' : 'bg-red-600';
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
          </CollapsibleSection>

          {/* ── Demandas Mais Atrasadas por Técnico ─────────────────── */}
          <CollapsibleSection title={`Demandas Mais Atrasadas — por ${viewMode === 'tecnico' ? 'Técnico' : 'Conferencista'}`} icon={Flame} headerBg="bg-red-800 hover:bg-red-900" collapsed={sec.atrasadas} onToggle={() => toggleSec('atrasadas')}>
          {(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            // Only non-completed demands with a liberação date
            const pending = filtered.filter(r => !(r.concluida_em ?? '').trim() && (r.data_liberacao ?? '').trim());
            // Compute days since liberação for each
            const withDays = pending.map(r => {
              const d = new Date(r.data_liberacao + 'T00:00:00');
              const dias = isNaN(d.getTime()) ? 0 : Math.floor((today.getTime() - d.getTime()) / 86400000);
              return { ...r, dias_atraso: Math.max(0, dias) };
            }).filter(r => r.dias_atraso > 0);
            // Group by técnico
            const byTecnico = new Map<string, { total: number; soma_dias: number; max_dias: number; count_critico: number; rows: FormalizacaoRow[] }>();
            for (const r of withDays) {
              const tec = String(r[personField] ?? '').trim() || '(não atribuído)';
              if (!byTecnico.has(tec)) byTecnico.set(tec, { total: 0, soma_dias: 0, max_dias: 0, count_critico: 0, rows: [] });
              const g = byTecnico.get(tec)!;
              g.total++; g.soma_dias += r.dias_atraso; g.max_dias = Math.max(g.max_dias, r.dias_atraso);
              if (r.dias_atraso > 90) g.count_critico++;
              g.rows.push(r);
            }
            const ranked = Array.from(byTecnico.entries())
              .map(([name, d]) => ({ name, ...d, media: Math.round(d.soma_dias / d.total) }))
              .sort((a, b) => b.media - a.media)
              .slice(0, 15);
            const maxMedia = ranked[0]?.media || 1;
            // Global aging buckets
            const faixas = [
              { label: '0–30 dias', min: 0, max: 30, color: 'bg-emerald-500' },
              { label: '31–60 dias', min: 31, max: 60, color: 'bg-yellow-500' },
              { label: '61–90 dias', min: 61, max: 90, color: 'bg-orange-500' },
              { label: '91–180 dias', min: 91, max: 180, color: 'bg-red-500' },
              { label: '180+ dias', min: 181, max: 99999, color: 'bg-red-800' },
            ];
            const faixaCounts = faixas.map(f => ({
              ...f,
              count: withDays.filter(r => r.dias_atraso >= f.min && r.dias_atraso <= f.max).length,
            }));
            const maxFaixaCount = Math.max(...faixaCounts.map(f => f.count), 1);

            return (
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-500" />
                Demandas Mais Atrasadas — por {viewMode === 'tecnico' ? 'Técnico' : 'Conferencista'}
                <span className="text-[10px] text-slate-400 font-normal">({withDays.length.toLocaleString('pt-BR')} demandas pendentes)</span>
              </h3>

              {/* Aging distribution bar */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">Distribuição por Tempo de Espera (dias desde liberação)</h4>
                <div className="grid grid-cols-5 gap-3">
                  {faixaCounts.map(f => (
                    <div key={f.label} className="text-center">
                      <div className="h-24 flex items-end justify-center mb-1">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(4, (f.count / maxFaixaCount) * 100)}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className={`${f.color} rounded-t-md w-10`}
                        />
                      </div>
                      <p className="text-sm font-black text-slate-800">{f.count.toLocaleString('pt-BR')}</p>
                      <p className="text-[10px] text-slate-500 font-semibold">{f.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ranking by average delay */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 bg-gradient-to-r from-red-700 to-red-900 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    Ranking — Média de Dias Pendentes
                  </h4>
                  <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">
                    Top {ranked.length}
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {ranked.map((r, i) => (
                    <button key={r.name}
                      onClick={() => openDrilldown(`${r.name} — Pendentes (${r.total})`, r.rows)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 transition-colors text-left group">
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white ${i < 3 ? 'bg-red-600' : 'bg-slate-400'}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-semibold text-slate-700 truncate group-hover:text-red-700 transition-colors">{r.name}</span>
                          <div className="flex items-center gap-3 flex-shrink-0 text-[11px]">
                            <span className="text-slate-400">{r.total} demandas</span>
                            {r.count_critico > 0 && (
                              <span className="text-red-600 font-bold">{r.count_critico} críticas (&gt;90d)</span>
                            )}
                            <span className="font-black text-red-700">{r.media} dias</span>
                            <span className="text-slate-400">máx {r.max_dias}d</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(r.media / maxMedia) * 100}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className={`h-full rounded-full ${r.media > 90 ? 'bg-gradient-to-r from-red-500 to-red-700' : r.media > 60 ? 'bg-gradient-to-r from-orange-400 to-orange-600' : 'bg-gradient-to-r from-yellow-400 to-yellow-600'}`}
                          />
                        </div>
                      </div>
                    </button>
                  ))}
                  {ranked.length === 0 && <p className="text-xs text-slate-400 text-center py-6">Nenhuma demanda pendente com data de liberação</p>}
                </div>
              </div>
            </div>
            );
          })()}
          </CollapsibleSection>

          {/* ── Linha do Tempo das Demandas ──────────────────────────── */}
          <CollapsibleSection title="Linha do Tempo — Demandas em Andamento" icon={Calendar} headerBg="bg-blue-700 hover:bg-blue-800" collapsed={sec.timeline} onToggle={() => toggleSec('timeline')}>
            <TimelineSection
              filtered={filtered}
              personField={personField}
              openDrilldown={openDrilldown}
              viewMode={viewMode}
            />
          </CollapsibleSection>

          {/* ── Produtividade Mês a Mês ──────────────────────────────── */}
          <CollapsibleSection
            title={`Produtividade — por ${viewMode === 'tecnico' ? 'Técnico' : 'Conferencista'}`}
            icon={Activity}
            headerBg="bg-teal-700 hover:bg-teal-800"
            collapsed={sec.produtividade}
            onToggle={() => toggleSec('produtividade')}
          >
            <ProdutividadeAnalise
              pessoas={viewMode === 'tecnico' ? produtividadeData.tecnicos : produtividadeData.conferencistas}
              label={viewMode === 'tecnico' ? 'Técnicos' : 'Conferencistas'}
              allMeses={produtividadeData.allMeses}
              filtered={filtered}
              dateField={viewMode === 'tecnico' ? 'data_liberacao' : 'data_recebimento_demanda'}
              openDrilldown={openDrilldown}
            />
          </CollapsibleSection>

        </>
      )}
    </div>
  );
}
