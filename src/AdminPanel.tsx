import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, BarChart3, FileText, CheckCheck, ChevronDown, ChevronRight, Filter, Calendar, RefreshCw, Clock, TrendingUp, AlertTriangle, MapPin, Users, UserCheck, BookOpen, Send, Zap, PieChart, Tag, Layers, Wallet, Briefcase, Activity } from 'lucide-react';
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

function formatMes(mes: string): string {
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const parts = mes.split('-');
  if (parts.length < 2) return mes;
  return `${nomes[parseInt(parts[1]) - 1]}/${parts[0].substring(2)}`;
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

// ─── Etapas simplificadas (linguagem leiga) ────────────────────────────────
const ETAPAS_SIMPLES = [
  { label: 'Com técnico / Ag. Documentação', desc: 'Demanda com o técnico ou aguardando documentação do convenente', keys: ['demandaComTecnico', 'agDoc'], color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50 border-blue-200' },
  { label: 'Em Análise', desc: 'Documentação sendo analisada pelo técnico', keys: ['emAnalise'], color: 'bg-sky-500', textColor: 'text-sky-700', bgLight: 'bg-sky-50 border-sky-200' },
  { label: 'Em Diligência', desc: 'Pendência comunicada ao convenente, aguardando resposta', keys: ['diligencia'], color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50 border-red-200' },
  { label: 'Em Formalização / Conferência', desc: 'Em processo de formalização ou conferência do convênio', keys: ['formalizacao', 'emConferencia', 'confPendencia', 'comiteGestor'], color: 'bg-violet-500', textColor: 'text-violet-700', bgLight: 'bg-violet-50 border-violet-200' },
  { label: 'Em Assinatura / Publicação', desc: 'Aguardando assinaturas ou publicação no DOE', keys: ['emAssinatura', 'laudasPubli', 'outrasPend'], color: 'bg-emerald-500', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50 border-emerald-200' },
];

// ─── Classification helpers ───────────────────────────────────────────────
function groupByField(data: any[], field: string): { label: string; value: number }[] {
  const map = new Map<string, number>();
  data.forEach(row => {
    const key = String(row[field] ?? '').trim() || '(não preenchido)';
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function classifyObjeto(data: any[]): { label: string; value: number }[] {
  const buckets: Record<string, number> = { 'Custeio': 0, 'Aquisição': 0, 'Obra': 0, 'Outros': 0 };
  data.forEach(row => {
    const val = String(row.objeto ?? '').toUpperCase();
    if (val.includes('CUSTEIO')) buckets['Custeio']++;
    else if (val.includes('AQUISI') || val.includes('COMPRA')) buckets['Aquisição']++;
    else if (val.includes('OBRA')) buckets['Obra']++;
    else buckets['Outros']++;
  });
  return Object.entries(buckets)
    .filter(([, v]) => v > 0)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function getStageBadgeClass(stage: string): string {
  const upper = (stage || '').toUpperCase();
  if (upper.includes('DILIGÊNCIA') || upper.includes('DILIGENCIA')) return 'bg-red-100 text-red-700';
  if (upper.includes('ANÁLISE') || upper.includes('ANALISE')) return 'bg-sky-100 text-sky-700';
  if (upper.includes('CONFERÊNCIA') || upper.includes('CONFERENCIA')) return 'bg-violet-100 text-violet-700';
  if (upper.includes('ASSINATURA')) return 'bg-teal-100 text-teal-700';
  if (upper.includes('FORMALIZ')) return 'bg-indigo-100 text-indigo-700';
  if (upper.includes('AGUARDANDO')) return 'bg-amber-100 text-amber-700';
  if (upper.includes('TÉCNICO') || upper.includes('TECNICO')) return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-600';
}

function getSituacaoCategoryColor(key: string): { text: string; badge: string; bar: string } {
  const colorMap: Record<string, { text: string; badge: string; bar: string }> = {
    demandaComTecnico: { text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700', bar: 'bg-blue-500' },
    emAnalise: { text: 'text-sky-700', badge: 'bg-sky-100 text-sky-700', bar: 'bg-sky-500' },
    agDoc: { text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500' },
    diligencia: { text: 'text-red-700', badge: 'bg-red-100 text-red-700', bar: 'bg-red-500' },
    formalizacao: { text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-700', bar: 'bg-indigo-500' },
    emConferencia: { text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700', bar: 'bg-violet-500' },
    confPendencia: { text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700', bar: 'bg-purple-500' },
    emAssinatura: { text: 'text-teal-700', badge: 'bg-teal-100 text-teal-700', bar: 'bg-teal-500' },
    laudasPubli: { text: 'text-fuchsia-700', badge: 'bg-fuchsia-100 text-fuchsia-700', bar: 'bg-fuchsia-500' },
    comiteGestor: { text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700', bar: 'bg-orange-500' },
    outrasPend: { text: 'text-slate-600', badge: 'bg-slate-100 text-slate-600', bar: 'bg-slate-400' },
  };
  return colorMap[key] || { text: 'text-slate-700', badge: 'bg-slate-100 text-slate-600', bar: 'bg-slate-400' };
}

function TechnicianCard({ row, idx }: { row: any; idx: number }) {
  const [showDemandas, setShowDemandas] = useState(false);
  const pctConcluido = row.recebidas > 0 ? Math.round((row.concluida / row.recebidas) * 100) : 0;
  const activeSituacoes = SITUACAO_CATEGORIAS.filter(c => (row[c.key] || 0) > 0);
  const diligCount = row.diligencia || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1351B4] to-[#0C326F] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white text-sm uppercase">
            {(row.tecnico || '?').charAt(0)}
          </div>
          <span className="text-white font-bold text-sm truncate">{row.tecnico}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
          <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap">
            {row.recebidas} total
          </span>
          {diligCount > 0 && (
            <span className="bg-red-500/80 text-white text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap">
              {diligCount} dilig.
            </span>
          )}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        <div className="px-3 py-2.5 text-center">
          <p className="text-xl font-bold text-amber-600 leading-none">{row.totalGGCON}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Em andamento</p>
        </div>
        <div className="px-3 py-2.5 text-center">
          <p className="text-xl font-bold text-green-600 leading-none">{row.concluida}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Concluídas</p>
        </div>
        <div className="px-3 py-2.5 text-center">
          <p className={`text-xl font-bold leading-none ${pctConcluido >= 70 ? 'text-green-600' : pctConcluido >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
            {pctConcluido}%
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Concluído</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pctConcluido}%` }}
            transition={{ duration: 0.8, delay: idx * 0.05 }}
            className={`h-full rounded-full ${pctConcluido >= 70 ? 'bg-green-500' : pctConcluido >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
          />
        </div>
      </div>

      {/* Situações em andamento - lista com barras */}
      {activeSituacoes.length > 0 && (
        <div className="px-4 py-3 space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Distribuição em andamento</p>
          {activeSituacoes.map((cat, ci) => {
            const count = row[cat.key] || 0;
            const pctOfTotal = row.totalGGCON > 0 ? (count / row.totalGGCON) * 100 : 0;
            const colors = getSituacaoCategoryColor(cat.key);
            return (
              <div key={ci} className="flex items-center gap-2">
                <span className={`text-[11px] font-semibold ${colors.text} shrink-0 w-36`}>{cat.label}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pctOfTotal}%` }}
                    transition={{ duration: 0.6, delay: idx * 0.04 + ci * 0.03 }}
                    className={`h-full rounded-full ${colors.bar}`}
                  />
                </div>
                <span className={`text-xs font-bold w-6 text-right shrink-0 ${colors.text}`}>{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Demandas atribuídas não concluídas - accordion */}
      {row.demandasPendentes?.length > 0 && (
        <div className="border-t border-slate-100">
          <button
            onClick={() => setShowDemandas(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-blue-50 hover:bg-blue-100/70 transition-colors"
          >
            <span className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Demandas atribuídas não concluídas ({row.demandasPendentes.length})
            </span>
            {showDemandas ? <ChevronDown className="w-3.5 h-3.5 text-blue-400" /> : <ChevronRight className="w-3.5 h-3.5 text-blue-400" />}
          </button>
          <AnimatePresence initial={false}>
            {showDemandas && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <div className="overflow-x-auto max-h-60 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-blue-50">
                      <tr className="border-b border-blue-200">
                        <th className="text-left px-3 py-2 font-bold text-slate-700">Nº Demanda</th>
                        <th className="text-center px-3 py-2 font-bold text-slate-700">Dt. Atribuição</th>
                        <th className="text-left px-3 py-2 font-bold text-slate-700">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.demandasPendentes.map((d: any, di: number) => (
                        <tr key={di} className={`border-b border-slate-100 hover:bg-blue-50/50 ${di % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                          <td className="px-3 py-2 text-slate-700 max-w-[160px] truncate" title={d.demanda}>{d.demanda}</td>
                          <td className="px-3 py-2 text-center text-slate-600 whitespace-nowrap">{d.data_atribuicao}</td>
                          <td className="px-3 py-2 text-slate-500 max-w-[140px] truncate" title={d.situacao}>{d.situacao}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

function ProdutividadeTable({ rows, colorClass = 'bg-blue-700' }: {
  rows: { mes: string; lib: number; pub: number; conc: number; mediaDias: number | null }[];
  colorClass?: string;
}) {
  const totLib = rows.reduce((s, r) => s + r.lib, 0);
  const totPub = rows.reduce((s, r) => s + r.pub, 0);
  const totConc = rows.reduce((s, r) => s + r.conc, 0);
  const diasRows = rows.filter(r => r.mediaDias !== null);
  const medGeral = diasRows.length > 0 ? Math.round(diasRows.reduce((s, r) => s + r.mediaDias!, 0) / diasRows.length) : null;
  const taxaGeral = totLib > 0 ? Math.round((totPub / totLib) * 100) : 0;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className={`${colorClass} text-white`}>
            <th className="text-left px-3 py-2.5 font-bold whitespace-nowrap">Mês</th>
            <th className="text-center px-3 py-2.5 font-bold whitespace-nowrap">Liberadas</th>
            <th className="text-center px-3 py-2.5 font-bold whitespace-nowrap">Publicadas</th>
            <th className="text-center px-3 py-2.5 font-bold whitespace-nowrap">Concluídas</th>
            <th className="text-center px-3 py-2.5 font-bold whitespace-nowrap">Lib → Pub (dias)</th>
            <th className="text-center px-3 py-2.5 font-bold whitespace-nowrap">Taxa Publicação</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const taxa = row.lib > 0 ? Math.round((row.pub / row.lib) * 100) : 0;
            return (
              <tr key={ri} className={`border-b border-slate-100 ${ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                <td className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">{formatMes(row.mes)}</td>
                <td className="px-3 py-2 text-center">
                  <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold min-w-[2rem] text-center">{row.lib}</span>
                </td>
                <td className="px-3 py-2 text-center">
                  {row.pub > 0
                    ? <span className="inline-block px-2 py-0.5 rounded bg-fuchsia-100 text-fuchsia-700 font-bold min-w-[2rem] text-center">{row.pub}</span>
                    : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-3 py-2 text-center">
                  {row.conc > 0
                    ? <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 font-bold min-w-[2rem] text-center">{row.conc}</span>
                    : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-3 py-2 text-center">
                  {row.mediaDias !== null
                    ? <span className={`inline-block px-2 py-0.5 rounded font-bold ${row.mediaDias <= 30 ? 'bg-green-100 text-green-700' : row.mediaDias <= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{row.mediaDias}d</span>
                    : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded font-bold ${taxa >= 70 ? 'bg-green-100 text-green-700' : taxa >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{taxa}%</span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className={`${colorClass} text-white font-bold`}>
            <td className="px-3 py-2.5 font-bold">Total / Média</td>
            <td className="px-3 py-2.5 text-center">{totLib}</td>
            <td className="px-3 py-2.5 text-center">{totPub}</td>
            <td className="px-3 py-2.5 text-center">{totConc}</td>
            <td className="px-3 py-2.5 text-center">{medGeral !== null ? `${medGeral}d` : '—'}</td>
            <td className="px-3 py-2.5 text-center">{taxaGeral}%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function AdminPanel() {
  const { user } = useAuth();

  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [rawFormalizacoes, setRawFormalizacoes] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);

  const [procxRunning, setProcxRunning] = useState(false);
  const [procxMsg, setProcxMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleProcxAreaEstagio = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    setProcxRunning(true);
    setProcxMsg(null);
    try {
      const resp = await fetch('/api/admin/update-area-estagio', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || resp.statusText);
      setProcxMsg({ type: 'ok', text: `✅ ${data.message || data.updated + ' registros atualizados'}` });
      // Recarregar dados para reflectir a mudança no gráfico
      window.dispatchEvent(new CustomEvent('admin-reload'));
    } catch (e: any) {
      setProcxMsg({ type: 'err', text: `❌ ${e.message}` });
    } finally {
      setProcxRunning(false);
    }
  };

  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({
    filtros: false,
    resumo: true,
    quadroTecnico: true,
    panoramaSituacao: true,
    detalheSituacao: true,
    tempoTecnicos: true,
    evolucaoMensal: true,
    demandasRegional: true,
    conferencistas: true,
    atrasadas: true,
    publicacoesMes: true,
    taxaConclusao: true,
    tempoMedioAnalise: true,
    produtividadeTecnico: true,
    produtividadeConferencista: true,
    classClassif: true,
    classTipo: true,
    classObjeto: true,
    classPortfolio: true,
    classRecurso: true,
    classAreaEstagio: true,
  });

  const [expandedSituacoes, setExpandedSituacoes] = useState<Set<string>>(new Set());
  const [expandedConfs, setExpandedConfs] = useState<Set<string>>(new Set());
  const [expandedConfDemandas, setExpandedConfDemandas] = useState<Set<string>>(new Set());
  const [expandedProdTecnicos, setExpandedProdTecnicos] = useState<Set<string>>(new Set());
  const [expandedProdConfs, setExpandedProdConfs] = useState<Set<string>>(new Set());

  const [filtroTecnico, setFiltroTecnico] = useState('');
  const [filtroRegional, setFiltroRegional] = useState('');
  const [filtroConferencista, setFiltroConferencista] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState('');
  const [filtroAno, setFiltroAno] = useState('');
  const [filtroDataInicial, setFiltroDataInicial] = useState('');
  const [filtroDataFinal, setFiltroDataFinal] = useState('');
  const [filtrosAtivos, setFiltrosAtivos] = useState(false);

  const toggle = (id: string) => setCollapsedCards(prev => ({ ...prev, [id]: !prev[id] }));

  const uniqueTecnicos = useMemo(() => {
    return Array.from(new Set(rawFormalizacoes.map((f: any) => f.tecnico || '').filter(Boolean))).sort();
  }, [rawFormalizacoes]);

  const uniqueRegionais = useMemo(() => {
    return Array.from(new Set(rawFormalizacoes.map((f: any) => f.regional || '').filter(Boolean))).sort();
  }, [rawFormalizacoes]);

  const uniqueConferencistas = useMemo(() => {
    return Array.from(new Set(rawFormalizacoes.map((f: any) => f.conferencista || '').filter(Boolean))).sort();
  }, [rawFormalizacoes]);

  const uniqueSituacoes = useMemo(() => {
    return Array.from(new Set(rawFormalizacoes.map((f: any) => f.area_estagio_situacao_demanda || '').filter(Boolean))).sort();
  }, [rawFormalizacoes]);

  const uniqueAnoOptions = useMemo(() => {
    const anos = new Set<string>();
    rawFormalizacoes.forEach((f: any) => {
      const dateStr = f.data_recebimento_demanda || f.data_entrada || f.created_at || '';
      if (!dateStr) return;
      let ano = '';
      if (String(dateStr).includes('/')) {
        const p = String(dateStr).split('/');
        if (p.length >= 3) ano = String(p[2]).substring(0, 4);
      } else {
        ano = String(dateStr).substring(0, 4);
      }
      if (ano && ano.length === 4 && !isNaN(Number(ano)) && Number(ano) > 2000) anos.add(ano);
    });
    return Array.from(anos).sort().reverse();
  }, [rawFormalizacoes]);

  const filtered = useMemo(() => {
    if (!filtrosAtivos || !rawFormalizacoes.length) return rawFormalizacoes;
    let data = [...rawFormalizacoes];
    if (filtroTecnico) data = data.filter((f: any) => (f.tecnico || '') === filtroTecnico);
    if (filtroRegional) data = data.filter((f: any) => (f.regional || '') === filtroRegional);
    if (filtroConferencista) data = data.filter((f: any) => (f.conferencista || '') === filtroConferencista);
    if (filtroSituacao) data = data.filter((f: any) => (f.area_estagio_situacao_demanda || '') === filtroSituacao);
    if (filtroAno) {
      data = data.filter((f: any) => {
        const dateStr = String(f.data_recebimento_demanda || f.data_entrada || f.created_at || '');
        if (!dateStr) return false;
        let ano = '';
        if (dateStr.includes('/')) {
          const p = dateStr.split('/');
          if (p.length >= 3) ano = String(p[2]).substring(0, 4);
        } else {
          ano = dateStr.substring(0, 4);
        }
        return ano === filtroAno;
      });
    }
    if (filtroDataInicial) data = data.filter((f: any) => (f.data_entrada || f.created_at || '') >= filtroDataInicial);
    if (filtroDataFinal) data = data.filter((f: any) => (f.data_entrada || f.created_at || '') <= filtroDataFinal);
    return data;
  }, [rawFormalizacoes, filtrosAtivos, filtroTecnico, filtroRegional, filtroConferencista, filtroSituacao, filtroAno, filtroDataInicial, filtroDataFinal]);

  // === METRICS ===

  const displayData = useMemo(() => {
    const source = filtered;
    if (!source.length) return null;
    const totalEmendas = source.filter((f: any) => f.emenda && String(f.emenda).trim() !== '').length;
    const totalDemandas = source.filter((f: any) => f.demanda && String(f.demanda).trim() !== '').length;
    const concluidas = source.filter((f: any) => f.concluida_em && String(f.concluida_em).trim() !== '').length;
    const emAndamento = source.length - concluidas;
    const publicadas = source.filter((f: any) => f.publicacao && String(f.publicacao).trim() !== '').length;

    const situacoes = [
      'DEMANDA COM O TÉCNICO', 'DEMANDA COM O TÉCNICO - FUNDO A FUNDO',
      'EM ANÁLISE DA DOCUMENTAÇÃO', 'EM ANÁLISE DA DOCUMENTAÇÃO - FUNDO A FUNDO',
      'EM ANÁLISE DO PLANO DE TRABALHO', 'EM ANÁLISE DO PLANO DE TRABALHO - FUNDO A FUNDO',
      'AGUARDANDO DOCUMENTAÇÃO', 'AGUARDANDO DOCUMENTAÇÃO - FUNDO A FUNDO',
      'DEMANDA EM DILIGÊNCIA', 'DEMANDA EM DILIGÊNCIA - FUNDO A FUNDO',
      'DEMANDA EM DILIGÊNCIA DOCUMENTO', 'DEMANDA EM DILIGÊNCIA DOCUMENTO - DRS - FUNDO A FUNDO',
      'DEMANDA EM DILIGÊNCIA PLANO DE TRABALHO', 'DEMANDA EM DILIGÊNCIA PLANO DE TRABALHO - CRS - FUNDO A FUNDO',
      'COMITÊ GESTOR', 'COMITÊ GESTOR - FUNDO A FUNDO',
      'OUTRAS PENDÊNCIAS', 'OUTRAS PENDÊNCIAS - FUNDO A FUNDO',
      'EM FORMALIZAÇÃO', 'EM FORMALIZAÇÃO - FUNDO A FUNDO',
      'EM CONFERÊNCIA', 'EM CONFERÊNCIA - FUNDO A FUNDO',
      'CONFERÊNCIA COM PENDÊNCIA', 'CONFERÊNCIA COM PENDÊNCIA - FUNDO A FUNDO',
      'EM ASSINATURA', 'EM ASSINATURA - FUNDO A FUNDO',
      'EMPENHO CANCELADO', 'EMPENHO CANCELADO - FUNDO A FUNDO',
      'LAUDAS', 'LAUDAS - FUNDO A FUNDO',
      'PUBLICAÇÃO NO DOE', 'PUBLICAÇÃO NO DOE - FUNDO A FUNDO',
      'PROCESSO SIAFEM', 'PROCESSO SIAFEM - FUNDO A FUNDO'
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
        data_liberacao_assinatura: f.data_liberacao_assinatura || '—',
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
          totalGGCON: 0, concluida: 0, transfVol: 0, emendaLOA: 0, demandasPendentes: [] as any[],
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
        row.demandasPendentes.push({
          demanda: f.demandas_formalizacao || f.demanda || f.emenda || '—',
          data_atribuicao: f.data_liberacao || '—',
          situacao: f.area_estagio_situacao_demanda || '—',
        });
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
    const confMap = new Map<string, { total: number; conferidas: number; pendentes: number; motivosPendentes: Map<string, number>; demandasNaoConcluidas: any[] }>();
    filtered.forEach((f: any) => {
      const conf = f.conferencista || 'Sem Conferencista';
      if (!confMap.has(conf)) confMap.set(conf, { total: 0, conferidas: 0, pendentes: 0, motivosPendentes: new Map(), demandasNaoConcluidas: [] });
      const c = confMap.get(conf)!;
      c.total++;
      const concluida = f.concluida_em && String(f.concluida_em).trim() !== '';
      if (f.data_liberacao_assinatura_conferencista && String(f.data_liberacao_assinatura_conferencista).trim() !== '') {
        c.conferidas++;
      } else {
        c.pendentes++;
        const stage = (f.area_estagio_situacao_demanda || '').trim() || 'Sem situação definida';
        c.motivosPendentes.set(stage, (c.motivosPendentes.get(stage) || 0) + 1);
      }
      if (!concluida) {
        c.demandasNaoConcluidas.push({
          demanda: f.demandas_formalizacao || f.demanda || f.emenda || '—',
          data_atribuicao: f.data_liberacao || '—',
          situacao: f.area_estagio_situacao_demanda || '—',
        });
      }
    });
    return Array.from(confMap.entries()).map(([conferencista, data]) => ({
      conferencista,
      total: data.total,
      conferidas: data.conferidas,
      pendentes: data.pendentes,
      motivosPendentes: Array.from(data.motivosPendentes.entries())
        .map(([motivo, count]) => ({ motivo, count }))
        .sort((a, b) => b.count - a.count),
      demandasNaoConcluidas: data.demandasNaoConcluidas,
    })).sort((a, b) => b.total - a.total);
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

  // Produtividade mês a mês por técnico (data_liberacao → publicacao)
  const produtividadeTecnico = useMemo(() => {
    type MesRow = { lib: number; pub: number; conc: number; totalDias: number; countDias: number };
    const tecMap = new Map<string, Map<string, MesRow>>();
    const allMeses = new Set<string>();
    filtered.forEach((f: any) => {
      const tecnico = (f.tecnico || '').trim();
      if (!tecnico) return;
      const dtLib = parseDate(f.data_liberacao || '');
      if (!dtLib) return;
      const mes = `${dtLib.getFullYear()}-${String(dtLib.getMonth() + 1).padStart(2, '0')}`;
      allMeses.add(mes);
      if (!tecMap.has(tecnico)) tecMap.set(tecnico, new Map());
      const mesMap = tecMap.get(tecnico)!;
      if (!mesMap.has(mes)) mesMap.set(mes, { lib: 0, pub: 0, conc: 0, totalDias: 0, countDias: 0 });
      const row = mesMap.get(mes)!;
      row.lib++;
      const pubStr = (f.publicacao || '').trim();
      if (pubStr) {
        const dtPub = parseDate(pubStr);
        if (dtPub) {
          row.pub++;
          const dias = daysBetween(dtLib, dtPub);
          if (dias >= 0 && dias <= 730) { row.totalDias += dias; row.countDias++; }
        }
      }
      if ((f.concluida_em || '').trim()) row.conc++;
    });
    const meses = Array.from(allMeses).sort();
    return {
      meses,
      tecnicos: Array.from(tecMap.keys()).sort().map(nome => {
        const mesMap = tecMap.get(nome)!;
        const rows = meses.map(mes => {
          const d = mesMap.get(mes) || { lib: 0, pub: 0, conc: 0, totalDias: 0, countDias: 0 };
          return { mes, lib: d.lib, pub: d.pub, conc: d.conc, mediaDias: d.countDias > 0 ? Math.round(d.totalDias / d.countDias) : null };
        }).filter(r => r.lib > 0);
        const totLib = rows.reduce((s, r) => s + r.lib, 0);
        const totPub = rows.reduce((s, r) => s + r.pub, 0);
        const totConc = rows.reduce((s, r) => s + r.conc, 0);
        const diasRows = rows.filter(r => r.mediaDias !== null);
        const medGeral = diasRows.length > 0 ? Math.round(diasRows.reduce((s, r) => s + r.mediaDias!, 0) / diasRows.length) : null;
        return { nome, meses: rows, totLib, totPub, totConc, taxa: totLib > 0 ? Math.round((totPub / totLib) * 100) : 0, medGeral };
      }).filter(t => t.totLib > 0),
    };
  }, [filtered]);

  // Produtividade mês a mês por conferencista (data_liberacao → publicacao)
  const produtividadeConferencista = useMemo(() => {
    type MesRow = { lib: number; pub: number; conc: number; totalDias: number; countDias: number };
    const confMap = new Map<string, Map<string, MesRow>>();
    const allMeses = new Set<string>();
    filtered.forEach((f: any) => {
      const conf = (f.conferencista || '').trim();
      if (!conf) return;
      const dtLib = parseDate(f.data_liberacao || '');
      if (!dtLib) return;
      const mes = `${dtLib.getFullYear()}-${String(dtLib.getMonth() + 1).padStart(2, '0')}`;
      allMeses.add(mes);
      if (!confMap.has(conf)) confMap.set(conf, new Map());
      const mesMap = confMap.get(conf)!;
      if (!mesMap.has(mes)) mesMap.set(mes, { lib: 0, pub: 0, conc: 0, totalDias: 0, countDias: 0 });
      const row = mesMap.get(mes)!;
      row.lib++;
      const pubStr = (f.publicacao || '').trim();
      if (pubStr) {
        const dtPub = parseDate(pubStr);
        if (dtPub) {
          row.pub++;
          const dias = daysBetween(dtLib, dtPub);
          if (dias >= 0 && dias <= 730) { row.totalDias += dias; row.countDias++; }
        }
      }
      if ((f.concluida_em || '').trim()) row.conc++;
    });
    const meses = Array.from(allMeses).sort();
    return {
      meses,
      conferencistas: Array.from(confMap.keys()).sort().map(nome => {
        const mesMap = confMap.get(nome)!;
        const rows = meses.map(mes => {
          const d = mesMap.get(mes) || { lib: 0, pub: 0, conc: 0, totalDias: 0, countDias: 0 };
          return { mes, lib: d.lib, pub: d.pub, conc: d.conc, mediaDias: d.countDias > 0 ? Math.round(d.totalDias / d.countDias) : null };
        }).filter(r => r.lib > 0);
        const totLib = rows.reduce((s, r) => s + r.lib, 0);
        const totPub = rows.reduce((s, r) => s + r.pub, 0);
        const totConc = rows.reduce((s, r) => s + r.conc, 0);
        const diasRows = rows.filter(r => r.mediaDias !== null);
        const medGeral = diasRows.length > 0 ? Math.round(diasRows.reduce((s, r) => s + r.mediaDias!, 0) / diasRows.length) : null;
        return { nome, meses: rows, totLib, totPub, totConc, taxa: totLib > 0 ? Math.round((totPub / totLib) * 100) : 0, medGeral };
      }).filter(c => c.totLib > 0),
    };
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

  // ── Classification groupings (using already-filtered data) ────────────────
  const classClassif   = useMemo(() => groupByField(filtered, 'classificacao_emenda_demanda'), [filtered]);
  const classTipo      = useMemo(() => groupByField(filtered, 'tipo_formalizacao'), [filtered]);
  const classObjeto    = useMemo(() => classifyObjeto(filtered), [filtered]);
  const classPortfolio = useMemo(() => groupByField(filtered, 'portfolio'), [filtered]);
  const classRecurso   = useMemo(() => groupByField(filtered, 'recurso'), [filtered]);
  const classArea      = useMemo(() => groupByField(filtered, 'area_estagio'), [filtered]);

  if (user?.role !== 'admin') return null;

  const cellValue = (val: number, variant: 'red' | 'dark' | 'green' = 'red') => {
    if (val === 0) return <span className="text-slate-300">—</span>;
    const colors = { red: 'bg-red-600 text-white', dark: 'bg-slate-800 text-white', green: 'bg-green-600 text-white' };
    return <span className={`inline-block px-2 py-0.5 rounded font-bold text-xs min-w-[28px] text-center ${colors[variant]}`}>{val}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <CollapsibleCard
        id="filtros"
        title={`Filtros do Dashboard — ${filtrosAtivos ? filtered.length.toLocaleString() + ' / ' : ''}${totalRecords.toLocaleString()} registros`}
        icon={Filter}
        count={filtrosAtivos ? [filtroTecnico, filtroRegional, filtroConferencista, filtroSituacao, filtroAno, filtroDataInicial, filtroDataFinal].filter(Boolean).length : undefined}
        color="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800"
        collapsed={collapsedCards.filtros}
        toggle={() => toggle('filtros')}
      >
        {/* Linha 1: Técnico, Regional, Conferencista, Ano */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Técnico</label>
            <select value={filtroTecnico} onChange={e => setFiltroTecnico(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/10 outline-none">
              <option value="">Todos os técnicos</option>
              {uniqueTecnicos.map((t: string) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Regional</label>
            <select value={filtroRegional} onChange={e => setFiltroRegional(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/10 outline-none">
              <option value="">Todas as regionais</option>
              {uniqueRegionais.map((r: string) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Conferencista</label>
            <select value={filtroConferencista} onChange={e => setFiltroConferencista(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/10 outline-none">
              <option value="">Todos os conferencistas</option>
              {uniqueConferencistas.map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Ano</label>
            <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/10 outline-none">
              <option value="">Todos os anos</option>
              {uniqueAnoOptions.map((a: string) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {/* Linha 2: Situação (amplo), Data Inicial, Data Final */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Situação da Demanda (Etapa/Área)</label>
            <select value={filtroSituacao} onChange={e => setFiltroSituacao(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/10 outline-none">
              <option value="">Todas as situações</option>
              {uniqueSituacoes.map((s: string) => <option key={s} value={s}>{s}</option>)}
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
        </div>

        {/* Botões */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">Selecione os filtros e clique em Aplicar para atualizar o painel</p>
          <div className="flex gap-2">
            <button
              onClick={() => setFiltrosAtivos(true)}
              className="flex items-center justify-center gap-1.5 bg-[#1351B4] hover:bg-[#0C326F] text-white text-sm font-semibold rounded-lg px-5 py-2 transition-colors shadow-sm"
            >
              <Filter className="w-4 h-4" /> Aplicar Filtros
            </button>
            <button
              onClick={() => {
                setFiltroTecnico(''); setFiltroRegional(''); setFiltroConferencista('');
                setFiltroSituacao(''); setFiltroAno('');
                setFiltroDataInicial(''); setFiltroDataFinal('');
                setFiltrosAtivos(false);
              }}
              className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Limpar
            </button>
          </div>
        </div>
      </CollapsibleCard>

      {/* Dashboard */}
      {dashboardLoading ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <RefreshCw className="w-8 h-8 text-[#1351B4] animate-spin mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Carregando todos os dados da formalização...</p>
        </div>
      ) : displayData ? (
        <div className="space-y-5">

          {/* ===== CARDS RESUMO ===== */}
          <CollapsibleCard id="resumo" title="Resumo Geral" icon={BarChart3} color="bg-gradient-to-r from-[#1351B4] to-[#0C326F] hover:from-[#0C326F] hover:to-[#1351B4]" collapsed={collapsedCards.resumo} toggle={() => toggle('resumo')}>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-[#1351B4]/5 to-[#1351B4]/15 rounded-2xl p-4 border border-[#1351B4]/20 shadow-md">
              <p className="text-[10px] font-bold text-[#1351B4] uppercase tracking-wider mb-1">Total Demandas</p>
              <p className="text-3xl font-bold text-[#0C326F]">{displayData.totalDemandas.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 mt-1">com nº de demanda preenchido</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border border-green-200 shadow-md">
              <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1">Concluídas</p>
              <p className="text-3xl font-bold text-green-800">{displayData.concluidas.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 mt-1">{filtered.length > 0 ? Math.round((displayData.concluidas / filtered.length) * 100) : 0}% do total</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-br from-sky-50 to-sky-100 rounded-2xl p-4 border border-sky-200 shadow-md">
              <p className="text-[10px] font-bold text-sky-700 uppercase tracking-wider mb-1">Total Emendas</p>
              <p className="text-3xl font-bold text-sky-800">{displayData.totalEmendas.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 mt-1">com nº de emenda</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-4 border border-red-200 shadow-md">
              <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">Em Diligência</p>
              <p className="text-3xl font-bold text-red-800">{diligenciasAberto.total.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 mt-1">aguardando retorno</p>
            </motion.div>
          </div>
          </CollapsibleCard>

          {/* ===== PANORAMA VISUAL POR SITUAÇÃO/ETAPA ===== */}
          <CollapsibleCard id="panoramaSituacao" title="Panorama Geral por Situação / Etapa" icon={PieChart} count={displayData.distribuicaoSituacao.length} color="bg-gradient-to-r from-[#1351B4] to-[#2670E8] hover:from-[#0C326F] hover:to-[#1351B4]" collapsed={collapsedCards.panoramaSituacao} toggle={() => toggle('panoramaSituacao')}>
            {displayData.distribuicaoSituacao.length > 0 ? (
              <div className="space-y-2.5">
                {(() => {
                  const maxCount = Math.max(...displayData.distribuicaoSituacao.map((i: any) => i.count), 1);
                  const totalAndamento = displayData.distribuicaoSituacao.reduce((s: number, i: any) => s + i.count, 0);
                  const situacaoColors = [
                    'bg-blue-500', 'bg-sky-500', 'bg-amber-500', 'bg-red-500', 'bg-orange-500',
                    'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-teal-500', 'bg-fuchsia-500',
                    'bg-emerald-500', 'bg-rose-500', 'bg-cyan-500', 'bg-lime-500', 'bg-slate-500',
                  ];
                  return displayData.distribuicaoSituacao.map((item: any, idx: number) => {
                    const pctOfMax = (item.count / maxCount) * 100;
                    const pctOfTotal = totalAndamento > 0 ? ((item.count / totalAndamento) * 100).toFixed(1) : '0.0';
                    const colorClass = situacaoColors[idx % situacaoColors.length];
                    return (
                      <div key={idx}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-slate-700 flex-1 pr-4 leading-tight">{item.situacao}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-slate-400">{pctOfTotal}%</span>
                            <span className="bg-[#1351B4]/10 text-[#1351B4] px-2.5 py-0.5 rounded-full font-bold text-xs min-w-[2rem] text-center">{item.count}</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pctOfMax}%` }}
                            transition={{ duration: 0.7, delay: idx * 0.04, ease: 'easeOut' }}
                            className={`h-full rounded-full ${colorClass}`}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            ) : <p className="text-slate-500 text-center py-8">Sem dados de situação</p>}
          </CollapsibleCard>

          {/* ===== SITUAÇÃO DAS DEMANDAS POR TÉCNICO ===== */}
          <CollapsibleCard id="quadroTecnico" title="Situação das Demandas por Técnico" icon={Users} count={quadroTecnico.rows.length} color="bg-gradient-to-r from-[#1351B4] to-[#0C326F] hover:from-[#0C326F] hover:to-[#1351B4]" collapsed={collapsedCards.quadroTecnico} toggle={() => toggle('quadroTecnico')}>
            {quadroTecnico.rows.length > 0 ? (
              <div className="space-y-5">
                {/* Totais gerais */}
                {quadroTecnico.totals && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#0C326F]">{quadroTecnico.totals.recebidas}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Total Recebidas</p>
                    </div>
                    <div className="text-center border-l border-slate-300">
                      <p className="text-2xl font-bold text-amber-600">{quadroTecnico.totals.totalGGCON}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Em Andamento</p>
                    </div>
                    <div className="text-center border-l border-slate-300">
                      <p className="text-2xl font-bold text-green-600">{quadroTecnico.totals.concluida}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Concluídas</p>
                    </div>
                    <div className="text-center border-l border-slate-300">
                      <p className="text-2xl font-bold text-red-600">{quadroTecnico.totals.diligencia || 0}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Em Diligência</p>
                    </div>
                    <div className="text-center border-l border-slate-300">
                      <p className="text-2xl font-bold text-violet-600">{quadroTecnico.totals.emConferencia || 0}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Em Conferência</p>
                    </div>
                    <div className="text-center border-l border-slate-300">
                      <p className="text-2xl font-bold text-violet-700">
                        {quadroTecnico.totals.recebidas > 0 ? Math.round((quadroTecnico.totals.concluida / quadroTecnico.totals.recebidas) * 100) : 0}%
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">% Concluído</p>
                    </div>
                  </div>
                )}
                {/* Legenda de etapas */}
                <div className="flex flex-wrap gap-2 px-1">
                  {SITUACAO_CATEGORIAS.map((c, i) => {
                    const colors = getSituacaoCategoryColor(c.key);
                    return (
                      <span key={i} className={`${colors.badge} border border-current/20 text-[10px] font-semibold px-2 py-0.5 rounded-full`}>{c.label}</span>
                    );
                  })}
                </div>
                {/* Cards por técnico */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {quadroTecnico.rows.map((row: any, idx: number) => (
                    <TechnicianCard key={idx} row={row} idx={idx} />
                  ))}
                </div>
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
                                    <th className="text-center px-3 py-2 font-bold text-slate-700">Dt. Lib. Assinatura</th>
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
                                      <td className="px-3 py-2 text-center text-slate-600 whitespace-nowrap">{d.data_liberacao_assinatura}</td>
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

          {/* ===== DEMANDAS POR CONFERENCISTA ===== */}
          <CollapsibleCard id="conferencistas" title="Demandas por Conferencista" icon={UserCheck} count={demandasConferencista.length} color="bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700" collapsed={collapsedCards.conferencistas} toggle={() => toggle('conferencistas')}>
            {demandasConferencista.length > 0 ? (
              <div className="space-y-4">
                {demandasConferencista.map((item, idx) => {
                  const pct = item.total > 0 ? Math.round((item.conferidas / item.total) * 100) : 0;
                  const isExpanded = expandedConfs.has(item.conferencista);
                  return (
                    <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                      {/* Cabeçalho do conferencista */}
                      <div className="p-4 bg-white">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-violet-500" />
                            {item.conferencista}
                          </h4>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div className="text-center bg-violet-50 rounded-lg p-2 border border-violet-100">
                            <p className="text-xl font-bold text-violet-700">{item.total}</p>
                            <p className="text-[10px] text-slate-500 font-medium">Total</p>
                          </div>
                          <div className="text-center bg-green-50 rounded-lg p-2 border border-green-100">
                            <p className="text-xl font-bold text-green-700">{item.conferidas}</p>
                            <p className="text-[10px] text-slate-500 font-medium">Conferidas ✓</p>
                          </div>
                          <div className="text-center bg-red-50 rounded-lg p-2 border border-red-100">
                            <p className="text-xl font-bold text-red-600">{item.pendentes}</p>
                            <p className="text-[10px] text-slate-500 font-medium">Pendentes</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: idx * 0.05 }} className="h-full bg-gradient-to-r from-violet-400 to-violet-600 rounded-full" />
                          </div>
                          <span className="text-xs font-bold text-slate-600 w-10 text-right">{pct}%</span>
                        </div>
                      </div>

                      {/* Por que estão pendentes? (expandível) */}
                      {item.pendentes > 0 && (
                        <div className="border-t border-slate-100">
                          <button
                            onClick={() => setExpandedConfs(prev => {
                              const next = new Set(prev);
                              if (next.has(item.conferencista)) next.delete(item.conferencista); else next.add(item.conferencista);
                              return next;
                            })}
                            className="w-full flex items-center justify-between px-4 py-2.5 bg-red-50 hover:bg-red-100/70 transition-colors"
                          >
                            <span className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Por que estão pendentes? ({item.pendentes} demandas)
                            </span>
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-red-400" /> : <ChevronRight className="w-3.5 h-3.5 text-red-400" />}
                          </button>
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                <div className="px-4 py-3 space-y-2.5 bg-white border-t border-red-100">
                                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Situação atual de cada demanda pendente:</p>
                                  {item.motivosPendentes.map((motivo, mi) => {
                                    const pctMot = item.pendentes > 0 ? (motivo.count / item.pendentes) * 100 : 0;
                                    const badgeClass = getStageBadgeClass(motivo.motivo);
                                    return (
                                      <div key={mi}>
                                        <div className="flex items-center justify-between mb-1">
                                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>
                                            {motivo.motivo}
                                          </span>
                                          <span className="text-xs font-bold text-slate-700 ml-2 flex-shrink-0">{motivo.count}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                          <motion.div initial={{ width: 0 }} animate={{ width: `${pctMot}%` }} transition={{ duration: 0.5, delay: mi * 0.04 }} className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full" />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Demandas atribuídas não concluídas (expandível) */}
                      {item.demandasNaoConcluidas?.length > 0 && (
                        <div className="border-t border-slate-100">
                          <button
                            onClick={() => setExpandedConfDemandas(prev => {
                              const next = new Set(prev);
                              if (next.has(item.conferencista)) next.delete(item.conferencista); else next.add(item.conferencista);
                              return next;
                            })}
                            className="w-full flex items-center justify-between px-4 py-2.5 bg-violet-50 hover:bg-violet-100/70 transition-colors"
                          >
                            <span className="text-xs font-semibold text-violet-700 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5" />
                              Demandas atribuídas não concluídas ({item.demandasNaoConcluidas.length})
                            </span>
                            {expandedConfDemandas.has(item.conferencista) ? <ChevronDown className="w-3.5 h-3.5 text-violet-400" /> : <ChevronRight className="w-3.5 h-3.5 text-violet-400" />}
                          </button>
                          <AnimatePresence initial={false}>
                            {expandedConfDemandas.has(item.conferencista) && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                <div className="overflow-x-auto max-h-60 overflow-y-auto">
                                  <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-violet-50">
                                      <tr className="border-b border-violet-200">
                                        <th className="text-left px-3 py-2 font-bold text-slate-700">Nº Demanda</th>
                                        <th className="text-center px-3 py-2 font-bold text-slate-700">Dt. Atribuição</th>
                                        <th className="text-left px-3 py-2 font-bold text-slate-700">Situação</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {item.demandasNaoConcluidas.map((d: any, di: number) => (
                                        <tr key={di} className={`border-b border-slate-100 hover:bg-violet-50/50 ${di % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                          <td className="px-3 py-2 text-slate-700 max-w-[160px] truncate" title={d.demanda}>{d.demanda}</td>
                                          <td className="px-3 py-2 text-center text-slate-600 whitespace-nowrap">{d.data_atribuicao}</td>
                                          <td className="px-3 py-2 text-slate-500 max-w-[140px] truncate" title={d.situacao}>{d.situacao}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  );
                })}
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

      {/* ===== PRODUTIVIDADE MÊS A MÊS ===== */}
      {(produtividadeTecnico.tecnicos.length > 0 || produtividadeConferencista.conferencistas.length > 0) && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Activity className="w-5 h-5 text-[#1351B4]" />
            <h2 className="text-base font-bold text-slate-800">Produtividade Mês a Mês</h2>
            <span className="text-xs text-slate-400">(Dt. Liberação → Publicação)</span>
          </div>

          {/* Legenda de cores */}
          <div className="flex flex-wrap gap-3 px-1 text-xs text-slate-600">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-400 inline-block"></span>Liberadas</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-fuchsia-400 inline-block"></span>Publicadas</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-400 inline-block"></span>Concluídas</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-200 border border-green-400 inline-block"></span>≤30d (ótimo)</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-200 border border-amber-400 inline-block"></span>31-60d (atenção)</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-200 border border-red-400 inline-block"></span>&gt;60d (crítico)</div>
          </div>

          {/* ── PRODUTIVIDADE POR TÉCNICO ── */}
          {produtividadeTecnico.tecnicos.length > 0 && (
            <CollapsibleCard
              id="produtividadeTecnico"
              title="Produtividade por Técnico — Mês a Mês"
              icon={Activity}
              count={produtividadeTecnico.tecnicos.length}
              color="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900"
              collapsed={collapsedCards.produtividadeTecnico}
              toggle={() => toggle('produtividadeTecnico')}
            >
              <div className="space-y-3">
                {produtividadeTecnico.tecnicos.map((tec, idx) => {
                  const isExp = expandedProdTecnicos.has(tec.nome);
                  return (
                    <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <button
                        onClick={() => setExpandedProdTecnicos(prev => { const n = new Set(prev); if (n.has(tec.nome)) n.delete(tec.nome); else n.add(tec.nome); return n; })}
                        className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100/70 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isExp ? <ChevronDown className="w-4 h-4 text-blue-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                          <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs uppercase flex-shrink-0">{tec.nome.charAt(0)}</div>
                          <span className="text-sm font-bold text-slate-800 truncate">{tec.nome}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold text-xs whitespace-nowrap">{tec.totLib} lib.</span>
                          <span className="bg-fuchsia-100 text-fuchsia-700 px-2 py-0.5 rounded-full font-semibold text-xs whitespace-nowrap">{tec.totPub} pub.</span>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-xs whitespace-nowrap ${tec.taxa >= 70 ? 'bg-green-100 text-green-700' : tec.taxa >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{tec.taxa}%</span>
                          {tec.medGeral !== null && (
                            <span className={`px-2 py-0.5 rounded-full font-bold text-xs whitespace-nowrap ${tec.medGeral <= 30 ? 'bg-green-100 text-green-700' : tec.medGeral <= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>⌀{tec.medGeral}d</span>
                          )}
                        </div>
                      </button>
                      <AnimatePresence initial={false}>
                        {isExp && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                            <ProdutividadeTable rows={tec.meses} colorClass="bg-blue-700" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </CollapsibleCard>
          )}

          {/* ── PRODUTIVIDADE POR CONFERENCISTA ── */}
          {produtividadeConferencista.conferencistas.length > 0 && (
            <CollapsibleCard
              id="produtividadeConferencista"
              title="Produtividade por Conferencista — Mês a Mês"
              icon={Activity}
              count={produtividadeConferencista.conferencistas.length}
              color="bg-gradient-to-r from-violet-600 to-violet-800 hover:from-violet-700 hover:to-violet-900"
              collapsed={collapsedCards.produtividadeConferencista}
              toggle={() => toggle('produtividadeConferencista')}
            >
              <div className="space-y-3">
                {produtividadeConferencista.conferencistas.map((conf, idx) => {
                  const isExp = expandedProdConfs.has(conf.nome);
                  return (
                    <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <button
                        onClick={() => setExpandedProdConfs(prev => { const n = new Set(prev); if (n.has(conf.nome)) n.delete(conf.nome); else n.add(conf.nome); return n; })}
                        className="w-full flex items-center justify-between px-4 py-3 bg-violet-50 hover:bg-violet-100/70 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isExp ? <ChevronDown className="w-4 h-4 text-violet-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-violet-500 flex-shrink-0" />}
                          <div className="w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center text-white font-bold text-xs uppercase flex-shrink-0">{conf.nome.charAt(0)}</div>
                          <span className="text-sm font-bold text-slate-800 truncate">{conf.nome}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-semibold text-xs whitespace-nowrap">{conf.totLib} lib.</span>
                          <span className="bg-fuchsia-100 text-fuchsia-700 px-2 py-0.5 rounded-full font-semibold text-xs whitespace-nowrap">{conf.totPub} pub.</span>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-xs whitespace-nowrap ${conf.taxa >= 70 ? 'bg-green-100 text-green-700' : conf.taxa >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{conf.taxa}%</span>
                          {conf.medGeral !== null && (
                            <span className={`px-2 py-0.5 rounded-full font-bold text-xs whitespace-nowrap ${conf.medGeral <= 30 ? 'bg-green-100 text-green-700' : conf.medGeral <= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>⌀{conf.medGeral}d</span>
                          )}
                        </div>
                      </button>
                      <AnimatePresence initial={false}>
                        {isExp && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                            <ProdutividadeTable rows={conf.meses} colorClass="bg-violet-700" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </CollapsibleCard>
          )}
        </div>
      )}

      {/* ===== CLASSIFICAÇÕES ===== */}
      <div className="mt-2 space-y-4">
        <div className="flex items-center gap-2 px-1">
          <BarChart3 className="w-5 h-5 text-[#1351B4]" />
          <h2 className="text-base font-bold text-slate-800">Classificações das Demandas</h2>
          <span className="text-xs text-slate-400">({filtered.length} registros filtrados)</span>
        </div>

        <CollapsibleCard id="classClassif" title="Classificação da Emenda / Demanda" icon={Tag} count={classClassif.length} color="bg-gradient-to-r from-[#1351B4] to-[#0C326F] hover:from-[#0C326F] hover:to-[#1351B4]" collapsed={collapsedCards.classClassif} toggle={() => toggle('classClassif')}>
          {classClassif.length > 0
            ? <HorizontalBar items={classClassif} colorFrom="from-[#1351B4]" colorTo="to-[#2670E8]" />
            : <p className="text-slate-500 text-center py-8">Sem dados</p>}
        </CollapsibleCard>

        <CollapsibleCard id="classTipo" title="Tipo de Formalização" icon={FileText} count={classTipo.length} color="bg-gradient-to-r from-violet-600 to-violet-800 hover:from-violet-700 hover:to-violet-900" collapsed={collapsedCards.classTipo} toggle={() => toggle('classTipo')}>
          {classTipo.length > 0
            ? <HorizontalBar items={classTipo} colorFrom="from-violet-500" colorTo="to-violet-700" />
            : <p className="text-slate-500 text-center py-8">Sem dados</p>}
        </CollapsibleCard>

        <CollapsibleCard id="classObjeto" title="Objeto" icon={Briefcase} count={classObjeto.length} color="bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900" collapsed={collapsedCards.classObjeto} toggle={() => toggle('classObjeto')}>
          {classObjeto.length > 0
            ? <HorizontalBar items={classObjeto} colorFrom="from-emerald-500" colorTo="to-emerald-700" />
            : <p className="text-slate-500 text-center py-8">Sem dados</p>}
        </CollapsibleCard>

        <CollapsibleCard id="classPortfolio" title="Portfólio" icon={Layers} count={classPortfolio.length} color="bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800" collapsed={collapsedCards.classPortfolio} toggle={() => toggle('classPortfolio')}>
          {classPortfolio.length > 0
            ? <HorizontalBar items={classPortfolio} colorFrom="from-amber-400" colorTo="to-amber-600" />
            : <p className="text-slate-500 text-center py-8">Sem dados</p>}
        </CollapsibleCard>

        <CollapsibleCard id="classRecurso" title="Recurso" icon={Wallet} count={classRecurso.length} color="bg-gradient-to-r from-sky-600 to-sky-800 hover:from-sky-700 hover:to-sky-900" collapsed={collapsedCards.classRecurso} toggle={() => toggle('classRecurso')}>
          {classRecurso.length > 0
            ? <HorizontalBar items={classRecurso} colorFrom="from-sky-500" colorTo="to-sky-700" />
            : <p className="text-slate-500 text-center py-8">Sem dados</p>}
        </CollapsibleCard>

        <CollapsibleCard id="classAreaEstagio" title="Área / Estágio" icon={MapPin} count={classArea.length} color="bg-gradient-to-r from-rose-600 to-rose-800 hover:from-rose-700 hover:to-rose-900" collapsed={collapsedCards.classAreaEstagio} toggle={() => toggle('classAreaEstagio')}>
          {/* Botão PROCX */}
          <div className="mb-4 flex flex-col gap-2">
            <button
              onClick={handleProcxAreaEstagio}
              disabled={procxRunning}
              className="flex items-center gap-2 self-start px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${procxRunning ? 'animate-spin' : ''}`} />
              {procxRunning ? 'Atualizando...' : 'PROCX: Preencher Área/Estágio via Situação SemPapel'}
            </button>
            {procxMsg && (
              <p className={`text-sm rounded-lg px-3 py-2 ${
                procxMsg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>{procxMsg.text}</p>
            )}
          </div>
          {classArea.length > 0
            ? <HorizontalBar items={classArea} colorFrom="from-rose-500" colorTo="to-rose-700" />
            : <p className="text-slate-500 text-center py-8">Sem dados</p>}
        </CollapsibleCard>
      </div>
    </div>
  );
}
