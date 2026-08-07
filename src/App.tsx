/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { deriveAreaEstagio } from './utils/areaEstagio';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Calendar, 
  User, 
  DollarSign, 
  ChevronRight, 
  MoreVertical,
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowLeft,
  Upload,
  Database as DbIcon,
  ExternalLink,
  Info,
  LogOut,
  Shield,
  Settings,
  BarChart3,
  RefreshCw,
  Users,
  Check,
  ClipboardList,
  FileSearch,
  Send,
  PenLine,
  BookOpen,
  Bell,
  CheckSquare,
  XCircle,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Lock,
  Download,
  Menu,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useAuth } from './AuthContext';
import { DashboardTecnico } from './DashboardTecnico';
import { UserManagementPanel } from './UserManagementPanel';
import { AdminSidebar } from './components/AdminSidebar';
// EmendasDataTable removido - sistema usa somente Formalização
import logo1Img from './img/BRASAO-3-texto-branco.png';

// ===== CSV Import mapping =====
const CSV_TO_EMENDAS_MAP: Record<string, string> = {
  'Detalhes da Demanda': 'detalhes', 'Natureza': 'natureza', 'Ano Referência': 'ano_refer',
  'Código/Nº Emenda': 'codigo_num', 'Nº Emenda Agregadora': 'num_emenda', 'Parecer LDO': 'parecer_ld',
  'Situação Emenda': 'situacao_e', 'Situação Demanda': 'situacao_d',
  'Data da Última Tramitação Emenda': 'data_ult_e', 'Data da Última Tramitação Demanda': 'data_ult_d',
  'Nº da Indicação': 'num_indicacao', 'Parlamentar': 'parlamentar', 'Partido': 'partido',
  'Tipo Beneficiário': 'tipo_beneficiario', 'Beneficiário': 'beneficiario', 'CNPJ': 'cnpj',
  'Município': 'municipio', 'Objeto': 'objeto', 'Órgão Entidade/Responsável': 'orgao_entidade',
  'Regional': 'regional', 'Nº de Convênio': 'num_convenio', 'Nº de Processo': 'num_processo',
  'Assinatura': 'data_assinatura', 'Publicação': 'data_publicacao', 'Agência': 'agencia', 'Conta': 'conta',
  'Valor': 'valor', 'Valor da Demanda': 'valor_desembolsado', 'Portfólio': 'portfolio',
  'Qtd. Dias na Etapa': 'qtd_dias', 'Vigência': 'vigencia',
  'Data da Primeira Notificação LOA Recebida pelo Beneficiário': 'data_prorrogacao',
  'Dados Bancários': 'dados_bancarios', 'Status do Pagamento': 'status',
  'Data do Pagamento': 'data_pagamento', 'Nº do Código Único': 'num_codigo',
  'Notas e Empenho': 'notas_empenho', 'Valor Total Empenho': 'valor_total_empenhado',
  'Notas de Lançamento': 'notas_liquidacao', 'Valor Total Lançamento': 'valor_total_liquidado',
  'Programações Desembolso': 'programa', 'Valor Total Programação Desembolso': 'valor_total_pago',
  'Ordem Bancária': 'ordem_bancaria', 'Data pagamento Ordem Bancária': 'data_paga',
  'Valor Total Ordem Bancária': 'valor_total_ordem_bancaria',
};

// Mapa normalizado (sem acento, lowercase) para fallback quando o header do CSV
// tiver encoding diferente (ex: 'Codigo/N° Emenda' em vez de 'Código/Nº Emenda')
function normalizeHeader(h: string): string {
  return h.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
// Verdadeiro quando a demanda est\u00e1 pronta para o admin atribuir um conferencista:
// ou o t\u00e9cnico clicou em "Demanda Analisada" (grava data_liberacao_conferencia), ou
// a \u00c1rea \u2013 Est\u00e1gio j\u00e1 foi definida manualmente para "EM CONFER\u00caNCIA" (com ou sem
// sufixo Fundo a Fundo) \u2014 as duas formas contam, pois o t\u00e9cnico pode chegar nesse
// est\u00e1gio direto pelo select em vez do bot\u00e3o. Em ambos os casos, deixa de valer
// assim que o admin atribui o conferencista (campo `conferencista` preenchido).
function isLiberadoParaConferencia(f: {
  data_liberacao_conferencia?: string | null;
  area_estagio_situacao_demanda?: string | null;
  conferencista?: string | null;
} | null | undefined): boolean {
  if (!f) return false;
  if ((f.conferencista ?? '').toString().trim() !== '') return false; // j\u00e1 atribu\u00eddo a um conferencista
  if ((f.data_liberacao_conferencia ?? '').toString().trim() !== '') return true;
  const estagio = (f.area_estagio_situacao_demanda ?? '').toString().trim().toUpperCase();
  return estagio.startsWith('EM CONFER\u00caNCIA');
}
const CSV_NORMALIZED_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(CSV_TO_EMENDAS_MAP).map(([k, v]) => [normalizeHeader(k), v])
);
const NUMERIC_COLUMNS = new Set(['valor', 'valor_desembolsado', 'valor_total_empenhado', 'valor_total_liquidado', 'valor_total_pago', 'valor_total_ordem_bancaria']);
const INTEGER_COLUMNS = new Set(['qtd_dias']);
// Campos de tramitação da demanda que o backend propaga para as demais linhas com o
// mesmo `demanda` (emendas agregadoras). Usado aqui só para refletir a propagação no
// cache local sem esperar um refetch. ⚠️ Manter sincronizado com ANALISE_FIELDS em
// functions/api/formalizacao/[id].ts e PROPAGATE_FIELDS em server.ts.
const PROPAGATE_TO_GRUPO_FIELDS = [
  'situacao_analise_demanda', 'data_analise_demanda', 'area_estagio_situacao_demanda',
  'area_estagio', 'motivo_retorno_diligencia', 'data_retorno_diligencia',
  'data_retorno', 'observacao_motivo_retorno', 'observacao_analise_demanda', 'data_liberacao_conferencia',
  'data_liberacao_assinatura', 'data_liberacao_assinatura_conferencista', 'data_recebimento_demanda',
  'falta_assinatura', 'assinatura', 'publicacao', 'vigencia', 'encaminhado_em', 'concluida_em',
];
function parseBRNumber(val: string): number {
  if (!val || !/^[0-9.,]+$/.test(val.trim())) return 0;
  return parseFloat(val.trim().replace(/\./g, '').replace(',', '.')) || 0;
}
// Compara emenda normalizando pontos: suporta "2026.005.80418", "202600580418" e "80418"
function matchEmendaValue(stored: any, search: string): boolean {
  if (!stored || !search) return false;
  const storedStr = String(stored).toLowerCase();
  const searchStr = search.toLowerCase().trim();
  if (storedStr.includes(searchStr)) return true;
  const storedDigits = storedStr.replace(/\D/g, '');
  const searchDigits = searchStr.replace(/\D/g, '');
  return searchDigits.length > 0 && storedDigits.includes(searchDigits);
}

function mapCsvRowToEmendas(row: Record<string, string>): Record<string, any> | null {
  const mapped: Record<string, any> = {};
  for (const [csvHeader, val] of Object.entries(row)) {
    // 1. Exact match
    let dbColumn = CSV_TO_EMENDAS_MAP[csvHeader];
    // 2. Normalized fallback (handles encoding/accent differences)
    if (dbColumn === undefined) {
      dbColumn = CSV_NORMALIZED_MAP[normalizeHeader(csvHeader)];
    }
    if (dbColumn === undefined) continue;
    if (val === undefined || val === null) continue;
    if (NUMERIC_COLUMNS.has(dbColumn)) mapped[dbColumn] = parseBRNumber(val);
    else if (INTEGER_COLUMNS.has(dbColumn)) mapped[dbColumn] = /^\d+$/.test(val.trim()) ? parseInt(val.trim(), 10) : 0;
    else mapped[dbColumn] = val;
  }
  if (!mapped.codigo_num || String(mapped.codigo_num).trim() === '') return null;
  // Se "Valor da Demanda" for 0 ou ausente, herda o valor de "Valor"
  if ((!mapped.valor_desembolsado || mapped.valor_desembolsado === 0) && mapped.valor) {
    mapped.valor_desembolsado = mapped.valor;
  }
  return mapped;
}

// 🎯 Componente MultiSelectFilter com busca
interface MultiSelectFilterProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  searchPlaceholder?: string;
  hideEmpty?: boolean;
  onHideEmptyChange?: (hideEmpty: boolean) => void;
}

function MultiSelectFilter({ 
  label, 
  options, 
  selectedValues, 
  onSelectionChange,
  searchPlaceholder = "Buscar...",
  hideEmpty = false,
  onHideEmptyChange
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Filtrar opções por busca e por campos vazios
  let filteredOptions = options.filter(opt => {
    const searchMatch = opt.toLowerCase().includes(searchTerm.toLowerCase());
    const notEmpty = !hideEmpty || (opt && opt.trim() !== '' && opt !== '—');
    return searchMatch && notEmpty;
  });

  // Toggle seleção
  const toggleSelection = (value: string) => {
    if (selectedValues.includes(value)) {
      onSelectionChange(selectedValues.filter(v => v !== value));
    } else {
      onSelectionChange([...selectedValues, value]);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <label className="text-xs font-bold text-black uppercase mb-2 flex items-center justify-between block">
        <span>{label}</span>
        <span className="text-xs font-normal text-gray-600">({options.length})</span>
      </label>

      {/* Campo principal com seleções */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/20 outline-none transition-all cursor-pointer bg-white min-h-10 flex flex-wrap gap-1 items-center text-gray-900"
      >
        {selectedValues.length === 0 ? (
          <span className="text-gray-400">Selecione...</span>
        ) : (
          selectedValues.map(val => (
            <span
              key={val}
              className="text-xs px-2 py-1 rounded-full flex items-center gap-1 font-bold border bg-blue-50 text-blue-900 border-[#1351B4]/30"
            >
              {val}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelection(val);
                }}
                className="rounded-full p-0.5 hover:bg-gray-300 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
        {selectedValues.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectionChange([]);
              setSearchTerm('');
            }}
            className="ml-auto transition-colors text-[#1351B4] hover:text-[#0C326F]"
            title="Limpar seleção"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown com opções */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl"
        >
          {/* Input de busca */}
          <div className="p-2 border-b border-gray-100 space-y-2">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/20 outline-none text-gray-900 bg-white transition-all"
              onClick={(e) => e.stopPropagation()}
            />
            {/* Opção Ocultar Campos Vazios */}
            {onHideEmptyChange && (
              <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  checked={hideEmpty}
                  onChange={(e) => onHideEmptyChange(e.target.checked)}
                  className="rounded cursor-pointer accent-[#1351B4]"
                />
                <span className="text-gray-600 font-medium">Ocultar vazios</span>
              </label>
            )}
          </div>

          {/* Lista de opções */}
          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-sm text-gray-400 text-center">
                Nenhuma opção encontrada
              </div>
            ) : (
              <>
                <label className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 border-b border-gray-100 font-medium">
                  <input
                    type="checkbox"
                    checked={filteredOptions.length > 0 && filteredOptions.every(o => selectedValues.includes(o))}
                    ref={el => { if (el) el.indeterminate = filteredOptions.some(o => selectedValues.includes(o)) && !filteredOptions.every(o => selectedValues.includes(o)); }}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onSelectionChange([...selectedValues, ...filteredOptions.filter(o => !selectedValues.includes(o))]);
                      } else {
                        onSelectionChange(selectedValues.filter(v => !filteredOptions.includes(v)));
                      }
                    }}
                    className="rounded cursor-pointer accent-[#1351B4]"
                  />
                  <span>Selecionar todos</span>
                </label>
                {filteredOptions.map(option => (
                  <label
                    key={option}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(option)}
                      onChange={() => toggleSelection(option)}
                      className="rounded cursor-pointer accent-[#1351B4]"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </>
            )}
          </div>

          {/* Botões de ação */}
          <div className="border-t border-gray-100 p-2 flex gap-2">
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 px-3 py-1.5 text-xs font-bold text-white bg-[#1351B4] rounded-lg transition-all hover:bg-[#0C326F]"
            >
              Fechar
            </button>
            {selectedValues.length > 0 && (
              <button
                onClick={() => {
                  onSelectionChange([]);
                  setSearchTerm('');
                }}
                className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all text-[#1351B4] hover:bg-blue-50"
              >
                Limpar
              </button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// 🗓️ Componente MultiSelectDateFilter com busca de datas
interface MultiSelectDateFilterProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  hideEmpty?: boolean;
  onHideEmptyChange?: (hideEmpty: boolean) => void;
}

function MultiSelectDateFilter({ 
  label, 
  options, 
  selectedValues, 
  onSelectionChange,
  hideEmpty = false,
  onHideEmptyChange
}: MultiSelectDateFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredOptions = options.filter(opt => {
    const searchMatch = opt.toLowerCase().includes(searchTerm.toLowerCase());
    const notEmpty = !hideEmpty || (opt && opt.trim() !== '' && opt !== '—');
    return searchMatch && notEmpty;
  });

  const toggleSelection = (value: string) => {
    if (selectedValues.includes(value)) {
      onSelectionChange(selectedValues.filter(v => v !== value));
    } else {
      onSelectionChange([...selectedValues, value]);
    }
  };

  // Formatar fecha para exibição
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return dateStr.split('-').reverse().join('/');
  };

  return (
    <div ref={dropdownRef} className="relative">
      <label className="text-xs font-bold text-black uppercase mb-2 flex items-center justify-between block">
        <span>{label}</span>
        <span className="text-xs font-normal text-gray-600">({options.length})</span>
      </label>

      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl cursor-pointer bg-white min-h-10 flex flex-wrap gap-1 items-center text-gray-900"
      >
        {selectedValues.length === 0 ? (
          <span className="text-gray-600">Selecione...</span>
        ) : (
          selectedValues.map(val => (
            <span
              key={val}
              className="text-xs px-2 py-1 rounded-full flex items-center gap-1 font-bold border bg-blue-50 text-blue-900 border-[#1351B4]"
            >
              {formatDate(val)}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelection(val);
                }}
                className="rounded-full p-0.5 hover:bg-gray-300 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
        {selectedValues.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectionChange([]);
              setSearchTerm('');
            }}
            className="ml-auto transition-colors text-[#1351B4] hover:text-[#0C326F]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl"
        >
          <div className="p-2 border-b border-gray-100 space-y-2">
            <input
              type="text"
              placeholder="Buscar data (DD/MM/YYYY)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/20 outline-none text-gray-900 bg-white transition-all"
              onClick={(e) => e.stopPropagation()}
            />
            {/* Opção Ocultar Campos Vazios */}
            {onHideEmptyChange && (
              <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  checked={hideEmpty}
                  onChange={(e) => onHideEmptyChange(e.target.checked)}
                  className="rounded cursor-pointer accent-[#1351B4]"
                />
                <span className="text-gray-600 font-medium">Ocultar vazios</span>
              </label>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-sm text-gray-400 text-center">
                Nenhuma data encontrada
              </div>
            ) : (
              <>
                <label className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 border-b border-gray-100 font-medium">
                  <input
                    type="checkbox"
                    checked={filteredOptions.length > 0 && filteredOptions.every(o => selectedValues.includes(o))}
                    ref={el => { if (el) el.indeterminate = filteredOptions.some(o => selectedValues.includes(o)) && !filteredOptions.every(o => selectedValues.includes(o)); }}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onSelectionChange([...selectedValues, ...filteredOptions.filter(o => !selectedValues.includes(o))]);
                      } else {
                        onSelectionChange(selectedValues.filter(v => !filteredOptions.includes(v)));
                      }
                    }}
                    className="rounded cursor-pointer accent-[#1351B4]"
                  />
                  <span>Selecionar todos</span>
                </label>
                {filteredOptions.map(option => (
                  <label
                    key={option}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(option)}
                      onChange={() => toggleSelection(option)}
                      className="rounded cursor-pointer accent-[#1351B4]"
                    />
                    <span>{formatDate(option)}</span>
                  </label>
                ))}
              </>
            )}
          </div>

          <div className="border-t border-gray-100 p-2 flex gap-2">
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 px-3 py-1.5 text-xs font-bold text-white bg-[#1351B4] rounded-lg transition-all hover:bg-[#0C326F]"
            >
              Fechar
            </button>
            {selectedValues.length > 0 && (
              <button
                onClick={() => {
                  onSelectionChange([]);
                  setSearchTerm('');
                }}
                className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all text-[#1351B4] hover:bg-blue-50"
              >
                Limpar
              </button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

interface Formalizacao {
  id?: number;
  seq?: string;
  ano?: string;
  parlamentar?: string;
  partido?: string;
  emenda?: string;
  emendas_agregadoras?: string;
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
  situacao_emenda?: string;
  situacao_demandas_sempapel?: string;
  area_estagio?: string;
  recurso?: string;
  parecer_ld?: string;
  tecnico?: string;
  data_liberacao?: string;
  area_estagio_situacao_demanda?: string;
  situacao_analise_demanda?: string;
  data_analise_demanda?: string;
  observacao_analise_demanda?: string;
  motivo_retorno_diligencia?: string;
  data_retorno_diligencia?: string;
  data_liberacao_conferencia?: string;
  conferencista?: string;
  data_recebimento_demanda?: string;
  data_retorno?: string;
  observacao_motivo_retorno?: string;
  data_liberacao_assinatura_conferencista?: string;
  data_liberacao_assinatura?: string;
  falta_assinatura?: string;
  assinatura?: string;
  publicacao?: string;
  vigencia?: string;
  encaminhado_em?: string;
  concluida_em?: string;
  lote?: string;
  prioridade?: string;
  usuario_atribuido_id?: number;
  historico_situacao?: {
    campo: string;
    de: string;
    para: string;
    usuario: string;
    em: string;
  }[];
}

export default function App() {
  const { user, token, logout, isAdmin, isIntermediario, isUsuario, isVisualizador } = useAuth();
  const [activeTab, setActiveTab] = useState<'formalizacao' | 'admin' | 'dashboard'>('formalizacao'); // 'admin' = Demonstrativo, 'dashboard' kept for compat
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logsData, setLogsData] = useState<any[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsBusca, setLogsBusca] = useState('');
  const [logsTipo, setLogsTipo] = useState<'auditoria'|'todos'|'atribuicoes'|'busca'>('auditoria');
  const [logsExpandedId, setLogsExpandedId] = useState<number|null>(null);
  const [logsDataInicio, setLogsDataInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [logsDataFim, setLogsDataFim] = useState(() => new Date().toISOString().slice(0, 10));
  const [logsAdminFiltro, setLogsAdminFiltro] = useState('');
  const [adminAlertas, setAdminAlertas] = useState<{id: number, tipo: string, descricao: string, data: string}[]>([]);
  const [tecnicoAlertas, setTecnicoAlertas] = useState<{id: number, tipo: string, descricao: string, data: string}[]>([]);
  const [showAlertasDropdown, setShowAlertasDropdown] = useState(false);
  // O modal de alertas só abre por clique manual no sino (onClick={() => setShowAlertaModal(true)})
  // — não abre mais sozinho ao carregar o sistema.
  const [showAlertaModal, setShowAlertaModal] = useState(false);
  const dismissAlertaModal = () => setShowAlertaModal(false);
  const [refreshProgress, setRefreshProgress] = useState<{ active: boolean; loaded: number; total: number; startTime: number } | null>(null);

  // ── Sistema de Notificações de Atribuição ─────────────────────────────────
  type NotifItem = {
    id: number; tipo: 'tecnico' | 'conferencista'; usuario_id: number; usuario_nome: string;
    admin_nome: string; formalizacao_ids: number[]; demandas: string[];
    total_demandas: number; data_atribuicao: string;
    confirmado: boolean; confirmado_em: string | null; observacao: string | null; lida: boolean;
  };
  const [notifPendentes, setNotifPendentes] = useState<NotifItem[]>([]);
  const [notifTodas, setNotifTodas] = useState<NotifItem[]>([]);
  const [showNotifModal, setShowNotifModal] = useState(false);       // Modal para técnico confirmar
  const [showNotifAdminModal, setShowNotifAdminModal] = useState(false); // Painel admin
  const [confirmandoNotifId, setConfirmandoNotifId] = useState<number | null>(null);
  const [notifObservacao, setNotifObservacao] = useState('');
  const notifModalShownRef = useRef<Set<number>>(new Set());
  const [notifFiltroAba, setNotifFiltroAba] = useState<'todas' | 'pendentes' | 'confirmadas'>('pendentes');
  const [notifExpandedId, setNotifExpandedId] = useState<number | null>(null);
  const [notifFiltroResponsavel, setNotifFiltroResponsavel] = useState<string | null>(null);
  const [notifSearchResp, setNotifSearchResp] = useState('');
  const [notifSidebarStatus, setNotifSidebarStatus] = useState<'todos' | 'pendentes' | 'confirmados'>('todos');
  const [showMinhasAtribuicoesModal, setShowMinhasAtribuicoesModal] = useState(false);
  const [minhasAtrFiltro, setMinhasAtrFiltro] = useState<'todas' | 'pendentes' | 'confirmadas'>('pendentes');
  // ─────────────────────────────────────────────────────────────────────────

  // emendas removido do frontend - dados apenas no Supabase
  const [formalizacoes, setFormalizacoes] = useState<Formalizacao[]>(() => {
    // Inicializar state com localStorage para exibição imediata enquanto carrega
    try {
      const saved = localStorage.getItem('formalizacoes_cache');
      const savedTime = localStorage.getItem('formalizacoes_cache_time');
      if (saved && savedTime && Date.now() - parseInt(savedTime) < 30 * 60 * 1000) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 100) return parsed as Formalizacao[];
      }
    } catch (e) {}
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [isFormalizacaoFormOpen, setIsFormalizacaoFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'parsing' | 'uploading' | 'backing-up' | 'syncing' | 'done' | 'error'>('idle');
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuPortalRef = useRef<HTMLDivElement>(null);
  const columnMenuBtnRef = useRef<HTMLButtonElement>(null);
  const columnMenuPanelRef = useRef<HTMLDivElement>(null);
  const editFormRef = useRef<HTMLFormElement>(null);
  const liberarConferenciaInputRef = useRef<HTMLInputElement>(null);
  // Quando true, o próximo submit do formulário salva sem fechar o modal
  // (usado pelos botões de ação rápida: Demanda Analisada, Liberação Conferência, Remover)
  const keepFormOpenAfterSaveRef = useRef(false);
  // Guarda contra respostas de rede fora de ordem: se o técnico salvar o mesmo
  // registro várias vezes rapidamente, a resposta de um PUT mais antigo pode
  // chegar DEPOIS de um mais novo e sobrescrever o cache local com dado velho
  // (o banco fica certo, mas a tela/localStorage ficava com valor antigo até
  // recarregar a página). Só aplicamos a resposta do servidor se ela ainda for
  // a mais recente submissão para aquele registro.
  const latestSubmitSeqRef = useRef<Map<number, number>>(new Map());
  const [columnMenuPos, setColumnMenuPos] = useState<{ top: number; right: number } | null>(null);
  // Atualizar campos formalização states
  const [isUpdateCamposOpen, setIsUpdateCamposOpen] = useState(false);
  const [updateCamposStatus, setUpdateCamposStatus] = useState<'idle' | 'parsing' | 'uploading' | 'backing-up' | 'done' | 'error'>('idle');
  const [updateCamposProgress, setUpdateCamposProgress] = useState(0);
  const [updateCamposMessage, setUpdateCamposMessage] = useState('');
  const [updateCamposError, setUpdateCamposError] = useState('');
  const fileInputUpdateCamposRef = useRef<HTMLInputElement>(null);
  const [isSupabaseGuideOpen, setIsSupabaseGuideOpen] = useState(false);
  const [editingFormalizacao, setEditingFormalizacao] = useState<Formalizacao | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveErrorToast, setSaveErrorToast] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isBuscaListaOpen, setIsBuscaListaOpen] = useState(false);
  // Header compacto (telas estreitas): busca vira ícone que expande um dropdown ao clicar
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [buscaListaText, setBuscaListaText] = useState('');
  // Lista de termos já aplicados (separados por vírgula/quebra/ponto-e-vírgula)
  const [buscaListaTerms, setBuscaListaTerms] = useState<string[]>([]);
  // Filtro por intervalo de data de liberação
  const [dataInicioFilter, setDataInicioFilter] = useState('');
  const [dataFimFilter, setDataFimFilter] = useState('');
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(() => localStorage.getItem('formalizacao_last_update'));
  const [selectedFormalizacao, setSelectedFormalizacao] = useState<Formalizacao | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [lastDataUpdate, setLastDataUpdate] = useState<Date | null>(() => {
    // Inicializar com o timestamp do cache do localStorage se existir
    const t = localStorage.getItem('formalizacoes_cache_time');
    return t ? new Date(Number(t)) : null;
  });
  // Data/hora da última importação real de emendas (server-side, compartilhada por todos
  // os usuários) — diferente de lastDataUpdate, que só reflete quando ESTE navegador
  // buscou dados (podia mostrar "agora" mesmo sem nenhuma importação nova ter ocorrido).
  const [ultimaImportacao, setUltimaImportacao] = useState<{ em: string; usuario: string | null } | null>(null);
  const [paginaAtual, setPaginaAtual] = useState(0);
  const [itensPorPagina] = useState(500); // Paginação de 500, mas filtros aplicados aos 37k completos
  const [visibleColumns, setVisibleColumns] = useState({
    seq: true,
    ano: true,
    parlamentar: true,
    partido: true,
    emenda: true,
    emendas_agregadoras: true,
    demanda: true,
    demandas_formalizacao: true,
    numero_convenio: true,
    classificacao_emenda_demanda: true,
    tipo_formalizacao: true,
    regional: true,
    municipio: true,
    conveniado: true,
    objeto: true,
    portfolio: true,
    valor: true,
    situacao_emenda: true,
    situacao_demandas_sempapel: true,
    area_estagio: true,
    recurso: true,
    parecer_ld: true,
    tecnico: true,
    data_liberacao: true,
    area_estagio_situacao_demanda: true,
    situacao_analise_demanda: true,
    data_analise_demanda: true,
    motivo_retorno_diligencia: true,
    data_retorno_diligencia: true,
    conferencista: true,
    data_recebimento_demanda: true,
    data_retorno: true,
    observacao_motivo_retorno: true,
    data_liberacao_assinatura_conferencista: true,
    data_liberacao_assinatura: true,
    falta_assinatura: true,
    assinatura: true,
    publicacao: true,
    vigencia: true,
    encaminhado_em: true,
    concluida_em: true,
    lote: true,
    prioridade: true
  });
  const [formalizacaoSearchResult, setFormalizacaoSearchResult] = useState<any>({
    data: [],
    total: 0,
    page: 0,
    hasMore: false,
    loading: false
  });
  const [cacheStatus, setCacheStatus] = useState<{ status: 'loading' | 'ready' | 'error', message?: string, records?: number, duration?: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const adminMenuRef = useRef<HTMLDivElement>(null);
  
  // Drag scroll states
  const [isDraggingScroll, setIsDraggingScroll] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef({ 
    isDown: false, 
    startX: 0, 
    scrollLeft: 0, 
    hasMoved: false,
    velocity: 0,
    lastX: 0,
    lastTime: 0,
    momentumAnimationId: 0
  });
  const dragStartXRef = useRef(0);

  // 🚀 Cache de batches carregados (para evitar re-fetches)
  const loadedBatchesRef = useRef<Set<number>>(new Set()); // Track quais offsets já foram carregados
  // Restaurar cache do localStorage no startup (evita 38 requests desnecessários a cada F5)
  const _localStorageCache = (() => {
    try {
      const saved = localStorage.getItem('formalizacoes_cache');
      const savedTime = localStorage.getItem('formalizacoes_cache_time');
      if (saved && savedTime) {
        const age = Date.now() - parseInt(savedTime);
        if (age < 30 * 60 * 1000) { // válido por 30 min
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 100) {
            console.log(`📦 Cache restaurado do localStorage: ${parsed.length} registros (${Math.round(age / 60000)}min atrás)`);
            return { data: parsed as Formalizacao[], time: parseInt(savedTime) };
          }
        }
      }
    } catch (e) { /* localStorage pode estar cheio ou desabilitado */ }
    return { data: [] as Formalizacao[], time: 0 };
  })();
  const allDataCacheRef = useRef<Formalizacao[]>(_localStorageCache.data);
  const filteredForExportRef = useRef<Formalizacao[]>([]); // Cache dos dados filtrados (sem paginação) para exportação
  const cacheTimestampRef = useRef<number>(_localStorageCache.time);
  const CACHE_VALIDITY_MS = 30 * 60 * 1000; // Cache válido por 30 minutos (reduz requests em 6x)
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState<number>(0); // Incrementado após cada save

  // Reseta o timer de validade do cache em memória após qualquer alteração de registro.
  // Deve ser chamado SEMPRE que allDataCacheRef.current for modificado por um save.
  // Não persiste em localStorage: o dataset completo (~40 mil registros) sempre excede
  // a cota do navegador, então a escrita nunca é bem-sucedida — só desperdiça CPU serializando.
  const syncLocalStorageCache = () => {
    if (allDataCacheRef.current.length > 0) {
      cacheTimestampRef.current = Date.now();
    }
  };

  // Estado de ordenação e scroll de colunas
  const [sortColumn, setSortColumn] = useState<string>('ano');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const columnHeaderRefs = useRef<{ [key: string]: HTMLTableCellElement | null }>({});

  // Filtros de Formalização
  // 🎯 Estado dos filtros - campos dropdown usam arrays para múltiplas seleções
  const [filters, setFilters] = useState({
    ano: [] as string[],
    demandas_formalizacao: [] as string[],
    area_estagio: [] as string[],
    recurso: [] as string[],
    tecnico: [] as string[],
    data_liberacao: [] as string[],
    area_estagio_situacao_demanda: [] as string[],
    situacao_analise_demanda: [] as string[],
    data_analise_demanda: [] as string[],
    conferencista: [] as string[],
    data_recebimento_demanda: [] as string[],
    data_retorno: [] as string[],
    falta_assinatura: [] as string[],
    publicacao: [] as string[],
    vigencia: [] as string[],
    encaminhado_em: [] as string[],
    concluida_em: [] as string[],
    parlamentar: [] as string[],
    partido: [] as string[],
    regional: [] as string[],
    municipio: [] as string[],
    conveniado: [] as string[],
    objeto: [] as string[],
    classificacao_emenda_demanda: [] as string[],
    lote: [] as string[],
    prioridade: [] as string[],
  });

  // Estado para opções dos filtros fixos
  const [filterOptions, setFilterOptions] = useState<any>({});

  // Estado para rastrear qual filtro tem "Ocultar Vazios" ativado
  const [hideEmptyFields, setHideEmptyFields] = useState<{ [key: string]: boolean }>({});
  // Estado para rastrear qual filtro tem "Mostrar Somente Vazias" ativado
  const [showOnlyEmptyFields, setShowOnlyEmptyFields] = useState<{ [key: string]: boolean }>({});
  // Estado para ocultar demandas concluídas (padrão false para mostrar TODOS os registros)
  const [hideConcluidas, setHideConcluidas] = useState(false);
  const [showSomenteMinhas, setShowSomenteMinhas] = useState(false);
  const [fundoAFundoFilter, setFundoAFundoFilter] = useState(false);
  // Filtro rápido: mostra somente demandas que o técnico já liberou para conferência
  const [emConferenciaFilter, setEmConferenciaFilter] = useState(false);
  // Estado para larguras de colunas (redimensionamento estilo Excel)
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const resizingColRef = useRef<string | null>(null);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(0);

  // Estado do filtro de cabeçalho Excel-like
  const [headerFilterOpen, setHeaderFilterOpen] = useState<string | null>(null);
  const [headerFilterSearch, setHeaderFilterSearch] = useState('');
  const [columnTextFilters, setColumnTextFilters] = useState<{ [key: string]: string }>({});
  const [headerFilterPos, setHeaderFilterPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  // Filtros multi-select para colunas sem filterOptions do servidor
  const [headerFilters, setHeaderFilters] = useState<Record<string, string[]>>({});
  const headerFilterRef = useRef<HTMLDivElement>(null);

  // Fechar menu hamburger admin ao clicar fora
  useEffect(() => {
    if (!isAdminMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setIsAdminMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAdminMenuOpen]);

  // Fechar menu de exportação ao clicar fora
  useEffect(() => {
    if (!isExportMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node) &&
        exportMenuPortalRef.current && !exportMenuPortalRef.current.contains(event.target as Node)
      ) {
        setIsExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExportMenuOpen]);

  // Fechar painel de colunas ao clicar fora
  useEffect(() => {
    if (!isColumnMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      const btn = columnMenuBtnRef.current;
      const panel = columnMenuPanelRef.current;
      // Ignora cliques no próprio botão OU dentro do painel
      if (btn && btn.contains(event.target as Node)) return;
      if (panel && panel.contains(event.target as Node)) return;
      setIsColumnMenuOpen(false);
      setColumnMenuPos(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isColumnMenuOpen]);

  // Fechar filtro de cabeçalho ao clicar fora
  useEffect(() => {
    if (!headerFilterOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (headerFilterRef.current && !headerFilterRef.current.contains(event.target as Node)) {
        setHeaderFilterOpen(null);
      }
    }
    function handleScroll() { setHeaderFilterOpen(null); }
    document.addEventListener('mousedown', handleClickOutside);
    tableContainerRef.current?.addEventListener('scroll', handleScroll);
    const tc = tableContainerRef.current;
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      tc?.removeEventListener('scroll', handleScroll);
    };
  }, [headerFilterOpen]);

  // Mapeamento de colunas para chaves de filtro (server-side cascade)
  const columnToFilterKey: Record<string, string> = {
    ano: 'ano', parlamentar: 'parlamentar', partido: 'partido',
    demandas_formalizacao: 'demandas_formalizacao', regional: 'regional',
    municipio: 'municipio', conveniado: 'conveniado', objeto: 'objeto',
    area_estagio: 'area_estagio', recurso: 'recurso', tecnico: 'tecnico',
    data_liberacao: 'data_liberacao', area_estagio_situacao_demanda: 'area_estagio_situacao_demanda',
    situacao_analise_demanda: 'situacao_analise_demanda', data_analise_demanda: 'data_analise_demanda',
    conferencista: 'conferencista', data_recebimento_demanda: 'data_recebimento_demanda',
    data_retorno: 'data_retorno', falta_assinatura: 'falta_assinatura',
    publicacao: 'publicacao', vigencia: 'vigencia',
    encaminhado_em: 'encaminhado_em', concluida_em: 'concluida_em',
    lote: 'lote', prioridade: 'prioridade'
  };

  // Helper: obter opções de filtro para uma coluna (CASCATA - filtra dados pelos OUTROS filtros ativos)
  const getColumnFilterOptions = (colKey: string): string[] => {
    const cache = allDataCacheRef.current || [];
    if (cache.length === 0) return [];

    // Aplicar TODOS os outros filtros ativos (exceto o da coluna atual) para cascata
    const dataField = columnToDataField[colKey] || colKey;
    const currentFilterKey = columnToFilterKey[colKey];

    // Pré-computar Sets para busca por lista — criados UMA vez antes do loop de filtro
    const _gcoDigitsSet = buscaListaTerms.length > 0
      ? new Set(buscaListaTerms.map(t => t.replace(/\D/g, '')).filter(Boolean))
      : null;
    const _gcoStrSet = buscaListaTerms.length > 0
      ? new Set(buscaListaTerms.map(t => t.toLowerCase().trim()).filter(Boolean))
      : null;

    const filteredData = cache.filter((f: any) => {
      // Verificar filtros do state 'filters' (exceto o da coluna atual)
      for (const [fk, fv] of Object.entries(filters)) {
        if (fk === currentFilterKey) continue; // pular o filtro da coluna atual
        if (!Array.isArray(fv) || fv.length === 0) continue;
        const fieldVal = fk === 'area_estagio'
          ? (deriveAreaEstagio(f) || String(f[fk] || '')).toLowerCase().trim()
          : String(f[fk] || '').toLowerCase().trim();
        if (!fv.some((v: string) => fieldVal.includes(v.toLowerCase().trim()))) return false;
      }
      // Verificar headerFilters (exceto o da coluna atual)
      for (const [hk, hv] of Object.entries(headerFilters) as [string, string[]][]) {
        if (hk === colKey) continue;
        if (!hv || hv.length === 0) continue;
        const hField = columnToDataField[hk] || hk;
        const fieldVal = String(f[hField] || '').trim();
        if (hk === 'emenda') {
          if (!hv.some(sv => matchEmendaValue(f[hField], sv))) return false;
        } else {
          if (!hv.some(sv => fieldVal.toLowerCase().includes(sv.toLowerCase()))) return false;
        }
      }
      // Verificar hideEmptyFields (exceto o da coluna atual)
      for (const [field, hide] of Object.entries(hideEmptyFields)) {
        if (!hide) continue;
        if (field === dataField || field === currentFilterKey) continue;
        const val = f[field];
        if (!val || String(val).trim() === '' || String(val).trim() === '—') return false;
      }
      // Verificar searchTerm
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const match = ['parlamentar','conveniado','objeto','demanda','demandas_formalizacao','tecnico','regional','municipio','numero_convenio','area_estagio','area_estagio_situacao_demanda','conferencista']
          .some(k => (f[k] && String(f[k]).toLowerCase().includes(s)))
          || matchEmendaValue(f.emenda, searchTerm);
        if (!match) return false;
      }
      // Verificar buscaListaTerms — Set O(1) para listas grandes
      if (_gcoDigitsSet) {
        const _matchF = (fv: any): boolean => {
          if (!fv) return false;
          const s = String(fv);
          const sd = s.replace(/\D/g, '');
          if ((sd && _gcoDigitsSet.has(sd)) || _gcoStrSet!.has(s.toLowerCase().trim())) return true;
          if (buscaListaTerms.length <= 500) return buscaListaTerms.some(term => matchEmendaValue(s, term));
          return false;
        };
        if (!_matchF(f.demanda) && !_matchF(f.demandas_formalizacao) &&
            !_matchF(f.emenda) && !_matchF(f.numero_convenio)) return false;
      }
      return true;
    });

    const unique = new Set<string>();
    for (let i = 0; i < filteredData.length; i++) {
      const row = filteredData[i];
      const val = colKey === 'area_estagio'
        ? (deriveAreaEstagio(row) || row[dataField])
        : row[dataField];
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        unique.add(String(val).trim());
      }
    }
    return Array.from(unique).sort();
  };

  // Helper: obter/setar valores de filtro selecionados para qualquer coluna
  const getColumnFilterValues = (colKey: string): string[] => {
    const filterKey = columnToFilterKey[colKey];
    if (filterKey && (filters as any)[filterKey]) {
      return (filters as any)[filterKey] as string[];
    }
    return headerFilters[colKey] || [];
  };

  const setColumnFilterValues = (colKey: string, values: string[]) => {
    const filterKey = columnToFilterKey[colKey];
    if (filterKey && filterKey in filters) {
      setFilters({ ...filters, [filterKey]: values });
    } else {
      setHeaderFilters(prev => ({ ...prev, [colKey]: values }));
    }
  };

  // Mapeamento de colunas para campos de dados (para filtros de texto)
  const columnToDataField: Record<string, string> = {
    seq: 'seq', ano: 'ano', parlamentar: 'parlamentar', partido: 'partido',
    emenda: 'emenda', emendas_agregadoras: 'emendas_agregadoras', demanda: 'demanda',
    demandas_formalizacao: 'demandas_formalizacao', numero_convenio: 'numero_convenio',
    classificacao_emenda_demanda: 'classificacao_emenda_demanda', tipo_formalizacao: 'tipo_formalizacao',
    regional: 'regional', municipio: 'municipio', conveniado: 'conveniado', objeto: 'objeto',
    portfolio: 'portfolio', valor: 'valor', situacao_emenda: 'situacao_emenda',
    situacao_demandas_sempapel: 'situacao_demandas_sempapel', area_estagio: 'area_estagio',
    recurso: 'recurso', tecnico: 'tecnico',
    parecer_ld: 'parecer_ld', data_liberacao: 'data_liberacao',
    area_estagio_situacao_demanda: 'area_estagio_situacao_demanda',
    situacao_analise_demanda: 'situacao_analise_demanda', data_analise_demanda: 'data_analise_demanda',
    motivo_retorno_diligencia: 'motivo_retorno_diligencia',
    data_retorno_diligencia: 'data_retorno_diligencia', conferencista: 'conferencista',
    data_recebimento_demanda: 'data_recebimento_demanda', data_retorno: 'data_retorno',
    observacao_motivo_retorno: 'observacao_motivo_retorno',
    data_liberacao_assinatura_conferencista: 'data_liberacao_assinatura_conferencista',
    data_liberacao_assinatura: 'data_liberacao_assinatura', falta_assinatura: 'falta_assinatura',
    assinatura: 'assinatura', publicacao: 'publicacao', vigencia: 'vigencia',
    encaminhado_em: 'encaminhado_em', concluida_em: 'concluida_em',
    lote: 'lote', prioridade: 'prioridade'
  };

  // Performance: getColumnFilterOptions varre toda a base carregada (pode ser
  // dezenas de milhares de linhas) e só é usada pelo dropdown de filtro da
  // coluna ABERTA no momento. Sem memoização, ela recalculava do zero a cada
  // re-render — inclusive a cada tecla digitada na busca do dropdown, que nem
  // afeta o resultado (o filtro por texto digitado é aplicado depois, separado).
  // Result idêntico ao de chamar a função direto — só evita recomputar quando
  // nada relevante mudou (mesma coluna aberta, mesmos filtros, mesmo cache).
  // Precisa ficar DEPOIS de columnToDataField (usado dentro de getColumnFilterOptions) —
  // useMemo executa a factory na hora, diferente da chamada original que só
  // acontecia dentro do JSX, bem mais abaixo no render.
  const openColumnFilterOptions = useMemo(
    () => (headerFilterOpen ? getColumnFilterOptions(headerFilterOpen) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [headerFilterOpen, filters, headerFilters, hideEmptyFields, searchTerm, buscaListaTerms, allDataCacheRef.current]
  );

  // Estado para seleção múltipla de linhas
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  
  // Estado para modal de atribuição de técnico
  const [showAtribuirTecnicoModal, setShowAtribuirTecnicoModal] = useState(false);
  const [atribuicaoTecnico, setAtribuicaoTecnico] = useState<{id: number, nome: string} | null>(null);
  const [atribuindoTecnico, setAtribuindoTecnico] = useState(false);
  const [resetandoTeste, setResetandoTeste] = useState(false);
  const [tecnicosDisponiveis, setTecnicosDisponiveis] = useState<any[]>([]);
  // Etapas: 'select' = escolher técnico | 'confirm' = revisar conflitos antes de confirmar
  const [atribuicaoStep, setAtribuicaoStep] = useState<'select' | 'confirm'>('select');
  const [atribuicaoConflicts, setAtribuicaoConflicts] = useState<{
    jaAtribuidos: { id: number; demanda: string; tecnicoAtual: string }[];  // deduplicated for display
    semTecnico: { id: number; demanda: string }[];                           // deduplicated for display
    allIdsSemTecnico: number[];  // all IDs (incl. duplicates) for API call
    allIdsComTecnico: number[];  // all IDs (incl. duplicates) for API call
  }>({ jaAtribuidos: [], semTecnico: [], allIdsSemTecnico: [], allIdsComTecnico: [] });

  // Estado para modal de atribuição de conferencista
  const [showAtribuirConferencistaModal, setShowAtribuirConferencistaModal] = useState(false);
  const [atribuicaoConferencista, setAtribuicaoConferencista] = useState<{id: number, nome: string} | null>(null);
  const [atribuindoConferencista, setAtribuindoConferencista] = useState(false);
  const [atribuicaoConfStep, setAtribuicaoConfStep] = useState<'select' | 'confirm'>('select');
  const [atribuicaoConfConflicts, setAtribuicaoConfConflicts] = useState<{
    jaAtribuidos: { id: number; demanda: string; confAtual: string }[];  // deduplicated for display
    semConf: { id: number; demanda: string }[];                           // deduplicated for display
    allIdsSemConf: number[];   // all IDs (incl. duplicates) for API call
    allIdsComConf: number[];   // all IDs (incl. duplicates) for API call
  }>({ jaAtribuidos: [], semConf: [], allIdsSemConf: [], allIdsComConf: [] });

  // Estado para modal de lote e prioridade
  const [showAtribuirLoteModal, setShowAtribuirLoteModal] = useState(false);
  const [showDemonstrativoLote, setShowDemonstrativoLote] = useState(false);
  const [atribuindoLote, setAtribuindoLote] = useState(false);
  const [loteParaAtribuir, setLoteParaAtribuir] = useState<string>('');
  const [prioridadeParaAtribuir, setPrioridadeParaAtribuir] = useState<string>('');
  const [loteAcao, setLoteAcao] = useState<'definir'|'remover'>('definir');

  // Estado para liberar para assinatura em lote
  const [showLiberarAssinaturaModal, setShowLiberarAssinaturaModal] = useState(false);
  const [liberandoAssinatura, setLiberandoAssinatura] = useState(false);
  // Estado para edição inline de falta_assinatura
  const [inlineEditFalta, setInlineEditFalta] = useState<{id: string, value: string} | null>(null);
  const [savingFalta, setSavingFalta] = useState(false);

  // Estado para modal de deletar formalizacao com senha
  const [showDeleteFormalizacaoModal, setShowDeleteFormalizacaoModal] = useState(false);
  const [formalizacaoParaDeletar, setFormalizacaoParaDeletar] = useState<any>(null);
  const [senhaParaDeletarFormalizacao, setSenhaParaDeletarFormalizacao] = useState('');

  // Estado para modal de troca de senha
  const [showTrocarSenhaModal, setShowTrocarSenhaModal] = useState(false);
  const [trocarSenhaAtual, setTrocarSenhaAtual] = useState('');
  const [trocarNovaSenha, setTrocarNovaSenha] = useState('');
  const [trocarConfirmarSenha, setTrocarConfirmarSenha] = useState('');
  const [trocarSenhaLoading, setTrocarSenhaLoading] = useState(false);
  const [trocarSenhaErro, setTrocarSenhaErro] = useState('');
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);

  // 🎯 Carregar filtros em cascata (atualiza quando qualquer filtro muda)
  useEffect(() => {
    if (activeTab === 'formalizacao') {
      console.log('🎯 Atualizando filtros em cascata...');
      const startTime = Date.now();
      
      // Construir query string com filtros já selecionados (agora com arrays)
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        // Pular campos de data e campos vazios
        if (key.includes('_from') || key.includes('_to')) return;
        
        // Se é um array (múltiplas seleções)
        if (Array.isArray(value)) {
          if (value.length > 0) {
            // Adicionar cada valor selecionado como param
            value.forEach(v => queryParams.append(key, v));
          }
        }
        // Se é uma string normal
        else if (value && value !== '') {
          queryParams.append(key, value);
        }
      });
      
      const url = `/api/formalizacao/filters-cascata?${queryParams.toString()}`;
      
      fetch(url, { headers: getHeaders() })
        .then(r => r.json())
        .then(data => {
          const duration = Date.now() - startTime;
          console.log(`✅ Filtros cascata carregados em ${duration}ms`);
          if (data.ano && Array.isArray(data.ano)) {
            console.log(`📅 Anos disponíveis (${data.ano.length}):`, data.ano.slice(0, 5));
          }
          if (data.demandas_formalizacao && Array.isArray(data.demandas_formalizacao)) {
            console.log(`📋 Demandas disponíveis (${data.demandas_formalizacao.length}):`, data.demandas_formalizacao.slice(0, 5));
          }
          // Normaliza e deduplica opções de filtro por nome (resolve inconsistências do banco)
          // normalizeStr strips accents so "Rita De Cassia" and "Rita De Cássia" map to the same key
          const normalizeStr = (s: string) => s.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
          const deduplicateOptions = (opts: string[]): string[] => {
            if (!Array.isArray(opts)) return opts;
            const seen = new Map<string, string>();
            for (const opt of opts) {
              const key = normalizeStr(opt);
              if (!seen.has(key)) {
                seen.set(key, opt);
              } else {
                const existing = seen.get(key)!;
                // Prefere versão com mais acentos (forma correta da ortografia)
                const accentCount = (s: string) => s.length - s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').length;
                if (accentCount(opt) > accentCount(existing)) {
                  seen.set(key, opt);
                }
              }
            }
            return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
          };
          const cleanedData: any = { ...data };
          for (const key of Object.keys(cleanedData)) {
            if (Array.isArray(cleanedData[key])) {
              cleanedData[key] = deduplicateOptions(cleanedData[key]);
            }
          }
          setFilterOptions(cleanedData);
        })
        .catch(err => {
          console.error('❌ Erro ao carregar filtros em cascata:', err);
          setFilterOptions({});
        });
    }
  }, [filters, activeTab, token, hideEmptyFields, headerFilters]);

  // Log de filtros para debug
  useEffect(() => {
    const activeFilters = Object.entries(filters).filter(([, v]) => v && v !== '');
    if (activeFilters.length > 0) {
      console.log('🔍 Filtros ativos:', Object.fromEntries(activeFilters));
      console.log('📊 Total formalizações:', formalizacoes.length);
    }
  }, [filters, formalizacoes.length]);

  // Debounce para buscar formalizações com filtros quando filtros mudam
  // ⚡ REMOVIDO: Sem debounce! Aplica filtros INSTANTANEAMENTE do cache
  useEffect(() => {
    if (activeTab !== 'formalizacao') return;
    // Usar cache em memória como referência (mais confiável que o estado formalizacoes)
    if (allDataCacheRef.current.length === 0 && (!formalizacoes || formalizacoes.length === 0)) return;
    
    console.log('⚡ FILTROS MUDARAM - Aplicando instantaneamente (sem debounce)');
    setPaginaAtual(0);
    
    // Aplicar filtros IMEDIATAMENTE do cache em memória
    fetchFormalizacoesComFiltros(0);
  }, [filters, searchTerm, buscaListaTerms, dataInicioFilter, dataFimFilter, activeTab, hideEmptyFields, headerFilters, fundoAFundoFilter, emConferenciaFilter]);

  // ⚡ NOVO: Carregar TUDO o cache quando aba de formalizações abre
  // Isto roda UMA ÚNICA VEZ quando activeTab muda para 'formalizacao'
  useEffect(() => {
    if (activeTab !== 'formalizacao') return;
    
    console.log('🟢 ATIVOU ABA FORMALIZACAO! Iniciando carregamento de dados...');
    
    // Se já temos cache em memória válido, apenas reaplicar filtros sem re-fetch
    const cacheValido = allDataCacheRef.current.length > 100 && (Date.now() - cacheTimestampRef.current) < CACHE_VALIDITY_MS;
    if (cacheValido) {
      console.log(`⚡ Cache válido em memória: ${allDataCacheRef.current.length} registros, reaproveitando`);
      fetchFormalizacoesComFiltros(0);
      return;
    }
    
    console.log('🔥 FORÇANDO RECARGA COMPLETA...');
    allDataCacheRef.current = [];
    cacheTimestampRef.current = 0;
    localStorage.removeItem('formalizacoes_cache');
    localStorage.removeItem('formalizacoes_cache_time');
    
    // Carregar TUDO do servidor
    fetchFormalizacoesComFiltros(0);
  }, [activeTab]);

  // Carregar técnicos do banco de dados (usuários do sistema)
  useEffect(() => {
    if (!token) return;

    const loadTecnicos = async () => {
      try {
        console.log('📥 Carregando lista de técnicos do banco...');
        const response = await fetch('/api/formalizacao/tecnicos', {
          headers: getHeaders()
        });
        
        if (!response.ok) {
          throw new Error(`API retornou ${response.status}`);
        }

        const data = await response.json();
        console.log(`✅ ${data.tecnicos?.length || 0} técnicos carregados`);
        setTecnicosDisponiveis(data.tecnicos || []);
      } catch (error) {
        console.error('❌ Erro ao carregar técnicos:', error);
        setTecnicosDisponiveis([]);
      }
    };

    loadTecnicos();
  }, [token]);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  });

  // Helper: fazer fetch com detecção de token expirado (401 → auto logout)
  const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const response = await fetch(url, {
      ...options,
      headers: { ...getHeaders(), ...(options.headers || {}) }
    });
    if (response.status === 401) {
      console.error('⚠️ Token expirado (401). Forçando re-login...');
      logout();
      alert('Sua sessão expirou. Faça login novamente.');
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    return response;
  };

  const handleTrocarSenha = async () => {
    setTrocarSenhaErro('');
    if (!trocarSenhaAtual || !trocarNovaSenha || !trocarConfirmarSenha) {
      setTrocarSenhaErro('Preencha todos os campos.');
      return;
    }
    if (trocarNovaSenha !== trocarConfirmarSenha) {
      setTrocarSenhaErro('Nova senha e confirmação não coincidem.');
      return;
    }
    if (trocarNovaSenha.length < 6) {
      setTrocarSenhaErro('Nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setTrocarSenhaLoading(true);
    try {
      const res = await fetchWithAuth('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ senhaAtual: trocarSenhaAtual, novaSenha: trocarNovaSenha }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTrocarSenhaErro(data.error || 'Erro ao alterar senha.');
        return;
      }
      setShowTrocarSenhaModal(false);
      setTrocarSenhaAtual('');
      setTrocarNovaSenha('');
      setTrocarConfirmarSenha('');
      alert('✅ Senha alterada com sucesso!');
    } catch (err: any) {
      setTrocarSenhaErro(err.message || 'Erro ao alterar senha.');
    } finally {
      setTrocarSenhaLoading(false);
    }
  };

  // 🔥 Pré-carregar cache na inicialização
  useEffect(() => {
    const warmupCache = async () => {
      try {
        setCacheStatus({ status: 'loading', message: 'Aquecendo cache...' });
        console.log('🔥 Aquecendo cache de formalizações...');
        const response = await fetch('/api/debug/warmup-cache', {
          method: 'POST',
          headers: getHeaders()
        });
        const result = await response.json();
        console.log(`✅ Cache aquecido: ${result.records} registros em ${result.durationMs}ms`);
        setCacheStatus({ 
          status: 'ready', 
          message: `${result.records} registros carregados`, 
          records: result.records,
          duration: result.durationMs
        });
      } catch (error) {
        console.warn('⚠️ Warmup cache falhou:', error);
        setCacheStatus({ status: 'error', message: 'Erro ao carregar cache' });
      }
    };

    if (token) {
      warmupCache();
    }
  }, [token]);

  useEffect(() => {
    fetchData();
    fetch('/api/status').then(r => r.json()).then(setSupabaseStatus);
  }, [activeTab, token]);

  // Resetar paginação quando filtros mudam
  useEffect(() => {
    setPaginaAtual(0);
  }, [filters, searchTerm, buscaListaTerms, columnTextFilters, headerFilters]);

  // Recarregar dados quando filtros de texto de coluna mudam
  useEffect(() => {
    const hasAnyTextFilter = Object.values(columnTextFilters).some(v => v && v.length > 0);
    if (hasAnyTextFilter || Object.keys(columnTextFilters).length > 0) {
      const timer = setTimeout(() => fetchFormalizacoesComFiltros(0), 300);
      return () => clearTimeout(timer);
    }
  }, [columnTextFilters]);

  // Re-ordenar quando coluna/direção de sort mudam (usa cache, instantâneo)
  useEffect(() => {
    if (allDataCacheRef.current.length > 0) {
      fetchFormalizacoesComFiltros(paginaAtual);
    }
  }, [sortColumn, sortOrder]);

  // 🔍 Monitorar mudanças no visibleColumns
  useEffect(() => {
    const visibleCount = Object.values(visibleColumns).filter(Boolean).length;
    console.log(`📊 Colunas visíveis: ${visibleCount}/${Object.keys(visibleColumns).length}`, visibleColumns);
  }, [visibleColumns]);

  // 👤 Ajustar colunas visíveis baseado no role do usuário
  useEffect(() => {
    if (!user) return;

    if (user.role === 'usuario') {
      // Usuários comuns veem apenas colunas específicas
      setVisibleColumns({
        seq: false,
        ano: true,
        parlamentar: false,
        partido: false,
        emenda: true,
        emendas_agregadoras: false,
        demanda: true,
        demandas_formalizacao: false,
        numero_convenio: false,
        classificacao_emenda_demanda: true,
        tipo_formalizacao: false,
        regional: true,
        municipio: false,
        conveniado: true,
        objeto: false,
        portfolio: false,
        valor: true,
        situacao_emenda: false,
        situacao_demandas_sempapel: true,
        area_estagio: false,
        recurso: false,
        tecnico: true,
        data_liberacao: true,
        area_estagio_situacao_demanda: true,
        situacao_analise_demanda: true,
        data_analise_demanda: true,
        motivo_retorno_diligencia: true,
        data_retorno_diligencia: true,
        conferencista: true,
        data_recebimento_demanda: true,
        data_retorno: true,
        observacao_motivo_retorno: true,
        data_liberacao_assinatura_conferencista: true,
        data_liberacao_assinatura: true,
        falta_assinatura: true,
        assinatura: false,
        publicacao: false,
        vigencia: false,
        encaminhado_em: false,
        concluida_em: true,
        lote: true,
        prioridade: true
      });
      console.log('👤 Colunas ajustadas para usuário comum');
    } else if (user.role === 'admin' || user.role === 'visualizador') {
      // Administradores e visualizadores veem as mesmas colunas
      setVisibleColumns({
        seq: false,
        ano: true,
        parlamentar: true,
        partido: true,
        emenda: true,
        emendas_agregadoras: false,
        demanda: true,
        demandas_formalizacao: false,
        numero_convenio: false,
        classificacao_emenda_demanda: false,
        tipo_formalizacao: false,
        regional: false,
        municipio: false,
        conveniado: false,
        objeto: false,
        portfolio: false,
        valor: true,
        situacao_emenda: false,
        situacao_demandas_sempapel: false,
        area_estagio: false,
        recurso: false,
        tecnico: true,
        data_liberacao: true,
        area_estagio_situacao_demanda: true,
        situacao_analise_demanda: false,
        data_analise_demanda: false,
        motivo_retorno_diligencia: false,
        data_retorno_diligencia: false,
        conferencista: true,
        data_recebimento_demanda: true,
        data_retorno: false,
        observacao_motivo_retorno: false,
        data_liberacao_assinatura_conferencista: true,
        data_liberacao_assinatura: true,
        falta_assinatura: true,
        assinatura: true,
        publicacao: true,
        vigencia: true,
        encaminhado_em: true,
        concluida_em: true,
        lote: true,
        prioridade: true
      });
      console.log('🔑 Colunas ajustadas para administrador/visualizador');
    }
  }, [user]);

  // 🔔 Alertas para admin: demandas analisadas E conferidas
  // Persist seen keys in localStorage so alerts survive page reloads
  // Key format: "id:data_analise:data_lib_conf" to detect when dates CHANGE
  // Alertas vistos — persiste em localStorage para que "Limpar tudo" seja definitivo.
  // A chave inclui as datas, portanto novos alertas (datas novas/alteradas) reaparecem corretamente.
  const alertasVistosRef = useRef<Set<string>>(
    new Set<string>(JSON.parse(localStorage.getItem('alertasVistosV2') || '[]'))
  );
  const saveAlertasVistos = (keys: Set<string>) => {
    try { localStorage.setItem('alertasVistosV2', JSON.stringify([...keys])); } catch { /* quota */ }
  };
  const makeAlertKey = (f: Formalizacao) => `${f.id}:${f.data_analise_demanda || ''}:${f.data_liberacao_assinatura_conferencista || ''}`;
  useEffect(() => {
    if (!isAdmin || formalizacoes.length === 0) return;
    // Alertas: demandas com data_analise_demanda OU data_liberacao_assinatura_conferencista
    const comDatas = formalizacoes.filter(
      (f: Formalizacao) => f.data_analise_demanda || f.data_liberacao_assinatura_conferencista
    );
    const seenKeys = alertasVistosRef.current;
    const novas = comDatas.filter((f: Formalizacao) => !seenKeys.has(makeAlertKey(f)));
    if (novas.length > 0) {
      // Deduplica por demanda: emendas agregadas compartilham o mesmo número de demanda e,
      // por propagação, os mesmos campos de análise — sem isso, cada linha gerava um alerta
      // idêntico repetido (ex: "Demanda 106247" aparecendo várias vezes).
      const porDemanda = new Map<string, Formalizacao>();
      for (const f of novas) {
        const chave = String(f.demandas_formalizacao || f.demanda || f.id);
        if (!porDemanda.has(chave)) porDemanda.set(chave, f);
      }
      const novasDeduplicadas = Array.from(porDemanda.values());
      setAdminAlertas(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        // Remove old alerts for same ID (date changed) + add new
        const updatedIds = new Set(novasDeduplicadas.map(f => f.id));
        const cleaned = prev.filter(a => !updatedIds.has(a.id));
        const newAlerts = novasDeduplicadas.map((f: Formalizacao) => {
          const partes: string[] = [];
          if (f.data_analise_demanda) {
            partes.push(`Técnico: ${f.tecnico || '(n/a)'} — Data Análise: ${formatDateForDisplay(f.data_analise_demanda)}`);
          }
          if (f.data_liberacao_assinatura_conferencista) {
            partes.push(`Conferencista: ${f.conferencista || '(n/a)'} — Data Lib.: ${formatDateForDisplay(f.data_liberacao_assinatura_conferencista)}`);
          }
          return {
            id: f.id,
            tipo: f.data_analise_demanda && f.data_liberacao_assinatura_conferencista ? 'Analisada e Conferida' : f.data_analise_demanda ? 'Analisada' : 'Conferida',
            descricao: `Demanda ${f.demandas_formalizacao || f.demanda || `#${f.id}`} — ${partes.join(' | ')}`,
            data: f.data_liberacao_assinatura_conferencista || f.data_analise_demanda || ''
          };
        });
        if (newAlerts.length === 0 && cleaned.length === prev.length) return prev;
        return [...cleaned, ...newAlerts];
      });
    }
  }, [formalizacoes, isAdmin]);

  // 🔔 Alertas de Encaminhamento ao Financeiro: encaminhado_em <= hoje e não concluída
  useEffect(() => {
    if (!isAdmin || formalizacoes.length === 0) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parseD = (s: string): Date | null => {
      if (!s) return null;
      const br = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (br) return new Date(+br[3], +br[2] - 1, +br[1]);
      const iso = s.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
      return null;
    };
    const pending = formalizacoes.filter((f: Formalizacao) => {
      if (!f.encaminhado_em || String(f.encaminhado_em).trim() === '') return false;
      if (f.concluida_em && String(f.concluida_em).trim() !== '') return false;
      const encDate = parseD(f.encaminhado_em);
      if (!encDate) return false;
      encDate.setHours(0, 0, 0, 0);
      return encDate <= today;
    }).filter((f: Formalizacao) => !alertasVistosRef.current.has(`encaminhar:${f.id}:${f.encaminhado_em}`));
    if (pending.length > 0) {
      setAdminAlertas(prev => {
        const existingIds = new Set(prev.filter(a => a.tipo === 'Encaminhar ao Financeiro').map(a => a.id));
        const pendingIds = new Set(pending.map((f: Formalizacao) => f.id));
        if (existingIds.size === pendingIds.size && [...pendingIds].every(id => existingIds.has(id))) return prev;
        const cleaned = prev.filter(a => a.tipo !== 'Encaminhar ao Financeiro');
        const newAlerts = pending.map((f: Formalizacao) => ({
          id: f.id,
          tipo: 'Encaminhar ao Financeiro',
          descricao: `Demanda ${f.demandas_formalizacao || f.demanda || `#${f.id}`} — Encaminhar desde ${formatDateForDisplay(f.encaminhado_em || '')}`,
          data: f.encaminhado_em || ''
        }));
        return [...cleaned, ...newAlerts];
      });
    }
  }, [formalizacoes, isAdmin]);

  // 🔔 Alertas para técnicos: conferencista liberou assinatura na demanda do técnico
  // Alertas técnico vistos — persiste em localStorage (chave inclui id de formalizacao).
  const tecnicoAlertasVistosRef = useRef<Set<number>>(
    new Set<number>(JSON.parse(localStorage.getItem('tecnicoAlertasVistosV2') || '[]'))
  );
  const saveTecnicoAlertasVistos = (ids: Set<number>) => {
    try { localStorage.setItem('tecnicoAlertasVistosV2', JSON.stringify([...ids])); } catch { /* quota */ }
  };
  useEffect(() => {
    if (!user?.nome || formalizacoes.length === 0) return;
    const nomeUpper = user.nome.trim().toUpperCase();
    // Filtra demandas deste técnico que tiveram liberação do conferencista
    const liberadas = formalizacoes.filter(
      (f: Formalizacao) =>
        f.data_liberacao_assinatura_conferencista &&
        (f.tecnico || '').trim().toUpperCase() === nomeUpper
    );
    const seenIds = tecnicoAlertasVistosRef.current;
    const novas = liberadas.filter((f: Formalizacao) => !seenIds.has(f.id));
    if (novas.length > 0) {
      setTecnicoAlertas(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const reallyNew = novas.filter(f => !existingIds.has(f.id));
        if (reallyNew.length === 0) return prev;
        const updated = [...prev, ...reallyNew.map((f: Formalizacao) => ({
          id: f.id,
          tipo: 'Liberação Conferencista',
          descricao: `Demanda ${f.demandas_formalizacao || f.demanda || `#${f.id}`} — Conferencista: ${f.conferencista || '(n/a)'} liberou assinatura em ${formatDateForDisplay(f.data_liberacao_assinatura_conferencista || '')}${f.observacao_motivo_retorno ? ` — Obs: ${f.observacao_motivo_retorno}` : ''}`,
          data: f.data_liberacao_assinatura_conferencista || ''
        }))];
        return updated;
      });
    }
  }, [formalizacoes, user?.nome]);

  const fetchData = async () => {
    setLoading(true);
    await fetchFormalizacoes();
    setLoading(false);
  };

  const fetchFormalizacoes = async () => {
    try {
      console.log('📥 Buscando formalizações (primeiros 1000)...');
      // Requisição com LIMITE para não travar buscando 37k
      const response = await fetch('/api/formalizacao/page/0', {
        headers: getHeaders()
      });
      const result = await response.json();
      
      // O endpoint pode retornar { data, total } ou direto um array
      const data = Array.isArray(result) ? result : (result.data || []);
      
      if (Array.isArray(data) && data.length > 0) {
        console.log(`✓ Formalizações carregadas: ${data.length} registros`);
        if (data.length > 0) {
          console.log(`📅 Primeira: ${data[0].ano} - ${data[0].parlamentar || 'N/A'}`);
        }
        setFormalizacoes(data);
      } else {
        console.warn('⚠ Nenhuma formalização carregada', result);
        setFormalizacoes([]);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar formalizações:', error);
      setFormalizacoes([]);
    }
  };

  // ===== Import file handler (CSV, XLS, XLSX, XML) =====
  const BATCH_SIZE = 200;

  // Extrai rows (Record<string, string>[]) de um arquivo Excel/XML
  const parseExcelFile = (file: File): Promise<Record<string, string>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target!.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: 'array' });
          const sheetName = wb.SheetNames[0];
          const ws = wb.Sheets[sheetName];
          // Auto-detectar linha do cabeçalho: varre as primeiras 15 linhas e escolhe
          // a que tiver mais colunas reconhecidas no mapeamento CSV_NORMALIZED_MAP.
          const rawRows = XLSX.utils.sheet_to_json<(string | null | undefined)[]>(ws, { header: 1, defval: '', raw: false });
          let headerRowIndex = 0;
          let maxMatches = 0;
          for (let i = 0; i < Math.min(15, rawRows.length); i++) {
            const row = rawRows[i];
            const matches = row.filter(cell => {
              const norm = normalizeHeader(String(cell ?? ''));
              return norm.length > 0 && CSV_NORMALIZED_MAP[norm] !== undefined;
            }).length;
            if (matches > maxMatches) {
              maxMatches = matches;
              headerRowIndex = i;
              if (matches >= 10) break; // linha com 10+ colunas reconhecidas é certamente o cabeçalho
            }
          }
          const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { raw: false, defval: '', range: headerRowIndex });
          resolve(rows);
        } catch (e: any) {
          reject(new Error(`Erro ao ler arquivo Excel: ${e.message}`));
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleImportCSV = async (file: File) => {
    setImportStatus('parsing');
    setImportProgress(0); setImportTotal(0);
    setImportMessage('Lendo arquivo...'); setImportError('');
    const tk = localStorage.getItem('auth_token');
    if (!tk) { setImportStatus('error'); setImportError('Token de autenticação não encontrado'); return; }

    // Função que processa as rows já parseadas
    const processRows = async (rows: Record<string, string>[]) => {
      // 🔍 PASSO 1: Mapear e validar registros
      const mapped = rows.map(mapCsvRowToEmendas).filter((r): r is Record<string, any> => r !== null);
      
      // 🔍 PASSO 2: Deduplicar registros dentro do arquivo
      const deduped = new Map<string, Record<string, any>>();
      for (const rec of mapped) {
        const key = String(rec.codigo_num).trim();
        deduped.set(key, rec); // Última ocorrência sobrescreve a anterior
      }
      const records = Array.from(deduped.values());
      const duplicadasNoArquivo = mapped.length - records.length;
      
      if (records.length === 0) { 
        setImportStatus('error'); 
        setImportError('Nenhum registro válido encontrado no arquivo.'); 
        return; 
      }
      
      console.log(`📊 Análise do arquivo: ${rows.length} linhas → ${mapped.length} mapeadas → ${records.length} únicas (${duplicadasNoArquivo} duplicadas removidas)`);
      
      const totalBatches = Math.ceil(records.length / BATCH_SIZE);
      setImportTotal(records.length); 
      setImportStatus('uploading');
      setImportMessage(`Enviando ${records.length} registros únicos em ${totalBatches} lotes (${duplicadasNoArquivo} duplicatas removidas)...`);
      
      let uploaded = 0;
      const batchResults: any[] = [];
      
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const bn = Math.floor(i / BATCH_SIZE) + 1;
        setImportMessage(`Lote ${bn}/${totalBatches} enviando ${batch.length} registros...`);
        
        try {
          const resp = await fetch('/api/admin/import-emendas', {
            method: 'POST', 
            headers: { 'Authorization': `Bearer ${tk}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ records: batch }),
          });
          
          if (!resp.ok) { 
            const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' })); 
            setImportStatus('error'); 
            setImportError(`Erro no lote ${bn}: ${err.error || resp.statusText}`); 
            return; 
          }
          
          const result = await resp.json();
          batchResults.push(result);
          uploaded += batch.length;
          setImportProgress(Math.round((uploaded / records.length) * 90));
        } catch (e: any) { 
          setImportStatus('error'); 
          setImportError(`Erro de rede no lote ${bn}: ${e.message}`); 
          return; 
        }
      }
      
      // 💾 BACKUP antes de qualquer escrita na tabela formalizacao
      setImportStatus('backing-up');
      setImportProgress(91);
      setImportMessage('💾 Criando backup da formalização...');
      let preCount = 0; // total de formalizações antes do sync
      try {
        const bkpResp = await fetch('/api/admin/backup-formalizacao', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${tk}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (!bkpResp.ok) {
          const bkpErr = await bkpResp.json().catch(() => ({ error: 'Erro desconhecido' }));
          setImportStatus('error');
          setImportError(`Erro ao criar backup: ${bkpErr.error || bkpResp.statusText}\n\nO processo foi interrompido para proteger os dados existentes.${bkpErr.hint ? `\n\nDica: ${bkpErr.hint}` : ''}`);
          return;
        }
        const bkpResult = await bkpResp.json();
        preCount = bkpResult?.rows ?? 0;
        console.log(`✅ Backup criado: ${bkpResult.rows} registros em formalizacao_backup`);
      } catch (e: any) {
        setImportStatus('error');
        setImportError(`Erro ao criar backup: ${e.message}\n\nO processo foi interrompido para proteger os dados existentes.`);
        return;
      }

      setImportStatus('syncing'); 
      setImportProgress(92);
      setImportMessage('🔄 Sincronizando formalização (lote 1)...');
      
      try {
        const SYNC_LIMIT = 5000;
        // preCount vem do backup block acima (declarado fora do try)
        let offset = 0;
        let batchNum = 1;
        let totalInserted = 0;   // reported by SQL (may under-count if prev run timed out)
        let totalConcluded = 0;  // demandas concluídas automaticamente (Processo SIAFEM)
        let totalStaging = 0;
        let emendasCleaned = false;
        let finalFormalizacaoCount: number | null = null;

        // Loop em lotes: cada chamada processa SYNC_LIMIT emendas (< 5s cada)
        while (true) {
          const syncResp = await fetch('/api/admin/sync-emendas', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${tk}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ offset, limit: SYNC_LIMIT }),
          });

          if (!syncResp.ok) {
            const err = await syncResp.json().catch(() => ({ error: 'Erro desconhecido' }));
            setImportStatus('error');
            setImportError(`Erro na sincronização (lote ${batchNum}): ${err.error || syncResp.statusText}`);
            return;
          }

          const syncText = await syncResp.text();
          let batch: any;
          try {
            batch = JSON.parse(syncText);
          } catch {
            throw new Error(`Resposta inválida do servidor: ${syncText.substring(0, 160)}`);
          }

          const r = batch.result || batch;
          totalInserted += r.inserted || 0;
          totalConcluded += r.concluded || 0;
          if (r.total)                  totalStaging = r.total;
          if (r.emendas_cleaned)        emendasCleaned = true;
          if (r.formalizacao_count != null) finalFormalizacaoCount = r.formalizacao_count;

          if (!r.has_more) break;

          offset += SYNC_LIMIT;
          batchNum++;
          const pct = 92 + Math.min(7, Math.round((offset / Math.max(totalStaging, 1)) * 7));
          setImportProgress(pct);
          setImportMessage(`🔄 Sincronizando formalização (lote ${batchNum} | ${offset}/${totalStaging})...`);
        }

        // Inseridos = diferença real no banco (conta também inserções de lotes anteriores abortados)
        const actualInserted = finalFormalizacaoCount != null
          ? Math.max(0, finalFormalizacaoCount - preCount)
          : totalInserted;

        setImportProgress(100); 
        setImportStatus('done');
        
        const now = new Date().toISOString();
        localStorage.setItem('formalizacao_last_update', now);
        setLastUpdateTime(now);

        // Registra a importação no servidor (compartilhado por todos os usuários)
        try {
          const regResp = await fetch('/api/admin/ultima-importacao', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${tk}`, 'Content-Type': 'application/json' },
          });
          if (regResp.ok) {
            const reg = await regResp.json();
            setUltimaImportacao({ em: reg.em, usuario: reg.usuario });
          }
        } catch (e) {
          console.warn('⚠️ Falha ao registrar data/hora da importação:', e);
        }

        const totalDuplicated = batchResults.reduce((sum: number, r: any) => sum + (r.deduped || 0), 0);
        const totalImported = batchResults.reduce((sum: number, r: any) => sum + (r.imported || 0), 0);
        
        setImportMessage(
          `✅ Importação Concluída!\n` +
          `• ${totalImported} emendas processadas (UPSERT)\n` +
          `• ${totalDuplicated} registros duplicados ignorados no CSV\n` +
          `\n🔄 Sincronização:\n` +
          `• ${totalStaging} emendas no staging\n` +
          `• ${actualInserted} novas formalizações inseridas` +
          (finalFormalizacaoCount != null ? ` (total: ${finalFormalizacaoCount})` : '') +
          (totalConcluded > 0 ? `\n• ${totalConcluded} demandas concluídas automaticamente (Processo SIAFEM)` : '') +
          (emendasCleaned ? `\n\n🧹 Staging limpo automaticamente` : '')
        );

        // Importação + sync alteram dados no banco; forçar recarga ignorando cache Cloudflare.
        try {
          await forceRefreshFromDB();
        } catch (e) {
          console.warn('⚠️ Falha ao recarregar formalizações após sync:', e);
        }
      } catch (e: any) { 
        setImportStatus('error');  
        setImportError(`Erro de rede: ${e.message}`); 
      }
    };

    try {
      setImportMessage(`Lendo arquivo XLSX...`);
      const rows = await parseExcelFile(file);
      await processRows(rows);
    } catch (e: any) {
      setImportStatus('error'); setImportError(e.message);
    }
  };

  // ===== Atualizar Tipo de Formalização e Recurso via planilha =====
  const normalizeHeaderKey = (header: unknown) => {
    const raw = String(header ?? '').trim();
    return raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  };

  const UPDATE_CAMPOS_HEADER_TO_DB: Record<string, string> = {
    // emenda
    [normalizeHeaderKey('Emenda')]: 'emenda',
    [normalizeHeaderKey('emenda')]: 'emenda',
    [normalizeHeaderKey('Código/Nº Emenda')]: 'emenda',
    [normalizeHeaderKey('Codigo/Nº Emenda')]: 'emenda',
    [normalizeHeaderKey('Código Emenda')]: 'emenda',
    [normalizeHeaderKey('Codigo Emenda')]: 'emenda',

    // tipo formalização
    [normalizeHeaderKey('Tipo de formalização')]: 'tipo_formalizacao',
    [normalizeHeaderKey('Tipo de Formalização')]: 'tipo_formalizacao',
    [normalizeHeaderKey('Tipo de formalizacao')]: 'tipo_formalizacao',
    [normalizeHeaderKey('Tipo de Formalizacao')]: 'tipo_formalizacao',
    [normalizeHeaderKey('tipo_formalizacao')]: 'tipo_formalizacao',
    [normalizeHeaderKey('tipo formalizacao')]: 'tipo_formalizacao',

    // recurso
    [normalizeHeaderKey('Recurso')]: 'recurso',
    [normalizeHeaderKey('recurso')]: 'recurso',
    [normalizeHeaderKey('Com ou Sem Recurso')]: 'recurso',
    [normalizeHeaderKey('Com/sem recurso')]: 'recurso',
    [normalizeHeaderKey('Com sem recurso')]: 'recurso',

    // parecer LDO
    [normalizeHeaderKey('Parecer LDO')]: 'parecer_ld',
    [normalizeHeaderKey('Parecer Ldo')]: 'parecer_ld',
    [normalizeHeaderKey('parecer_ld')]: 'parecer_ld',
    [normalizeHeaderKey('parecer ld')]: 'parecer_ld',
    [normalizeHeaderKey('Parecer LD')]: 'parecer_ld',
  };

  const handleUpdateCamposCSV = async (file: File) => {
    setUpdateCamposStatus('parsing');
    setUpdateCamposProgress(0);
    setUpdateCamposMessage('Lendo arquivo...'); setUpdateCamposError('');
    const tk = localStorage.getItem('auth_token');
    if (!tk) { setUpdateCamposStatus('error'); setUpdateCamposError('Token de autenticação não encontrado'); return; }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isExcel = ['xls', 'xlsx', 'xml'].includes(ext);

    const isAllowedYear = (emendaValue: unknown) => {
      const digits = String(emendaValue ?? '').replace(/\D/g, '');
      if (digits.length < 4) return false;
      const year = parseInt(digits.slice(0, 4), 10);
      return [2023, 2024, 2025, 2026].includes(year);
    };

    const processRows = async (rows: Record<string, any>[]) => {
      // Mapear colunas (tolerante a variações de cabeçalho: maiúsculas/minúsculas, acentos, underscore, etc.)
      const mapped = rows.map((row) => {
        const rec: Record<string, any> = {};

        for (const [rawHeader, rawValue] of Object.entries(row || {})) {
          const dbColumn = UPDATE_CAMPOS_HEADER_TO_DB[normalizeHeaderKey(rawHeader)];
          if (!dbColumn) continue;

          const v = rawValue;
          if (v === undefined || v === null) continue;
          const s = String(v).trim();
          if (s === '') continue;
          rec[dbColumn] = s;
        }

        return rec;
      })
        .filter(r => r.emenda) // Precisa ter emenda como chave
        .filter(r => isAllowedYear(r.emenda)); // Atualização somente 2023–2026

      if (mapped.length === 0) {
        setUpdateCamposStatus('error');
        setUpdateCamposError('Nenhum registro elegível (anos 2023–2026) com coluna "Emenda" encontrado.');
        return;
      }

      // 💾 BACKUP antes de qualquer escrita na tabela formalizacao
      setUpdateCamposStatus('backing-up');
      setUpdateCamposMessage('💾 Criando backup da formalização...');
      try {
        const bkpResp = await fetch('/api/admin/backup-formalizacao', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${tk}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (!bkpResp.ok) {
          const bkpErr = await bkpResp.json().catch(() => ({ error: 'Erro desconhecido' }));
          setUpdateCamposStatus('error');
          setUpdateCamposError(`Erro ao criar backup: ${bkpErr.error || bkpResp.statusText}\n\nO processo foi interrompido para proteger os dados existentes.${bkpErr.hint ? `\n\nDica: ${bkpErr.hint}` : ''}`);
          return;
        }
        const bkpResult = await bkpResp.json();
        console.log(`✅ Backup criado: ${bkpResult.rows} registros em formalizacao_backup`);
      } catch (e: any) {
        setUpdateCamposStatus('error');
        setUpdateCamposError(`Erro ao criar backup: ${e.message}\n\nO processo foi interrompido para proteger os dados existentes.`);
        return;
      }

      setUpdateCamposStatus('uploading');
      setUpdateCamposMessage(`Atualizando ${mapped.length} registros...`);

      const BATCH = 100;
      const totalBatches = Math.ceil(mapped.length / BATCH);
      let totalUpdated = 0;
      let totalNotFound = 0;

      for (let i = 0; i < mapped.length; i += BATCH) {
        const chunk = mapped.slice(i, i + BATCH);
        const bn = Math.floor(i / BATCH) + 1;
        setUpdateCamposMessage(`Lote ${bn}/${totalBatches} (${Math.min(i + BATCH, mapped.length)}/${mapped.length})...`);
        try {
          const resp = await fetch('/api/admin/update-formalizacao-campos', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${tk}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ records: chunk }),
          });
          if (!resp.ok) {
            const text = await resp.text();
            let err: any = null;
            try { err = text ? JSON.parse(text) : null; } catch { err = null; }
            const msg = (err && (err.error || err.message)) ? (err.error || err.message) : (text || resp.statusText);
            const hint = err && err.hint ? String(err.hint) : '';
            setUpdateCamposStatus('error');
            setUpdateCamposError(`Erro no lote ${bn}: ${msg}${hint ? `\n\nDica: ${hint}` : ''}`);
            return;
          }
          const result = await resp.json();
          totalUpdated += result.updated || 0;
          totalNotFound += result.notFound || 0;
          setUpdateCamposProgress(Math.round(((i + chunk.length) / mapped.length) * 100));
        } catch (e: any) { setUpdateCamposStatus('error'); setUpdateCamposError(`Erro de rede no lote ${bn}: ${e.message}`); return; }
      }

      setUpdateCamposProgress(100); setUpdateCamposStatus('done');
      setUpdateCamposMessage(`Concluído! ${totalUpdated} registros atualizados | ${totalNotFound} emendas não encontradas.`);
      const nowCampos = new Date().toISOString();
      localStorage.setItem('formalizacao_last_update', nowCampos);
      setLastUpdateTime(nowCampos);
      silentRefreshData();
    };

    if (isExcel) {
      try {
        setUpdateCamposMessage(`Lendo arquivo ${ext.toUpperCase()}...`);
        const rows = await parseExcelFile(file);
        await processRows(rows);
      } catch (e: any) { setUpdateCamposStatus('error'); setUpdateCamposError(e.message); }
    } else {
      Papa.parse(file, {
        header: true, delimiter: ';', skipEmptyLines: true, encoding: 'UTF-8',
        complete: async (results) => { await processRows(results.data as Record<string, string>[]); },
        error: (err) => { setUpdateCamposStatus('error'); setUpdateCamposError(`Erro ao ler arquivo: ${err.message}`); }
      });
    }
  };

  // Função para buscar formalizações com filtros do servidor
  // ⚡ TOTAL CACHE: Carrega TUDO (não há limite de batches)
  const fetchFormalizacoesComFiltros = async (page: number = 0, filtersParam?: any, hideConcluidasOverride?: boolean, showSomenteMinhasOverride?: boolean, nocache: boolean = false, silent: boolean = false) => {
    // silent=true: background refresh — sem indicadores de loading nem barra de progresso
    const showProgress = (p: any) => { if (!silent) setRefreshProgress(p); };
    try {
      console.log('🔍 fetchFormalizacoesComFiltros iniciado', { page, nocache, silent, activeTab, 'lastDataUpdate state': lastDataUpdate, 'allDataCacheRef length': allDataCacheRef.current.length });
      if (!silent) setFormalizacaoSearchResult(prev => ({ ...prev, loading: true }));
      
      const filtersToUse = filtersParam || filters;
      const activeFilterCount = Object.values(filtersToUse).filter(v => (Array.isArray(v) ? v.length > 0 : (v && v !== ''))).length;
      
      // 🚀 Verificar se cache ainda é válido
      const now = Date.now();
      const cacheExpirado = (now - cacheTimestampRef.current) > CACHE_VALIDITY_MS;
      
      // ⚠️ CRÍTICO: Usar APENAS allDataCacheRef.current, ignorar formalizacoes
      // (formalizacoes pode ter dados incompletos de antes)
      let allData = allDataCacheRef.current && allDataCacheRef.current.length > 100 ? allDataCacheRef.current : [];
      
      // Se cache vazio OU cache expirou, carregar dados COMPLETOS
      const indiceMinimo = page * itensPorPagina;
      const precisaCarregarDados = allData.length === 0 || cacheExpirado;
      
      if (precisaCarregarDados) {
        console.log(`🔄 Cache ${cacheExpirado ? 'EXPIRADO' : 'VAZIO'} - Iniciando carregamento...`);

        const batchSize = 1000;
        const CONCURRENCY = 3; // Cloudflare Workers throttle com muitos requests simultâneos
        const startTime = Date.now();
        let dataFetched: any[] = [];
        const existingCache = allDataCacheRef.current; // guardar cache atual para fallback

        // Fetch de um offset com retry exponencial; retorna null apenas em falha permanente
        const fetchBatch = async (off: number): Promise<{ offset: number; data: any[] } | null> => {
          const delays = [1000, 3000, 6000]; // backoff mais longo para suportar throttling
          for (let attempt = 0; attempt < 4; attempt++) {
            try {
              const r = await fetch(`/api/formalizacao?limit=${batchSize}&offset=${off}${noCacheParam}`, { headers: getHeaders() });
              if (r.ok) {
                const d = await r.json();
                return { offset: off, data: Array.isArray(d) ? d : [] };
              }
              // 503/502 = servidor sobrecarregado → esperar mais antes de tentar de novo
              console.warn(`⚠️ Erro HTTP ${r.status} offset=${off}, tentativa ${attempt + 1}/4`);
            } catch (err) {
              console.warn(`⚠️ Falha de rede offset=${off}, tentativa ${attempt + 1}/4`, err);
            }
            if (attempt < 3) await new Promise(res => setTimeout(res, delays[attempt] ?? 6000));
          }
          console.error(`❌ Falha permanente offset=${off}`);
          return null;
        };

        // PASSO 1: Primeiro request — obtém primeiros 1000 + total via X-Total-Count
        showProgress({ active: true, loaded: 0, total: existingCache.length || 40000, startTime });
        let totalCount = 0;
        const noCacheParam = nocache ? '&nocache=1' : '';
        try {
          const r0 = await fetch(`/api/formalizacao?limit=${batchSize}&offset=0${noCacheParam}`, { headers: getHeaders() });
          if (r0.ok) {
            const hTotal = r0.headers.get('X-Total-Count');
            totalCount = hTotal ? parseInt(hTotal) : 0;
            const d0 = await r0.json();
            if (Array.isArray(d0)) dataFetched = d0;
          }
        } catch (err) {
          console.error('❌ Falha no primeiro request:', err);
        }

        if (dataFetched.length === 0) {
          // Primeiro request falhou ou banco vazio — preservar cache existente
          if (existingCache.length > 0) {
            console.warn('⚠️ Primeiro request retornou vazio — mantendo cache existente');
            allData = existingCache;
          } else {
            allData = [];
          }
        } else if (totalCount > dataFetched.length) {
          // PASSO 2a: Total exato conhecido via header — calcular offsets precisos
          const remainingOffsets: number[] = [];
          for (let off = batchSize; off < totalCount; off += batchSize) remainingOffsets.push(off);
          console.log(`📊 X-Total-Count=${totalCount} → ${remainingOffsets.length} requests adicionais (paralelo ${CONCURRENCY}x)`);
          showProgress({ active: true, loaded: dataFetched.length, total: totalCount, startTime });

          for (let i = 0; i < remainingOffsets.length; i += CONCURRENCY) {
            const chunk = remainingOffsets.slice(i, i + CONCURRENCY);
            const results = await Promise.all(chunk.map(off => fetchBatch(off)));
            results
              .filter((r): r is { offset: number; data: any[] } => r !== null)
              .sort((a, b) => a.offset - b.offset)
              .forEach(r => { dataFetched = dataFetched.concat(r.data); });
            showProgress(p => p ? { ...p, loaded: dataFetched.length } : null);
          }

          // Verificar se todos os registros foram carregados; retentar offsets falhados
          if (dataFetched.length < totalCount) {
            const loadedIds = new Set(dataFetched.map((r: any) => r.id));
            const failedOffsets = remainingOffsets.filter(off => {
              // Identificar offsets que não contribuíram com dados
              const expectedMin = off;
              const expectedMax = off + batchSize - 1;
              const hasData = dataFetched.some((r: any) => r.id > expectedMin && r.id <= expectedMax + batchSize);
              return !hasData;
            });
            if (failedOffsets.length > 0) {
              console.warn(`⚠️ ${totalCount - dataFetched.length} registros ausentes — retentando ${failedOffsets.length} offsets...`);
              for (let i = 0; i < failedOffsets.length; i += CONCURRENCY) {
                const chunk = failedOffsets.slice(i, i + CONCURRENCY);
                const results = await Promise.all(chunk.map(off => fetchBatch(off)));
                results
                  .filter((r): r is { offset: number; data: any[] } => r !== null)
                  .sort((a, b) => a.offset - b.offset)
                  .forEach(r => { dataFetched = dataFetched.concat(r.data); });
                showProgress(p => p ? { ...p, loaded: dataFetched.length } : null);
              }
            }
          }

          allData = dataFetched;
        } else {
          // PASSO 2b: Header não disponível (CORS ainda não propagou) — ondas sequenciais até batch vazio
          console.log(`📊 X-Total-Count não disponível → carregamento em ondas paralelas (stop-on-empty)`);
          let nextOffset = batchSize;
          let keepGoing = true;
          showProgress({ active: true, loaded: dataFetched.length, total: Math.max(existingCache.length, 40000), startTime });

          while (keepGoing) {
            const offsets = Array.from({ length: CONCURRENCY }, (_, i) => nextOffset + i * batchSize);
            const results = await Promise.all(offsets.map(off => fetchBatch(off)));
            const sorted = results
              .filter((r): r is { offset: number; data: any[] } => r !== null)
              .sort((a, b) => a.offset - b.offset);

            let gotData = false;
            for (const r of sorted) {
              if (r.data.length === 0) { keepGoing = false; break; }
              dataFetched = dataFetched.concat(r.data);
              gotData = true;
            }
            if (!gotData || sorted.length === 0) keepGoing = false;
            if (keepGoing) nextOffset += CONCURRENCY * batchSize;
            showProgress(p => p ? { ...p, loaded: dataFetched.length } : null);
          }
          allData = dataFetched;
        }

        const elapsed = Date.now() - startTime;
        console.log(`🎉 CARREGADOS ${allData.length} registros em ${elapsed}ms`);
        showProgress(p => p ? { ...p, loaded: allData.length, total: allData.length } : null);
        if (!silent) setTimeout(() => setRefreshProgress(null), 2000);

        // 💾 Só atualiza cache se carregou dados reais (nunca limpa cache com array vazio)
        // E só salva no localStorage se carregou pelo menos 95% dos registros esperados
        const minExpected = totalCount > 0 ? totalCount * 0.95 : 1;
        console.log(`📊 Verificando: allData.length=${allData.length}, minExpected=${minExpected}, totalCount=${totalCount}`);
        if (allData.length > 0 && allData.length >= minExpected) {
          allDataCacheRef.current = allData;
          cacheTimestampRef.current = now;
          setFormalizacoes(allData);
          console.log('✅ CASO 1: Carregados dados suficientes, atualizando cache');
        } else if (allData.length > 0 && existingCache.length > allData.length) {
          // Carregou menos que o cache existente — preservar cache anterior
          console.warn(`⚠️ CASO 2: Carregados ${allData.length} registros mas cache tem ${existingCache.length} — preservando cache`);
          allData = existingCache;
        } else if (allData.length > 0) {
          allDataCacheRef.current = allData;
          cacheTimestampRef.current = now;
          setFormalizacoes(allData);
          console.log('✅ CASO 3: Carregados dados menores que esperado, mas atualizando');
        } else if (existingCache.length > 0) {
          // Carregamento falhou mas cache existia — usar cache sem alterar timestamp
          console.warn('⚠️ CASO 4: Carregamento retornou vazio — exibindo cache anterior');
          allData = existingCache;
        }
        
        // Não persiste o dataset completo em localStorage: para ~40 mil registros a
        // escrita sempre excede a cota do navegador (só desperdiça CPU serializando).
        // O cache em memória (allDataCacheRef) já cobre o caso de uso real.
        if (allData.length > 0) {
          setLastDataUpdate(new Date(now));
          console.log(`📅 SETANDO TIMESTAMP DO FETCH: ${new Date(now).toLocaleString('pt-BR')}`);
        }
      } else {
        console.log(`⚡ Cache COMPLETO em memória: ${allData.length} registros`);
        // 📅 Atualizar timestamp mesmo quando usando cache em memória
        const cachedTime = localStorage.getItem('formalizacoes_cache_time');
        console.log(`📝 Procurando timestamp em localStorage: ${cachedTime}`);
        if (cachedTime) {
          const date = new Date(Number(cachedTime));
          console.log('📅 SETANDO TIMESTAMP DO CACHE:', { cachedTime, date, formatted: date.toLocaleDateString('pt-BR') });
          setLastDataUpdate(date);
        } else {
          console.log('⚠️ Nenhum timestamp no localStorage');
        }
      }

      const hasActiveFilters = activeFilterCount > 0;
      
      if (hasActiveFilters) {
        console.log(`🔥 Aplicando ${activeFilterCount} filtro(s) CLIENTE-SIDE aos ${allData.length} registros...`);
      } else {
        console.log(`📄 Sem filtros: exibindo página ${page} de ${allData.length} registros`);
      }

      // Pré-computar Sets para busca por lista — O(1) por registro em vez de O(n_termos)
      // Isso é essencial para listas grandes (5000+ termos): evita travar o browser
      const _buscaDigitsSet = buscaListaTerms.length > 0
        ? new Set(buscaListaTerms.map(t => t.replace(/\D/g, '')).filter(s => s.length > 0))
        : null;
      const _buscaStrSet = buscaListaTerms.length > 0
        ? new Set(buscaListaTerms.map(t => t.toLowerCase().trim()).filter(s => s.length > 0))
        : null;

      // Função auxiliar para comparação
      const matchesAllFilters = (f: any) => {
        const getAnoNorm = (val: any): string => {
          const s = String(val ?? '').trim();
          const m = s.match(/\d{4}/);
          return m ? m[0] : '';
        };

        const safeCompare = (fieldValue: any, filterValue: string): boolean => {
          if (!fieldValue) return false;
          // Normaliza acentos para comparar: "Rita de Cassia" == "Rita de Cássia"
          const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
          const field = normalize(String(fieldValue));
          const filter = normalize(filterValue);
          return field.includes(filter);
        };

        const matchesAnyFilter = (fieldValue: any, filterValues: string[]): boolean => {
          if (!filterValues || filterValues.length === 0) return true;
          return filterValues.some(filterValue => safeCompare(fieldValue, filterValue));
        };

        // Comparação normalizada para emenda: suporta com/sem pontos e últimos dígitos
        const matchEmenda = (stored: any, search: string): boolean => {
          if (!stored || !search) return false;
          const storedStr = String(stored).toLowerCase();
          const searchStr = search.toLowerCase().trim();
          if (storedStr.includes(searchStr)) return true;
          const storedDigits = storedStr.replace(/\D/g, '');
          const searchDigits = searchStr.replace(/\D/g, '');
          return searchDigits.length > 0 && storedDigits.includes(searchDigits);
        };

        // Verificar todos os filtros ativos
        if (Array.isArray(filtersToUse.ano) && filtersToUse.ano.length > 0) {
          const anoNorm = getAnoNorm(f.ano);
          if (!anoNorm) return false;
          const selected = filtersToUse.ano.map(getAnoNorm).filter(Boolean);
          if (!selected.includes(anoNorm)) return false;
        } else {
          // Todos os anos visíveis por padrão
        }

        if (Array.isArray(filtersToUse.demandas_formalizacao) && filtersToUse.demandas_formalizacao.length > 0) {
          if (!matchesAnyFilter(f.demandas_formalizacao, filtersToUse.demandas_formalizacao)) return false;
        }

        if (Array.isArray(filtersToUse.area_estagio) && filtersToUse.area_estagio.length > 0) {
          const _areaEstagioDisplay = deriveAreaEstagio(f) || f.area_estagio;
          if (!matchesAnyFilter(_areaEstagioDisplay, filtersToUse.area_estagio)) return false;
        }
        if (Array.isArray(filtersToUse.recurso) && filtersToUse.recurso.length > 0) {
          if (!matchesAnyFilter(f.recurso, filtersToUse.recurso)) return false;
        }
        if (Array.isArray(filtersToUse.tecnico) && filtersToUse.tecnico.length > 0) {
          if (!matchesAnyFilter(f.tecnico, filtersToUse.tecnico)) return false;
        }
        if (Array.isArray(filtersToUse.area_estagio_situacao_demanda) && filtersToUse.area_estagio_situacao_demanda.length > 0) {
          if (!matchesAnyFilter(f.area_estagio_situacao_demanda, filtersToUse.area_estagio_situacao_demanda)) return false;
        }
        if (Array.isArray(filtersToUse.situacao_analise_demanda) && filtersToUse.situacao_analise_demanda.length > 0) {
          if (!matchesAnyFilter(f.situacao_analise_demanda, filtersToUse.situacao_analise_demanda)) return false;
        }
        if (Array.isArray(filtersToUse.conferencista) && filtersToUse.conferencista.length > 0) {
          if (!matchesAnyFilter(f.conferencista, filtersToUse.conferencista)) return false;
        }
        if (Array.isArray(filtersToUse.falta_assinatura) && filtersToUse.falta_assinatura.length > 0) {
          if (!matchesAnyFilter(f.falta_assinatura, filtersToUse.falta_assinatura)) return false;
        }
        if (Array.isArray((filtersToUse as any).lote) && (filtersToUse as any).lote.length > 0) {
          if (!matchesAnyFilter((f as any).lote, (filtersToUse as any).lote)) return false;
        }
        if (Array.isArray((filtersToUse as any).prioridade) && (filtersToUse as any).prioridade.length > 0) {
          if (!matchesAnyFilter((f as any).prioridade, (filtersToUse as any).prioridade)) return false;
        }
        if (Array.isArray(filtersToUse.publicacao) && filtersToUse.publicacao.length > 0) {
          if (!matchesAnyFilter(f.publicacao, filtersToUse.publicacao)) return false;
        }
        if (Array.isArray(filtersToUse.vigencia) && filtersToUse.vigencia.length > 0) {
          if (!matchesAnyFilter(f.vigencia, filtersToUse.vigencia)) return false;
        }
        if (Array.isArray(filtersToUse.parlamentar) && filtersToUse.parlamentar.length > 0) {
          if (!matchesAnyFilter(f.parlamentar, filtersToUse.parlamentar)) return false;
        }
        if (Array.isArray(filtersToUse.partido) && filtersToUse.partido.length > 0) {
          if (!matchesAnyFilter(f.partido, filtersToUse.partido)) return false;
        }
        if (Array.isArray(filtersToUse.regional) && filtersToUse.regional.length > 0) {
          if (!matchesAnyFilter(f.regional, filtersToUse.regional)) return false;
        }
        if (Array.isArray(filtersToUse.municipio) && filtersToUse.municipio.length > 0) {
          if (!matchesAnyFilter(f.municipio, filtersToUse.municipio)) return false;
        }
        if (Array.isArray(filtersToUse.conveniado) && filtersToUse.conveniado.length > 0) {
          if (!matchesAnyFilter(f.conveniado, filtersToUse.conveniado)) return false;
        }
        if (Array.isArray(filtersToUse.objeto) && filtersToUse.objeto.length > 0) {
          if (!matchesAnyFilter(f.objeto, filtersToUse.objeto)) return false;
        }
        if (Array.isArray((filtersToUse as any).classificacao_emenda_demanda) && (filtersToUse as any).classificacao_emenda_demanda.length > 0) {
          if (!matchesAnyFilter(f.classificacao_emenda_demanda, (filtersToUse as any).classificacao_emenda_demanda)) return false;
        }

        // Quick filter: Fundo a Fundo
        if (fundoAFundoFilter && !(f.area_estagio_situacao_demanda ?? '').toUpperCase().includes('FUNDO A FUNDO')) return false;
        if (emConferenciaFilter) {
          if (!isLiberadoParaConferencia(f)) return false;
          // Não-admin só vê as próprias demandas liberadas; admin vê de todos os técnicos
          if (!isAdmin) {
            const isDoTecnico = (user?.id && f.usuario_atribuido_id && user.id === f.usuario_atribuido_id)
              || (user?.nome && f.tecnico && user.nome === f.tecnico);
            if (!isDoTecnico) return false;
          }
        }

        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const matchSearch = 
            (f.parlamentar && f.parlamentar.toLowerCase().includes(searchLower)) ||
            (f.conveniado && f.conveniado.toLowerCase().includes(searchLower)) ||
            (f.objeto && f.objeto.toLowerCase().includes(searchLower)) ||
            (f.demanda && String(f.demanda).toLowerCase().includes(searchLower)) ||
            (f.demandas_formalizacao && String(f.demandas_formalizacao).toLowerCase().includes(searchLower)) ||
            (f.tecnico && f.tecnico.toLowerCase().includes(searchLower)) ||
            (f.emenda && matchEmenda(f.emenda, searchTerm)) ||
            (f.regional && f.regional.toLowerCase().includes(searchLower)) ||
            (f.municipio && f.municipio.toLowerCase().includes(searchLower)) ||
            (f.numero_convenio && String(f.numero_convenio).toLowerCase().includes(searchLower)) ||
            (f.area_estagio && f.area_estagio.toLowerCase().includes(searchLower)) ||
            (f.area_estagio_situacao_demanda && f.area_estagio_situacao_demanda.toLowerCase().includes(searchLower)) ||
            (f.conferencista && f.conferencista.toLowerCase().includes(searchLower));
          if (!matchSearch) return false;
        }

        // Busca por lista (múltiplas demandas/emendas) — Set O(1) para listas grandes
        if (_buscaDigitsSet) {
          const matchField = (fieldVal: any): boolean => {
            if (!fieldVal) return false;
            const s = String(fieldVal);
            const sDigits = s.replace(/\D/g, '');
            const sLower = s.toLowerCase().trim();
            // Lookup O(1) por match exato (dígitos ou string)
            if ((sDigits && _buscaDigitsSet.has(sDigits)) || _buscaStrSet!.has(sLower)) return true;
            // Fallback substring apenas para listas pequenas (<= 500 termos)
            if (buscaListaTerms.length <= 500) {
              return buscaListaTerms.some(term => matchEmenda(s, term));
            }
            return false;
          };
          if (!matchField(f.demanda) && !matchField(f.demandas_formalizacao) &&
              !matchField(f.emenda) && !matchField(f.numero_convenio)) return false;
        }

        if (Array.isArray(filtersToUse.data_liberacao) && filtersToUse.data_liberacao.length > 0) {
          if (!matchesAnyFilter(f.data_liberacao, filtersToUse.data_liberacao)) return false;
        }
        // Filtro por intervalo de data de liberação (dataInicioFilter / dataFimFilter)
        if (dataInicioFilter || dataFimFilter) {
          // data_liberacao pode ser "2026-02-13" ou "13/02/2026" — normaliza para ISO
          const rawDt = String(f.data_liberacao || '').trim();
          if (!rawDt) return false; // sem data → excluído quando filtro ativo
          // Converter dd/mm/yyyy → yyyy-mm-dd se necessário
          const dtISO = rawDt.includes('/') 
            ? rawDt.split('/').reverse().join('-') 
            : rawDt.substring(0, 10);
          if (dataInicioFilter && dtISO < dataInicioFilter) return false;
          if (dataFimFilter && dtISO > dataFimFilter) return false;
        }
        if (Array.isArray(filtersToUse.data_analise_demanda) && filtersToUse.data_analise_demanda.length > 0) {
          if (!matchesAnyFilter(f.data_analise_demanda, filtersToUse.data_analise_demanda)) return false;
        }
        if (Array.isArray(filtersToUse.data_recebimento_demanda) && filtersToUse.data_recebimento_demanda.length > 0) {
          if (!matchesAnyFilter(f.data_recebimento_demanda, filtersToUse.data_recebimento_demanda)) return false;
        }
        if (Array.isArray(filtersToUse.data_retorno) && filtersToUse.data_retorno.length > 0) {
          if (!matchesAnyFilter(f.data_retorno, filtersToUse.data_retorno)) return false;
        }
        if (Array.isArray(filtersToUse.encaminhado_em) && filtersToUse.encaminhado_em.length > 0) {
          if (!matchesAnyFilter(f.encaminhado_em, filtersToUse.encaminhado_em)) return false;
        }
        if (Array.isArray(filtersToUse.concluida_em) && filtersToUse.concluida_em.length > 0) {
          if (!matchesAnyFilter(f.concluida_em, filtersToUse.concluida_em)) return false;
        }

        // Filtros de texto por coluna (colunas sem multi-select)
        for (const [colKey, textValue] of Object.entries(columnTextFilters) as [string, string][]) {
          if (!textValue || textValue.trim() === '') continue;
          const dataField = columnToDataField[colKey] || colKey;
          if (colKey === 'emenda') {
            if (!matchEmenda(f[dataField], textValue)) return false;
          } else {
            const fieldValue = String(f[dataField] || '').toLowerCase();
            if (!fieldValue.includes(textValue.toLowerCase().trim())) return false;
          }
        }

        // Filtros multi-select de cabeçalho (colunas extras)
        for (const [colKey, selectedValues] of Object.entries(headerFilters) as [string, string[]][]) {
          if (!selectedValues || selectedValues.length === 0) continue;
          const dataField = columnToDataField[colKey] || colKey;
          if (colKey === 'emenda') {
            if (!selectedValues.some(sv => matchEmenda(f[dataField], sv))) return false;
          } else {
            const fieldValue = String(f[dataField] || '').trim();
            if (!selectedValues.some(sv => fieldValue.toLowerCase().includes(sv.toLowerCase()))) return false;
          }
        }

        return true;
      };

      // Aplicar filtros em modo cache
      let filteredData = allData.filter(matchesAllFilters);

      // Usuários comuns podem visualizar todas as emendas
      
      // Aplicar "Ocultar Vazias" - genérico para todas as colunas
      filteredData = filteredData.filter(f => {
        for (const [field, hide] of Object.entries(hideEmptyFields)) {
          if (!hide) continue;
          const val = f[field];
          if (!val || String(val).trim() === '' || String(val).trim() === '—') return false;
        }
        return true;
      });

      // Aplicar "Mostrar Somente Vazias" - genérico para todas as colunas
      filteredData = filteredData.filter(f => {
        for (const [field, show] of Object.entries(showOnlyEmptyFields)) {
          if (!show) continue;
          const val = f[field];
          if (val && String(val).trim() !== '' && String(val).trim() !== '—') return false;
        }
        return true;
      });

      // Filtrar somente minhas demandas
      const showSomenteMinhasAtual = showSomenteMinhasOverride !== undefined ? showSomenteMinhasOverride : showSomenteMinhas;
      if (showSomenteMinhasAtual && user?.nome) {
        // Normaliza acentos para comparar corretamente independente de acentuação
        // Ex: "Rita de Cassia" == "Rita de Cássia" após normalização NFD
        const normName = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        const nomeUsuario = normName(user.nome);
        filteredData = filteredData.filter(f => {
          const tecnico = normName(String(f.tecnico || ''));
          const conferencista = normName(String(f.conferencista || ''));
          return tecnico === nomeUsuario || conferencista === nomeUsuario;
        });
      }

      // Aplicar "Ocultar Concluídas" para usuário comum
      const hideConcluidasAtual = hideConcluidasOverride !== undefined ? hideConcluidasOverride : hideConcluidas;
      if (hideConcluidasAtual) {
        filteredData = filteredData.filter(f => {
          const concluida = String(f.concluida_em || '').trim();
          const publicacao = String(f.publicacao || '').trim();
          return (concluida === '' || concluida === '—') && (publicacao === '' || publicacao === '—');
        });
      }

      // Ordenação dos resultados filtrados ANTES de paginar
      const sortedData = sortData(filteredData, sortColumn, sortOrder);
      filteredForExportRef.current = sortedData; // salva dados filtrados completos para exportação
      console.log('💾 filteredForExportRef atualizado:', { 
        length: sortedData.length, 
        firstItem: sortedData[0]?.parlamentar || 'N/A',
        cacheSize: allData.length 
      });

      // Paginação dos resultados ordenados
      const totalFiltered = sortedData.length;
      const startIdx = page * itensPorPagina;
      const endIdx = startIdx + itensPorPagina;
      const pagedData = sortedData.slice(startIdx, endIdx);

      if (hasActiveFilters) {
        console.log(`  ✅ ${allData.length} → ${filteredData.length} registros após filtros`);
      }
      console.log(`  📖 Página ${page + 1}: ${pagedData.length} registros (total filtrado: ${totalFiltered})`);

      const newState = {
        data: pagedData,
        total: totalFiltered,
        page: page,
        limit: itensPorPagina,
        hasMore: endIdx < totalFiltered,
        loading: false
      };

      console.log('✅ RESULTADO FINAL DO FETCH:', {
        'página': page,
        'registros nesta página': pagedData.length,
        'total filtrado': totalFiltered,
        'filteredForExportRef': filteredForExportRef.current.length,
        'lastDataUpdate state': lastDataUpdate
      });

      setFormalizacaoSearchResult(newState);
      setPaginaAtual(page);
    } catch (error) {
      console.error('❌ ERRO CAPTURADO ao filtrar formalizações!');
      console.error('   Type:', typeof error);
      console.error('   Message:', (error as Error).message);
      console.error('   Stack:', (error as Error).stack);
      console.error('   Full error:', error);
      console.log('   lastDataUpdate neste momento:', lastDataUpdate);
      console.log('   allDataCacheRef.current length:', allDataCacheRef.current.length);
      setFormalizacaoSearchResult(prev => ({ ...prev, loading: false }));
    }
  };

  // ── Reset de registros de teste: volta a demanda ao estado anterior à
  // atribuição de técnico (limpa técnico, análise, liberação para conferência
  // e atribuição de conferencista). Usado pelo admin para limpar dados de QA. ──
  const RESET_TESTE_PAYLOAD = {
    tecnico: '', usuario_atribuido_id: null, data_liberacao: '',
    situacao_analise_demanda: '', data_analise_demanda: '', observacao_analise_demanda: '',
    area_estagio_situacao_demanda: '', data_liberacao_conferencia: '',
    conferencista: '', data_recebimento_demanda: '',
  };
  const handleResetarTeste = async (idsToReset: number[]) => {
    if (idsToReset.length === 0) return;
    const confirmMsg = `⚠️ RESETAR TESTE\n\nIsso vai limpar técnico, análise, área/estágio e conferencista de ${idsToReset.length} registro(s), voltando ao estado anterior à atribuição de técnico.\n\nTem certeza?`;
    if (!confirm(confirmMsg)) return;
    setResetandoTeste(true);
    try {
      const results = await Promise.allSettled(
        idsToReset.map(id =>
          fetch(`/api/formalizacao/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(RESET_TESTE_PAYLOAD),
          }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r; })
        )
      );
      const falhas = results.filter(r => r.status === 'rejected').length;
      const updater = (list: any[]) => list.map((f: any) =>
        idsToReset.includes(f.id) ? { ...f, ...RESET_TESTE_PAYLOAD } : f
      );
      if (allDataCacheRef.current.length > 0) {
        allDataCacheRef.current = updater(allDataCacheRef.current);
        syncLocalStorageCache();
      }
      if (filteredForExportRef.current.length > 0) {
        filteredForExportRef.current = updater(filteredForExportRef.current);
      }
      setFormalizacoes(prev => updater(prev));
      setFormalizacaoSearchResult((prev: any) => ({ ...prev, data: updater(prev.data) }));
      setSelectedRows(new Set());
      if (falhas > 0) {
        alert(`⚠️ ${idsToReset.length - falhas} registro(s) resetado(s), ${falhas} falharam. Verifique o console.`);
      } else {
        alert(`✅ ${idsToReset.length} registro(s) resetado(s) com sucesso!`);
      }
    } catch (err: any) {
      alert(`❌ Erro ao resetar: ${err.message}`);
    } finally {
      setResetandoTeste(false);
    }
  };

  // ── Função central de atribuição de técnico (usada pelo modal de 2 etapas) ──
  const executarAtribuicaoTecnico = async (idsToUpdate: number[]) => {
    if (!atribuicaoTecnico || idsToUpdate.length === 0) return;
    const now = new Date();
    const dataLiberacao = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    setAtribuindoTecnico(true);
    try {
      const response = await fetch('/api/formalizacao/atribuir-tecnico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ids: idsToUpdate, usuario_id: atribuicaoTecnico.id, data_liberacao: dataLiberacao })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Erro HTTP ${response.status}`);
      }
      const result = await response.json();
      if (!result.success && result.updated === 0) {
        alert(`⚠️ Nenhum registro foi atualizado!\n\nDetalhes: ${result.message || 'Desconhecido'}`);
        return;
      }
      // Atualizar cache local imediatamente
      if (result.updatedRecords && result.updatedRecords.length > 0) {
        const updateMap = new Map(result.updatedRecords.map((r: any) => [r.id, r]));
        const updater = (list: any[]) => list.map((f: any) => {
          const u = updateMap.get(f.id);
          return u ? { ...f, ...u } : f;
        });
        if (allDataCacheRef.current.length > 0) {
          allDataCacheRef.current = updater(allDataCacheRef.current);
          syncLocalStorageCache();
        }
        if (filteredForExportRef.current.length > 0) {
          filteredForExportRef.current = updater(filteredForExportRef.current);
        }
        setFormalizacoes(prev => updater(prev));
        setFormalizacaoSearchResult((prev: any) => ({ ...prev, data: updater(prev.data) }));
      }
      fetchFormalizacoesComFiltros(paginaAtual);
      setSelectedRows(new Set());
      setAtribuicaoTecnico(null);
      setAtribuicaoStep('select');
      setShowAtribuirTecnicoModal(false);
      fetch('/api/admin/force-reload', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }).catch(() => {});
      if (result.notificacao && !result.notificacao.criada) {
        alert(`✅ Técnico ${atribuicaoTecnico.nome} atribuído para ${result.updated} registro(s)!\n\n⚠️ Notificação NÃO enviada.\nErro: ${result.notificacao.erro || 'desconhecido'}`);
      } else {
        alert(`✅ Sucesso! Técnico ${atribuicaoTecnico.nome} atribuído para ${result.updated} registro(s)!`);
      }
    } catch (error: any) {
      alert(`❌ Erro ao atribuir técnico:\n\n${error.message}`);
    } finally {
      setAtribuindoTecnico(false);
    }
  };

  // ── Função central de atribuição de conferencista ──
  const executarAtribuicaoConferencista = async (idsToUpdate: number[]) => {
    if (!atribuicaoConferencista || idsToUpdate.length === 0) return;
    const now = new Date();
    const dataRecebimento = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    setAtribuindoConferencista(true);
    try {
      const response = await fetch('/api/formalizacao/atribuir-conferencista', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ids: idsToUpdate, usuario_id: atribuicaoConferencista.id, data_recebimento_demanda: dataRecebimento })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Erro HTTP ${response.status}`);
      }
      const result = await response.json();
      if (!result.success && result.updated === 0) {
        alert(`⚠️ Nenhum registro foi atualizado!\n\nDetalhes: ${result.message || 'Desconhecido'}`);
        return;
      }
      if (result.updatedRecords && result.updatedRecords.length > 0) {
        const updateMap = new Map(result.updatedRecords.map((r: any) => [r.id, r]));
        const updater = (list: any[]) => list.map((f: any) => { const u = updateMap.get(f.id); return u ? { ...f, ...u } : f; });
        if (allDataCacheRef.current.length > 0) { allDataCacheRef.current = updater(allDataCacheRef.current); syncLocalStorageCache(); }
        if (filteredForExportRef.current.length > 0) { filteredForExportRef.current = updater(filteredForExportRef.current); }
        setFormalizacoes(prev => updater(prev));
        setFormalizacaoSearchResult((prev: any) => ({ ...prev, data: updater(prev.data) }));
      }
      fetchFormalizacoesComFiltros(paginaAtual);
      setSelectedRows(new Set());
      setAtribuicaoConferencista(null);
      setAtribuicaoConfStep('select');
      setShowAtribuirConferencistaModal(false);
      fetch('/api/admin/force-reload', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }).catch(() => {});
      if (result.notificacao && !result.notificacao.criada) {
        alert(`✅ Conferencista ${atribuicaoConferencista.nome} atribuído para ${result.updated} registro(s)!\n\n⚠️ Notificação NÃO enviada.\nErro: ${result.notificacao.erro || 'desconhecido'}`);
      } else {
        alert(`✅ Sucesso! Conferencista ${atribuicaoConferencista.nome} atribuído para ${result.updated} registro(s)!`);
      }
    } catch (error: any) {
      alert(`❌ Erro ao atribuir conferencista:\n\n${error.message}`);
    } finally {
      setAtribuindoConferencista(false);
    }
  };

  const exportFormalizacaoXLSX = () => {
    try {
      const data = filteredForExportRef.current;
      console.log('📊 Export XLSX clicked - filteredForExportRef.current:', {
        length: data?.length || 0,
        data: data?.slice(0, 2) || []
      });
      if (!data || data.length === 0) { 
        alert('Sem dados para exportar. Aguarde o carregamento.'); 
        return; 
      }

      const COLUMN_MAP: Record<string, string> = {
      ano: 'Ano', parlamentar: 'Parlamentar', partido: 'Partido', emenda: 'Emenda',
      emendas_agregadoras: 'Emendas Agregadoras', demanda: 'Demanda',
      demandas_formalizacao: 'Demandas Formalização', numero_convenio: 'Nº Convênio',
      classificacao_emenda_demanda: 'Classificação', tipo_formalizacao: 'Tipo Formalização',
      regional: 'Regional', municipio: 'Município', conveniado: 'Conveniado',
      objeto: 'Objeto', portfolio: 'Portfólio', valor: 'Valor',
      situacao_emenda: 'Situação Emenda', situacao_demandas_sempapel: 'Situação SemPapel',
      area_estagio: 'Área - Estágio', recurso: 'Recurso', parecer_ld: 'Parecer LDO', tecnico: 'Técnico',
      data_liberacao: 'Data Liberação', area_estagio_situacao_demanda: 'Área - Situação',
      situacao_analise_demanda: 'Situação Análise', data_analise_demanda: 'Data Análise',
      motivo_retorno_diligencia: 'Motivo Retorno', data_retorno_diligencia: 'Data Retorno Dilig.',
      conferencista: 'Conferencista', data_recebimento_demanda: 'Data Recebimento',
      data_retorno: 'Data Retorno', observacao_motivo_retorno: 'Observações',
      data_liberacao_assinatura_conferencista: 'Data Lib. Assin. Conf.',
      data_liberacao_assinatura: 'Data Lib. Assinatura', falta_assinatura: 'Falta Assinatura',
      assinatura: 'Assinatura', publicacao: 'Publicação', vigencia: 'Vigência',
      encaminhado_em: 'Encaminhado em', concluida_em: 'Concluída em',
      lote: 'Lote', prioridade: 'Prioridade',
    };

    const cols = (Object.entries(visibleColumns) as [string, boolean][])
      .filter(([k, v]) => v && k !== 'seq' && COLUMN_MAP[k])
      .map(([k]) => ({ key: k, label: COLUMN_MAP[k] }));

    const DATE_COLUMNS = new Set([
      'data_liberacao', 'data_analise_demanda', 'data_retorno_diligencia',
      'data_recebimento_demanda', 'data_retorno', 'data_liberacao_assinatura_conferencista',
      'data_liberacao_assinatura', 'assinatura', 'publicacao', 'vigencia',
      'encaminhado_em', 'concluida_em'
    ]);

    const FALTA_ASSINATURA_ORDER = [
      'GESTOR ADMINISTRATIVO DRS', 'GESTOR TÉCNICO DRS', 'DIRETOR DRS',
      'COORDENADOR CRS', 'DIRETOR GGCON', 'ORDENADOR DE DESPESAS',
      'SECRETÁRIO', 'GESTOR – CONVÊNIO / DEMANDANTE', 'ORÇAMENTO CGOF',
      'CHEFIA DE GABINETE', 'AGUARDANDO RESOLUÇÃO', 'NOTA DE RESERVA - GCF',
      'AGUARDANDO FINALIZAÇÃO', 'LOTE3'
    ];

    const header = cols.map(c => c.label);
    const rows = data.map(row =>
      cols.map(({ key }) => {
        const v = (row as any)[key];
        if (v === null || v === undefined || v === '') return '';
        if (DATE_COLUMNS.has(key)) {
          return formatDateForDisplay(String(v));
        }
        if (key === 'falta_assinatura') {
          const parts = String(v).split(',').map((s: string) => s.trim()).filter(Boolean);
          const sorted = parts.sort((a, b) => {
            const ia = FALTA_ASSINATURA_ORDER.indexOf(a);
            const ib = FALTA_ASSINATURA_ORDER.indexOf(b);
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
          });
          return sorted.join(', ');
        }
        return v;
      })
    );

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = cols.map(({ label }) => ({ wch: Math.max(label.length + 2, 14) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Formalização');
    const fileName = `formalizacao_${new Date().toISOString().slice(0, 10)}.xlsx`;
    console.log('💾 SALVANDO ARQUIVO XLSX:', fileName, 'com', data.length, 'registros');
    XLSX.writeFile(wb, fileName);
    console.log('✅ ARQUIVO XLSX SALVO COM SUCESSO!');
    } catch (error) {
      console.error('❌ ERRO AO EXPORTAR XLSX:', error);
      alert('❌ Erro ao exportar arquivo. Verifique o console.');
    }
  };

  // ── CSV Export ────────────────────────────────────────────────────────────
  const exportFormalizacaoCSV = () => {
    try {
      const data = filteredForExportRef.current;
      console.log('📊 Export CSV clicked - filteredForExportRef.current:', {
        length: data?.length || 0,
        data: data?.slice(0, 2) || []
      });
      if (!data || data.length === 0) { 
        alert('Sem dados para exportar. Aguarde o carregamento.'); 
        return; 
      }

      const COLUMN_MAP: Record<string, string> = {
      ano: 'Ano', parlamentar: 'Parlamentar', partido: 'Partido', emenda: 'Emenda',
      emendas_agregadoras: 'Emendas Agregadoras', demanda: 'Demanda',
      demandas_formalizacao: 'Demandas Formalização', numero_convenio: 'Nº Convênio',
      classificacao_emenda_demanda: 'Classificação', tipo_formalizacao: 'Tipo Formalização',
      regional: 'Regional', municipio: 'Município', conveniado: 'Conveniado',
      objeto: 'Objeto', portfolio: 'Portfólio', valor: 'Valor',
      situacao_emenda: 'Situação Emenda', situacao_demandas_sempapel: 'Situação SemPapel',
      area_estagio: 'Área - Estágio', recurso: 'Recurso', parecer_ld: 'Parecer LDO', tecnico: 'Técnico',
      data_liberacao: 'Data Liberação', area_estagio_situacao_demanda: 'Área - Situação',
      situacao_analise_demanda: 'Situação Análise', data_analise_demanda: 'Data Análise',
      motivo_retorno_diligencia: 'Motivo Retorno', data_retorno_diligencia: 'Data Retorno Dilig.',
      conferencista: 'Conferencista', data_recebimento_demanda: 'Data Recebimento',
      data_retorno: 'Data Retorno', observacao_motivo_retorno: 'Observações',
      data_liberacao_assinatura_conferencista: 'Data Lib. Assin. Conf.',
      data_liberacao_assinatura: 'Data Lib. Assinatura', falta_assinatura: 'Falta Assinatura',
      assinatura: 'Assinatura', publicacao: 'Publicação', vigencia: 'Vigência',
      encaminhado_em: 'Encaminhado em', concluida_em: 'Concluída em',
      lote: 'Lote', prioridade: 'Prioridade',
    };
    const DATE_COLUMNS = new Set([
      'data_liberacao', 'data_analise_demanda', 'data_retorno_diligencia',
      'data_recebimento_demanda', 'data_retorno', 'data_liberacao_assinatura_conferencista',
      'data_liberacao_assinatura', 'assinatura', 'publicacao', 'vigencia',
      'encaminhado_em', 'concluida_em',
    ]);
    const FALTA_ASSINATURA_ORDER = [
      'GESTOR ADMINISTRATIVO DRS', 'GESTOR TÉCNICO DRS', 'DIRETOR DRS',
      'COORDENADOR CRS', 'DIRETOR GGCON', 'ORDENADOR DE DESPESAS',
      'SECRETÁRIO', 'GESTOR – CONVÊNIO / DEMANDANTE', 'ORÇAMENTO CGOF',
      'CHEFIA DE GABINETE', 'AGUARDANDO RESOLUÇÃO', 'NOTA DE RESERVA - GCF',
      'AGUARDANDO FINALIZAÇÃO', 'LOTE3'
    ];
    const cols = (Object.entries(visibleColumns) as [string, boolean][])
      .filter(([k, v]) => v && k !== 'seq' && COLUMN_MAP[k])
      .map(([k]) => ({ key: k, label: COLUMN_MAP[k] }));

    const escape = (v: any) => {
      const s = v === null || v === undefined ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const lines = [
      cols.map(c => escape(c.label)).join(','),
      ...data.map(row =>
        cols.map(({ key }) => {
          const v = (row as any)[key];
          if (v === null || v === undefined || v === '') return '';
          if (DATE_COLUMNS.has(key)) return escape(formatDateForDisplay(String(v)));
          if (key === 'falta_assinatura') {
            const parts = String(v).split(',').map((s: string) => s.trim()).filter(Boolean);
            const sorted = parts.sort((a, b) => {
              const ia = FALTA_ASSINATURA_ORDER.indexOf(a);
              const ib = FALTA_ASSINATURA_ORDER.indexOf(b);
              return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
            });
            return escape(sorted.join(', '));
          }
          return escape(v);
        }).join(',')
      ),
    ];

    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = `formalizacao_${new Date().toISOString().slice(0, 10)}.csv`;
    a.download = fileName;
    console.log('💾 SALVANDO ARQUIVO CSV:', fileName, 'com', data.length, 'registros');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('✅ ARQUIVO CSV SALVO COM SUCESSO!');
    } catch (error) {
      console.error('❌ ERRO AO EXPORTAR CSV:', error);
      alert('❌ Erro ao exportar arquivo. Verifique o console.');
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  const handleDeleteFormalizacao = async (id: number) => {
    const formaliz = formalizacoes.find(f => f.id === id);
    if (!formaliz) return;
    setFormalizacaoParaDeletar(formaliz);
    setSenhaParaDeletarFormalizacao('');
    setShowDeleteFormalizacaoModal(true);
  };

  const confirmarDeletarFormalizacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formalizacaoParaDeletar && selectedRows.size === 0) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('Token não encontrado. Faça login novamente.');
        return;
      }

      // Se é modo lote (selectedRows.size > 0)
      if (selectedRows.size > 0 && !formalizacaoParaDeletar) {
        // Deletar múltiplos
        const ids = Array.from(selectedRows).map(id => parseInt(String(id))).filter(id => !isNaN(id));
        
        for (const id of ids) {
          const response = await fetch(`/api/formalizacao/${id}`, { 
            method: 'DELETE',
            headers: {
              ...getHeaders(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ senha: senhaParaDeletarFormalizacao })
          });

          if (!response.ok) {
            const errorData = await response.json();
            alert(errorData.error || 'Erro ao deletar formalizacao');
            return;
          }
        }

        // Remoção otimista do cache local
        const idsSet = new Set(ids);
        const removeFromList = (list: any[]) => list.filter((f: any) => !idsSet.has(f.id));
        if (allDataCacheRef.current.length > 0) {
          allDataCacheRef.current = removeFromList(allDataCacheRef.current);
        }
        if (filteredForExportRef.current.length > 0) {
          filteredForExportRef.current = removeFromList(filteredForExportRef.current);
        }
        setFormalizacoes(prev => removeFromList(prev));
        setFormalizacaoSearchResult(prev => ({
          ...prev,
          data: removeFromList(prev.data),
          total: Math.max(0, prev.total - ids.length)
        }));

        setSelectedRows(new Set());
        setShowDeleteFormalizacaoModal(false);
        setSenhaParaDeletarFormalizacao('');
        alert(`✅ ${ids.length} formalização(ões) deletada(s) com sucesso!`);
        return;
      }

      // Se é modo individual (formalizacaoParaDeletar)
      const response = await fetch(`/api/formalizacao/${formalizacaoParaDeletar.id}`, { 
        method: 'DELETE',
        headers: {
          ...getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ senha: senhaParaDeletarFormalizacao })
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Erro ao deletar formalizacao');
        return;
      }

      // Remoção otimista do cache local
      const delId = formalizacaoParaDeletar.id;
      const removeById = (list: any[]) => list.filter((f: any) => f.id !== delId);
      if (allDataCacheRef.current.length > 0) {
        allDataCacheRef.current = removeById(allDataCacheRef.current);
      }
      if (filteredForExportRef.current.length > 0) {
        filteredForExportRef.current = removeById(filteredForExportRef.current);
      }
      setFormalizacoes(prev => removeById(prev));
      setFormalizacaoSearchResult(prev => ({
        ...prev,
        data: removeById(prev.data),
        total: Math.max(0, prev.total - 1)
      }));
      if (selectedFormalizacao?.id === formalizacaoParaDeletar.id) {
        setSelectedFormalizacao(null);
      }
      setShowDeleteFormalizacaoModal(false);
      setFormalizacaoParaDeletar(null);
      setSenhaParaDeletarFormalizacao('');
      alert('Formalização deletada com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir formalização:', error);
      alert('Erro ao deletar formalização. Tente novamente.');
    }
  };

  // Limpar TODOS os filtros (filters + headerFilters + columnTextFilters + searchTerm)
  const clearAllFilters = () => {
    setFilters({
      ano: [], demandas_formalizacao: [], area_estagio: [], recurso: [], tecnico: [],
      data_liberacao: [], area_estagio_situacao_demanda: [], situacao_analise_demanda: [],
      data_analise_demanda: [], conferencista: [], data_recebimento_demanda: [],
      data_retorno: [], falta_assinatura: [], publicacao: [], vigencia: [],
      encaminhado_em: [], concluida_em: [], parlamentar: [], partido: [],
      regional: [], municipio: [], conveniado: [], objeto: [], classificacao_emenda_demanda: [],
      lote: [], prioridade: [],
    });
    setHeaderFilters({});
    setColumnTextFilters({});
    setSearchTerm('');
    setBuscaListaText('');
    setBuscaListaTerms([]);
    setDataInicioFilter('');
    setDataFimFilter('');
    setHideEmptyFields({});
    setShowOnlyEmptyFields({});
    setShowSomenteMinhas(false);
    setFundoAFundoFilter(false);
    fetchFormalizacoesComFiltros(0, { ano: [], demandas_formalizacao: [], area_estagio: [], recurso: [], tecnico: [], data_liberacao: [], area_estagio_situacao_demanda: [], situacao_analise_demanda: [], data_analise_demanda: [], conferencista: [], data_recebimento_demanda: [], data_retorno: [], falta_assinatura: [], publicacao: [], vigencia: [], encaminhado_em: [], concluida_em: [], parlamentar: [], partido: [], regional: [], municipio: [], conveniado: [], objeto: [], classificacao_emenda_demanda: [], lote: [], prioridade: [] }, undefined, false);
  };

  // Silent background refresh: invalidate cache and reload data with progress bar (preserva filtros)
  const silentRefreshData = async () => {
    console.log('🔄 Silent refresh: recarregando dados em background...');
    allDataCacheRef.current = [];
    cacheTimestampRef.current = 0;
    localStorage.removeItem('formalizacoes_cache');
    localStorage.removeItem('formalizacoes_cache_time');
    await fetchFormalizacoesComFiltros(paginaAtual);
  };

  // Forcóa atualização real do banco: passa nocache=1 para IGNORAR o cache Cloudflare
  // Usar após importações ou quando o botão "Forçar Atualização BD" é clicado
  // silent=true: refresh em background sem indicadores visuais (não perturba o usuário)
  const forceRefreshFromDB = async (silent = false) => {
    console.log(silent ? '🔄 Background refresh silencioso...' : '🚨 Force refresh FROM DB: ignorando cache Cloudflare...');
    allDataCacheRef.current = [];
    cacheTimestampRef.current = 0;
    localStorage.removeItem('formalizacoes_cache');
    localStorage.removeItem('formalizacoes_cache_time');
    await fetchFormalizacoesComFiltros(paginaAtual, undefined, undefined, undefined, true /* nocache */, silent);
  };

  // Auto-refresh periódico silencioso (a cada 5 minutos, preserva filtros)
  useEffect(() => {
    if (activeTab !== 'formalizacao') return;
    const interval = setInterval(() => {
      console.log('⏰ Auto-refresh periódico silencioso...');
      cacheTimestampRef.current = 0; // Invalida cache para forçar re-fetch na próxima aplicação de filtros
    }, CACHE_VALIDITY_MS);
    return () => clearInterval(interval);
  }, [activeTab]);

  // ────────────────────────────────────────────────────────────
  // Force-reload para TODOS os usuários: polling server-side
  // Admin grava um timestamp via POST /api/admin/force-reload.
  // Todos os clientes verificam periodicamente e na volta da aba.
  // ────────────────────────────────────────────────────────────
  const checkForceReload = async () => {
    if (!token) return;
    try {
      const resp = await fetch('/api/admin/force-reload', { headers: getHeaders() });
      if (!resp.ok) return;
      const { force_reload_at } = await resp.json() as { force_reload_at: number };
      if (!force_reload_at || force_reload_at === 0) return;
      // Se o servidor tem timestamp MAIS RECENTE que o cache local → recarregar
      const localCacheTime = cacheTimestampRef.current;
      if (force_reload_at > localCacheTime) {
        console.log('🔔 Admin solicitou atualização geral — recarregando dados em background...');
        await forceRefreshFromDB(true /* silent */);
      }
    } catch { /* silencioso */ }
  };

  useEffect(() => {
    if (!token) return;
    // Verifica a cada 2 minutos
    const interval = setInterval(checkForceReload, 2 * 60 * 1000);
    // Verifica imediatamente quando usuário volta para a aba
    const onVisible = () => { if (document.visibilityState === 'visible') checkForceReload(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [token]);

  // Busca quando (e quem) fez a última importação real de emendas — valor
  // compartilhado por todos os usuários, gravado pelo servidor ao final do
  // "Importar Emendas" (ver handleImportEmendas / setImportStatus('done')).
  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/ultima-importacao', { headers: getHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.em) setUltimaImportacao({ em: d.em, usuario: d.usuario }); })
      .catch(() => { /* silencioso */ });
  }, [token]);

  // ── Polling de Notificações de Atribuição ────────────────────────────────
  // Verifica a cada 60s se há notificações pendentes para o usuário ou (admin) para todos
  useEffect(() => {
    if (!token) return;
    const fetchNotificacoes = async () => {
      try {
        const r = await fetch('/api/notificacoes', { headers: getHeaders() });
        if (!r.ok) {
          const errText = await r.text().catch(() => '');
          console.error(`[notificacoes] Erro HTTP ${r.status}:`, errText.substring(0, 200));
          return;
        }
        const data = await r.json() as { items: any[]; total: number; pendentes: number; confirmadas: number };
        const items: any[] = data.items || [];
        if (isAdmin) {
          setNotifTodas(items);
          setNotifPendentes(items.filter((n: any) => !n.confirmado));
        } else {
          const pendentes = items.filter((n: any) => !n.confirmado);
          setNotifPendentes(pendentes);
          setNotifTodas(items);
          // Auto-show modal se houver pendentes ainda não mostrados
          if (pendentes.length > 0) {
            const hasNew = pendentes.some((n: any) => !notifModalShownRef.current.has(n.id));
            if (hasNew) {
              pendentes.forEach((n: any) => notifModalShownRef.current.add(n.id));
              setShowNotifModal(true);
            }
          }
        }
      } catch (e) { console.error('[notificacoes] Exceção no polling:', e); }
    };
    fetchNotificacoes();
    const interval = setInterval(fetchNotificacoes, 60 * 1000);
    const onVisible2 = () => { if (document.visibilityState === 'visible') fetchNotificacoes(); };
    document.addEventListener('visibilitychange', onVisible2);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible2);
    };
  }, [token, isAdmin]);
  // ─────────────────────────────────────────────────────────────────────────

  // Abre o formulário de edição com dados FRESCOS do servidor (evita cache stale)
  const openEditFormFresh = async (f: any) => {
    setFormDirty(false);
    setSaveErrorToast(null);
    setConfirmDiscard(false);
    let recordToEdit = f;
    try {
      const resp = await fetch(`/api/formalizacao/${f.id}`, { headers: getHeaders() });
      if (resp.ok) {
        const fresh = await resp.json();
        const freshRecord = Array.isArray(fresh) ? fresh[0] : fresh;
        if (freshRecord) {
          recordToEdit = freshRecord;
          // Atualizar cache local com dado fresco para manter consistência
          if (allDataCacheRef.current.length > 0) {
            allDataCacheRef.current = allDataCacheRef.current.map((x: any) =>
              x.id === freshRecord.id ? { ...x, ...freshRecord } : x
            );
          }
          setFormalizacoes(prev => prev.map((x: any) =>
            x.id === freshRecord.id ? { ...x, ...freshRecord } : x
          ));
        }
      }
    } catch (_) { /* usa cache se falhar */ }
    setEditingFormalizacao(recordToEdit);
    setIsFormalizacaoFormOpen(true);
  };

  const closeEditForm = () => {
    if (formDirty) {
      setConfirmDiscard(true);
    } else {
      setIsFormalizacaoFormOpen(false);
      setEditingFormalizacao(null);
      setFormDirty(false);
      setSaveErrorToast(null);
    }
  };

  const discardAndClose = () => {
    setConfirmDiscard(false);
    setIsFormalizacaoFormOpen(false);
    setEditingFormalizacao(null);
    setFormDirty(false);
    setSaveErrorToast(null);
  };

  // ── Mecânica compartilhada pelos botões de ação rápida do formulário de
  // edição (Demanda Analisada, Liberação Conferência) — extraída pra não
  // duplicar a mesma lógica em cada botão. Cada botão continua responsável
  // pela sua própria lógica extra (ex: "Demanda Analisada" também ajusta a
  // Área - Estágio); esta função só cuida da parte idêntica entre eles.
  //
  // Preenche um campo de data escondido (por id) com a data de hoje e atualiza
  // o texto exibido ao lado. Retorna a data em YYYY-MM-DD para quem precisar
  // reaproveitar (ex: "Demanda Analisada" usa a mesma data pra liberar a
  // demanda para conferência).
  const preencherDataDeHoje = (hiddenInputId: string, displaySpanId?: string): string => {
    const now = new Date();
    const dataHoje = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const hiddenInput = document.getElementById(hiddenInputId) as HTMLInputElement | null;
    if (hiddenInput) hiddenInput.value = dataHoje;
    if (displaySpanId) {
      const displaySpan = document.getElementById(displaySpanId);
      if (displaySpan) displaySpan.textContent = formatDateForDisplay(dataHoje);
    }
    return dataHoje;
  };

  // Marca o formulário como alterado e dispara o submit — chamar DEPOIS de
  // preencher todos os campos necessários (a leitura do FormData acontece no
  // momento do requestSubmit, então qualquer valor setado depois não entraria
  // no salvamento). keepOpen mantém o modal aberto após salvar, em vez de
  // fechar como o "Atualizar Registro" normal faz.
  const salvarFormularioRapido = (keepOpen: boolean) => {
    setFormDirty(true);
    if (keepOpen) keepFormOpenAfterSaveRef.current = true;
    editFormRef.current?.requestSubmit();
  };

  const handleSubmitFormalizacao = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = {};
    // Collect falta_assinatura checkboxes as comma-separated string
    const demandaAssinadaFlag = formData.get('demanda_assinada_flag');
    if (demandaAssinadaFlag && String(demandaAssinadaFlag).trim() === 'DEMANDA ASSINADA') {
      data['falta_assinatura'] = 'DEMANDA ASSINADA';
    } else {
      const faltaAssinatura = formData.getAll('falta_assinatura');
      if (faltaAssinatura.length > 0) {
        data['falta_assinatura'] = faltaAssinatura.join(', ');
      } else {
        data['falta_assinatura'] = '';
      }
    }
    formData.forEach((value, key) => {
      if (key === 'falta_assinatura' || key === 'demanda_assinada_flag') return; // already handled
      if (key.includes('valor')) {
        data[key] = value ? Number(value) : 0;
      } else {
        data[key] = value;
      }
    });

    // ── Auto-preenche data_analise_demanda ao sair do estágio "preso" ────────
    // Quando o técnico muda area_estagio_situacao_demanda de "DEMANDA COM O TÉCNICO"
    // para qualquer outro estado produtivo, e não informou a data manualmente,
    // preenche automaticamente com hoje. Isso garante produtividade por data correta.
    if (editingFormalizacao) {
      const estagioAnterior = (editingFormalizacao.area_estagio_situacao_demanda ?? '').trim().toUpperCase();
      const estagioNovo     = (data.area_estagio_situacao_demanda ?? '').trim().toUpperCase();
      const eraPreso = estagioAnterior.startsWith('DEMANDA COM O TÉCNICO');
      const agoraAvancou = estagioNovo && !estagioNovo.startsWith('DEMANDA COM O TÉCNICO') && estagioNovo !== estagioAnterior;
      if (eraPreso && agoraAvancou && !(data.data_analise_demanda ?? '').trim()) {
        // Usa data de hoje no formato YYYY-MM-DD (compatível com o campo date do banco)
        data.data_analise_demanda = new Date().toISOString().slice(0, 10);
      }
      // Mesma lógica para "liberado para conferência": se o técnico escolheu "EM CONFERÊNCIA"
      // (ou variante Fundo a Fundo) direto no select — sem passar pelo botão "Demanda Analisada" —
      // marca a liberação do mesmo jeito, senão a demanda fica "presa" sem aparecer no filtro.
      if (estagioNovo.startsWith('EM CONFERÊNCIA') && !(data.data_liberacao_conferencia ?? '').trim() && !(editingFormalizacao.data_liberacao_conferencia ?? '').trim()) {
        data.data_liberacao_conferencia = new Date().toISOString().slice(0, 10);
      }
      // Desfaz a liberação automaticamente quando o técnico analisou errado: se a demanda
      // já estava liberada (data_liberacao_conferencia preenchida) e o técnico tira o estágio
      // de "EM CONFERÊNCIA" para outra coisa antes de um conferencista ser atribuído, a
      // liberação não faz mais sentido — sem isso a linha continuava marcada como "liberada
      // para conferência" mesmo com a Área – Estágio já apontando para outro lugar.
      if (
        !estagioNovo.startsWith('EM CONFERÊNCIA') &&
        estagioNovo !== estagioAnterior &&
        (editingFormalizacao.data_liberacao_conferencia ?? '').trim() !== '' &&
        !(data.conferencista ?? editingFormalizacao.conferencista ?? '').trim() &&
        !(data.data_liberacao_conferencia ?? '').trim()
      ) {
        data.data_liberacao_conferencia = '';
      }
    }
    // Auto-preenche data_recebimento_demanda para o conferencista de forma análoga.
    // Quando conferencista assume e não preencheu: usa hoje.
    if (editingFormalizacao) {
      const confAnterior = (editingFormalizacao.conferencista ?? '').trim();
      const confNovo     = (data.conferencista ?? '').trim();
      const isConfAtual  = confNovo && confNovo !== confAnterior;
      if (isConfAtual && !(data.data_recebimento_demanda ?? '').trim() && !(editingFormalizacao.data_recebimento_demanda ?? '').trim()) {
        data.data_recebimento_demanda = new Date().toISOString().slice(0, 10);
      }
    }

    // Captura snapshot para rollback em caso de erro
    const savedId = editingFormalizacao?.id;
    const prevRecord = savedId
      ? (allDataCacheRef.current.find((f: any) => f.id === savedId) ?? editingFormalizacao)
      : null;
    // Snapshot das linhas irmãs (mesma "demanda" — emendas agregadoras) para rollback,
    // já que elas também recebem update otimista com os campos de tramitação propagados.
    const demandaGrupoValue = editingFormalizacao?.demanda;
    const prevSiblingRecords = (savedId && demandaGrupoValue)
      ? allDataCacheRef.current.filter((f: any) => f.id !== savedId && f.demanda === demandaGrupoValue)
      : [];

    // Marca esta submissão como a mais recente para este registro (ver comentário no ref)
    const mySubmitSeq = savedId ? (latestSubmitSeqRef.current.get(savedId) ?? 0) + 1 : 0;
    if (savedId) latestSubmitSeqRef.current.set(savedId, mySubmitSeq);

    // Ação rápida (Demanda Analisada / Liberação Conferência / Remover) pede pra manter o modal aberto
    const keepOpen = keepFormOpenAfterSaveRef.current;
    keepFormOpenAfterSaveRef.current = false;

    // UPDATE OTIMISTA VERDADEIRO: aplica no UI e fecha o form ANTES da resposta do servidor
    if (editingFormalizacao) {
      const optimisticRecord = { ...editingFormalizacao, ...data };
      // Campos de tramitação também propagados para as linhas irmãs (mesma demanda),
      // espelhando a propagação feita pelo backend (ver PROPAGATE_TO_GRUPO_FIELDS).
      const propagateFields: Record<string, unknown> = {};
      for (const field of PROPAGATE_TO_GRUPO_FIELDS) {
        if (field in data) propagateFields[field] = data[field];
      }
      const hasGroupPropagation = !!demandaGrupoValue && Object.keys(propagateFields).length > 0;
      const applyUpdate = (list: any[]) =>
        list.map((f: any) => {
          if (f.id === editingFormalizacao.id) return { ...f, ...optimisticRecord };
          if (hasGroupPropagation && f.demanda === demandaGrupoValue) return { ...f, ...propagateFields };
          return f;
        });

      if (allDataCacheRef.current.length > 0) {
        allDataCacheRef.current = applyUpdate(allDataCacheRef.current);
        syncLocalStorageCache();
      }
      if (filteredForExportRef.current.length > 0) {
        filteredForExportRef.current = applyUpdate(filteredForExportRef.current);
      }
      setFormalizacoes(prev => applyUpdate(prev));
      setFormalizacaoSearchResult(prev => ({ ...prev, data: applyUpdate(prev.data) }));
      if (selectedFormalizacao?.id === editingFormalizacao.id) {
        setSelectedFormalizacao(optimisticRecord);
      }
      setDashboardRefreshKey(k => k + 1);

      if (keepOpen) {
        // Mantém o modal aberto, só atualiza os valores exibidos (ex: badge de liberação)
        setEditingFormalizacao(optimisticRecord);
      }
    }

    if (keepOpen) {
      setFormDirty(false);
    } else {
      // Fecha o formulário imediatamente — o usuário não precisa esperar
      setIsFormalizacaoFormOpen(false);
      setEditingFormalizacao(null);
      setFormDirty(false);
    }
    setIsSaving(true);

    const rollback = () => {
      if (!savedId || !prevRecord) return;
      // Não reverte se uma submissão mais nova já assumiu este registro
      if (latestSubmitSeqRef.current.get(savedId) !== mySubmitSeq) return;
      const revert = (list: any[]) =>
        list.map((f: any) => {
          if (f.id === savedId) return prevRecord;
          const sibling = prevSiblingRecords.find((s: any) => s.id === f.id);
          return sibling ?? f;
        });
      allDataCacheRef.current = revert(allDataCacheRef.current);
      filteredForExportRef.current = revert(filteredForExportRef.current);
      setFormalizacoes(prev => revert(prev));
      setFormalizacaoSearchResult(prev => ({ ...prev, data: revert(prev.data) }));
      setSelectedFormalizacao(prev => prev?.id === savedId ? prevRecord : prev);
      syncLocalStorageCache();
    };

    try {
      const url = savedId ? `/api/formalizacao/${savedId}` : '/api/formalizacao';
      const method = savedId ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Erro ao salvar:', response.status, errText);
        rollback();
        setSaveErrorToast('Erro ao salvar. As alterações foram revertidas. Tente novamente.');
        setTimeout(() => setSaveErrorToast(null), 6000);
        setIsSaving(false);
        return;
      }

      // Sincroniza com dados retornados pelo servidor (inclui campos calculados / trigger)
      const serverData = await response.json().catch(() => null);
      const isStaleResponse = savedId ? latestSubmitSeqRef.current.get(savedId) !== mySubmitSeq : false;
      if (serverData && savedId && !isStaleResponse) {
        const serverRecord = serverData.data ?? serverData;
        if (serverRecord && typeof serverRecord === 'object' && serverRecord.id) {
          const mergedData = { ...(prevRecord || {}), ...data, ...serverRecord };
          const syncUpdate = (list: any[]) =>
            list.map((f: any) => f.id === savedId ? { ...f, ...mergedData } : f);
          allDataCacheRef.current = syncUpdate(allDataCacheRef.current);
          filteredForExportRef.current = syncUpdate(filteredForExportRef.current);
          setFormalizacoes(prev => syncUpdate(prev));
          setFormalizacaoSearchResult(prev => ({ ...prev, data: syncUpdate(prev.data) }));
          setSelectedFormalizacao(prev => prev?.id === savedId ? mergedData : prev);
          syncLocalStorageCache();
        }
      }
    } catch (error) {
      console.error('Erro ao salvar formalização:', error);
      rollback();
      setSaveErrorToast('Erro de conexão ao salvar. As alterações foram revertidas.');
      setTimeout(() => setSaveErrorToast(null), 6000);
    } finally {
      setIsSaving(false);
    }
  };

  // Para formalizações, usar os dados do servidor já filtrados
  const filteredFormalizacoes = formalizacaoSearchResult.data;

  // Função para ordenar dados (Excel-like: numérico, data, texto)
  const sortData = (data: any[], column: string, order: string) => {
    const sorted = [...data];

    // Colunas numéricas (devem ordenar como número)
    const numericColumns = new Set(['seq', 'ano', 'valor', 'demanda', 'demandas_formalizacao']);
    // Colunas de data (devem ordenar como data)
    const dateColumns = new Set([
      'data_liberacao', 'data_analise_demanda', 'data_retorno_diligencia',
      'data_recebimento_demanda', 'data_retorno', 'data_liberacao_assinatura_conferencista',
      'data_liberacao_assinatura', 'assinatura', 'publicacao', 'vigencia',
      'encaminhado_em', 'concluida_em'
    ]);

    // Parsear data em vários formatos → timestamp para comparação
    const parseDate = (val: string): number | null => {
      if (!val || val === '—' || val.trim() === '') return null;
      const s = val.trim();
      // DD/MM/YYYY
      const brMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (brMatch) {
        const [, d, m, y] = brMatch;
        return new Date(+y, +m - 1, +d).getTime();
      }
      // YYYY-MM-DD (com ou sem hora)
      const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (isoMatch) {
        const [, y, m, d] = isoMatch;
        return new Date(+y, +m - 1, +d).getTime();
      }
      return null;
    };

    // Extrair número de uma string (1.234,56 → 1234.56; "2024" → 2024)
    const parseNum = (val: any): number | null => {
      if (val == null) return null;
      if (typeof val === 'number') return val;
      const s = String(val).trim();
      if (s === '' || s === '—') return null;
      // Tentar extrair número: remover pontos de milhar, trocar vírgula por ponto
      const cleaned = s.replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
      const n = parseFloat(cleaned);
      return isNaN(n) ? null : n;
    };

    const isNumeric = numericColumns.has(column);
    const isDate = dateColumns.has(column);

    sorted.sort((a, b) => {
      // Mapear chaves de coluna para propriedades do objeto
      const keyMap: { [key: string]: string } = {
        'seq': 'id',
        'ano': 'ano',
        'parlamentar': 'parlamentar',
        'partido': 'partido',
        'emenda': 'emenda',
        'emendas_agregadoras': 'emendas_agregadoras',
        'demanda': 'demanda',
        'demandas_formalizacao': 'demandas_formalizacao',
        'numero_convenio': 'numero_convenio',
        'classificacao_emenda_demanda': 'classificacao_emenda_demanda',
        'tipo_formalizacao': 'tipo_formalizacao',
        'regional': 'regional',
        'municipio': 'municipio',
        'conveniado': 'conveniado',
        'objeto': 'objeto',
        'portfolio': 'portfolio',
        'valor': 'valor',
        'situacao_emenda': 'situacao_emenda',
        'situacao_demandas_sempapel': 'situacao_demandas_sempapel',
        'area_estagio': 'area_estagio',
        'recurso': 'recurso',
        'tecnico': 'tecnico',
        'data_liberacao': 'data_liberacao',
        'area_estagio_situacao_demanda': 'area_estagio_situacao_demanda',
        'situacao_analise_demanda': 'situacao_analise_demanda',
        'data_analise_demanda': 'data_analise_demanda',
        'motivo_retorno_diligencia': 'motivo_retorno_diligencia',
        'data_retorno_diligencia': 'data_retorno_diligencia',
        'conferencista': 'conferencista',
        'data_recebimento_demanda': 'data_recebimento_demanda',
        'data_retorno': 'data_retorno',
        'observacao_motivo_retorno': 'observacao_motivo_retorno',
        'data_liberacao_assinatura_conferencista': 'data_liberacao_assinatura_conferencista',
        'data_liberacao_assinatura': 'data_liberacao_assinatura',
        'falta_assinatura': 'falta_assinatura',
        'assinatura': 'assinatura',
        'publicacao': 'publicacao',
        'vigencia': 'vigencia',
        'encaminhado_em': 'encaminhado_em',
        'concluida_em': 'concluida_em'
      };
      
      const key = keyMap[column] || column;
      const aVal = a[key];
      const bVal = b[key];
      
      // Tratar valores nulos/vazios — sempre por último
      const aEmpty = aVal == null || String(aVal).trim() === '' || String(aVal).trim() === '—';
      const bEmpty = bVal == null || String(bVal).trim() === '' || String(bVal).trim() === '—';
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;  // vazios sempre no final
      if (bEmpty) return -1;
      
      let comparison = 0;

      if (isDate) {
        const aDate = parseDate(String(aVal));
        const bDate = parseDate(String(bVal));
        if (aDate != null && bDate != null) {
          comparison = aDate - bDate;
        } else if (aDate != null) {
          comparison = -1;
        } else if (bDate != null) {
          comparison = 1;
        } else {
          comparison = String(aVal).localeCompare(String(bVal), 'pt-BR');
        }
      } else if (isNumeric) {
        const aNum = parseNum(aVal);
        const bNum = parseNum(bVal);
        if (aNum != null && bNum != null) {
          comparison = aNum - bNum;
        } else if (aNum != null) {
          comparison = -1;
        } else if (bNum != null) {
          comparison = 1;
        } else {
          comparison = String(aVal).localeCompare(String(bVal), 'pt-BR');
        }
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        // Para qualquer coluna: se ambos parecem numéricos, comparar como número
        const aNum = parseNum(aVal);
        const bNum = parseNum(bVal);
        if (aNum != null && bNum != null) {
          comparison = aNum - bNum;
        } else {
          comparison = String(aVal).localeCompare(String(bVal), 'pt-BR');
        }
      }
      
      return order === 'asc' ? comparison : -comparison;
    });
    return sorted;
  };

  // Dados já vem ordenados de fetchFormalizacoesComFiltros (sort antes de paginar)
  const formalizacoesPaginadas = activeTab === 'formalizacao' ? formalizacaoSearchResult.data : [];
  const totalPaginas = Math.ceil(formalizacaoSearchResult.total / itensPorPagina);
  
  // Debug: Log whenever we're about to render
  React.useEffect(() => {
    if (activeTab === 'formalizacao' && formalizacaoSearchResult.data?.length >= 0) {
      console.log(`🎨 RENDER CHECK - activeTab=${activeTab}, formalizacoesPaginadas.length=${formalizacoesPaginadas.length}, formalizacaoSearchResult.data.length=${formalizacaoSearchResult.data?.length}, formalizacaoSearchResult.total=${formalizacaoSearchResult.total}`);
    }
  }, [activeTab, formalizacaoSearchResult]);

  // 🎯 DRAG TO SCROLL: Handlers para drag-to-scroll
  const handleTableMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = tableContainerRef.current;
    if (!container) return;

    dragStateRef.current.isDown = true;
    dragStateRef.current.startX = e.pageX;
    dragStateRef.current.scrollLeft = container.scrollLeft;
    dragStateRef.current.hasMoved = false;
    setIsDraggingScroll(true);
    console.log('🖱️ MOUSEDOWN:', { pageX: e.pageX, scrollLeft: container.scrollLeft });
  };

  const handleTableMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.isDown) return;

    const container = tableContainerRef.current;
    if (!container) return;

    const walk = e.pageX - dragStateRef.current.startX;
    
    if (Math.abs(walk) > 3) {
      dragStateRef.current.hasMoved = true;
      container.scrollLeft = dragStateRef.current.scrollLeft - walk;
      console.log('🔄 SCROLLING:', { walk, scrollLeft: container.scrollLeft });
    }
  };

  const handleTableMouseUp = () => {
    dragStateRef.current.isDown = false;
    setIsDraggingScroll(false);
    console.log('🖱️ MOUSEUP!');
  };

  const handleTableMouseLeave = () => {
    dragStateRef.current.isDown = false;
    setIsDraggingScroll(false);
  };

  // Normalizar data para DD/MM/YYYY, detectando formato automaticamente
  const formatDateForDisplay = (dateStr: string): string => {
    if (!dateStr || dateStr === '—') return '—';
    
    // Limpar espaços
    dateStr = dateStr.trim();
    if (!dateStr) return '—';
    
    // Se já está em DD/MM/YYYY (10 caracteres com /)
    if (dateStr.length === 10 && dateStr.includes('/') && dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return dateStr;
    }
    
    // Se está em YYYY-MM-DD ou YYYY-MM-DD HH:MM:SS
    if (dateStr.includes('-')) {
      const parts = dateStr.split(' ')[0].split('-'); // Pega apenas DD-MM-YYYY ignorando hora
      if (parts.length === 3) {
        const [year, month, day] = parts;
        // Verificar se é YYYY-MM-DD (4 dígitos no início)
        if (year.length === 4) {
          return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
        }
      }
    }
    
    // Fallback: retorna como está
    return dateStr.substring(0, 10);
  };

  const formatCurrency = (value?: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  // Formatar número de emenda no padrão 0000.000.0000
  const formatEmendaNumber = (value?: string): string => {
    if (!value) return '—';
    const digits = value.replace(/\D/g, '');
    if (digits.length >= 10) {
      return `${digits.slice(0, 4)}.${digits.slice(4, 7)}.${digits.slice(7)}`;
    }
    return value;
  };

  return (
    <div className="h-screen bg-[#f1f5f9] text-black font-sans flex flex-col overflow-hidden">

      {/* Toast de erro ao salvar */}
      <AnimatePresence>
        {saveErrorToast && (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 bg-red-600 text-white px-5 py-3 rounded-xl shadow-2xl max-w-md"
          >
            <XCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{saveErrorToast}</span>
            <button
              type="button"
              onClick={() => setSaveErrorToast(null)}
              className="ml-2 p-0.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-[#071d42] z-50 shadow-xl flex-shrink-0 border-b border-white/10">
        <div className="px-2 sm:px-4">
          <div className="flex justify-between items-center h-14 gap-2">
            {/* Left: Hamburger + Logo + Title + Nav */}
            <div className="flex items-center gap-2">
              {/* Hamburger — primeiro elemento, abre/fecha sidebar */}
              <button
                onClick={() => setIsSidebarOpen(v => !v)}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/15 transition-all flex-shrink-0"
                title={isSidebarOpen ? 'Recolher menu' : 'Expandir menu'}
              >
                {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <img
                src={logo1Img}
                alt="Governo do Estado de São Paulo — Secretaria da Saúde"
                className="h-11 sm:h-12 object-contain flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="hidden md:flex flex-col justify-center">
                <h1 className="text-sm font-bold text-white leading-tight">Controle de Formalização</h1>
                <span className="text-[10px] text-white/50">Gestão de Emendas e Convênios</span>
              </div>
              <div className="h-7 w-px bg-white/20 hidden md:block" />
              {/* Nav sempre visível — antes ficava "hidden md:flex" e sumia inteira em telas
                  estreitas, deixando o usuário sem nenhuma forma de trocar de aba. Os rótulos
                  secundários encolhem pra ícone só em telas bem pequenas (mesmo padrão já usado
                  nos chips da barra de filtros). */}
              <nav className="flex items-center gap-0.5 bg-white/10 p-0.5 rounded-lg flex-shrink-0">
                <button
                  onClick={() => setActiveTab('formalizacao')}
                  title="Formalização"
                  className={`px-2 sm:px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'formalizacao' ? 'bg-white text-[#1351B4] shadow-sm' : 'text-white/90 hover:bg-white/20'}`}
                >
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden lg:inline">Formalização</span>
                </button>
                {(user?.role === 'admin' || user?.role === 'visualizador') && (
                  <>
                    <button
                      onClick={() => setActiveTab('admin')}
                      title="Demonstrativo"
                      className={`px-2 sm:px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'admin' ? 'bg-white text-[#1351B4] shadow-sm' : 'text-white/90 hover:bg-white/20'}`}
                    >
                      <BarChart3 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="hidden lg:inline">Demonstrativo</span>
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => { setNotifFiltroAba('pendentes'); setShowNotifAdminModal(true); }}
                        title="Atribuições"
                        className="relative px-2 sm:px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 text-white/90 hover:bg-white/20 whitespace-nowrap"
                      >
                        <ClipboardList className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="hidden lg:inline">Atribuições</span>
                        {notifPendentes.length > 0 && (
                          <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-900 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow">
                            {notifPendentes.length}
                          </span>
                        )}
                      </button>
                    )}
                  </>
                )}
              </nav>
            </div>
            {/* Center Spacer */}
            <div className="flex-1" />

            {/* Center: Search — expandida em telas largas (xl+), vira ícone com dropdown
                abaixo disso para nunca sumir nem sobrepor os outros blocos do header. */}
            <div className="relative hidden xl:flex items-center gap-1.5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/50" />
                <input
                  type="text"
                  placeholder="Buscar demanda, técnico..."
                  className={`pl-9 pr-3 py-1.5 bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:bg-white/18 focus:border-white/40 rounded-lg text-xs w-60 transition-all outline-none ${buscaListaTerms.length > 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={buscaListaTerms.length > 0}
                />
              </div>
              {/* Botão busca em lista — destacado */}
              <button
                onClick={() => setIsBuscaListaOpen(true)}
                title="Buscar por lista de demandas ou emendas (cole múltiplos códigos)"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ${
                  buscaListaTerms.length > 0
                    ? 'bg-amber-400 text-slate-900 hover:bg-amber-300 shadow-md'
                    : 'bg-white/15 text-white border border-white/25 hover:bg-white/25 hover:border-white/40'
                }`}
              >
                <FileSearch className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  {buscaListaTerms.length > 0 ? `Lista (${buscaListaTerms.length})` : 'Busca em lista'}
                </span>
              </button>
            </div>

            {/* Busca compacta (abaixo de xl) — ícone que abre um dropdown com os mesmos campos */}
            <div className="relative flex xl:hidden items-center flex-shrink-0">
              <button
                onClick={() => setIsMobileSearchOpen(v => !v)}
                title="Buscar demanda, técnico..."
                className={`relative p-2 rounded-lg transition-all ${
                  isMobileSearchOpen || searchTerm || buscaListaTerms.length > 0
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:text-white hover:bg-white/15'
                }`}
              >
                <Search className="w-4 h-4" />
                {buscaListaTerms.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-900 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow">
                    {buscaListaTerms.length}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {isMobileSearchOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onClick={() => setIsMobileSearchOpen(false)}
                      className="fixed inset-0 z-[59]"
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 top-full mt-2 w-72 bg-[#0b2b5c] border border-white/20 rounded-xl shadow-2xl p-3 flex flex-col gap-2 z-[60]"
                    >
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/50" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Buscar demanda, técnico..."
                          className={`w-full pl-9 pr-3 py-1.5 bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:bg-white/18 focus:border-white/40 rounded-lg text-xs transition-all outline-none ${buscaListaTerms.length > 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          disabled={buscaListaTerms.length > 0}
                        />
                      </div>
                      <button
                        onClick={() => { setIsBuscaListaOpen(true); setIsMobileSearchOpen(false); }}
                        className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          buscaListaTerms.length > 0
                            ? 'bg-amber-400 text-slate-900 hover:bg-amber-300 shadow-md'
                            : 'bg-white/15 text-white border border-white/25 hover:bg-white/25 hover:border-white/40'
                        }`}
                      >
                        <FileSearch className="w-3.5 h-3.5 flex-shrink-0" />
                        {buscaListaTerms.length > 0 ? `Lista (${buscaListaTerms.length})` : 'Busca em lista'}
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Right: Tools + User */}
            <div className="flex items-center gap-3">

              {/* 🔔 Alert Bell — admin + técnico notifications */}
              {(() => {
                const allAlertas = [
                  ...(isAdmin ? adminAlertas : []),
                  ...tecnicoAlertas
                ];
                if (allAlertas.length === 0) return null;

                const handleAlertClick = (alertId: number) => {
                  const f = allDataCacheRef.current.find(x => x.id === alertId) || formalizacoes.find(x => x.id === alertId);
                  if (f) {
                    setActiveTab('formalizacao');
                    openEditFormFresh(f);
                  }
                  dismissAlertaModal();
                  setShowAlertasDropdown(false);
                };

                const handleClearAll = () => {
                  if (isAdmin) {
                    adminAlertas.forEach(a => {
                      if (a.tipo === 'Encaminhar ao Financeiro') {
                        alertasVistosRef.current.add(`encaminhar:${a.id}:${a.data}`);
                      } else {
                        const f = allDataCacheRef.current.find(x => x.id === a.id) || formalizacoes.find(x => x.id === a.id);
                        if (f) alertasVistosRef.current.add(makeAlertKey(f));
                      }
                    });
                    saveAlertasVistos(alertasVistosRef.current);
                    setAdminAlertas([]);
                  }
                  tecnicoAlertas.forEach(a => tecnicoAlertasVistosRef.current.add(a.id));
                  saveTecnicoAlertasVistos(tecnicoAlertasVistosRef.current);
                  setTecnicoAlertas([]);
                  setShowAlertasDropdown(false);
                  dismissAlertaModal();
                };

                return (
                <>
                <div className="relative">
                  <button
                    onClick={() => setShowAlertaModal(true)}
                    className="relative p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                    title="Alertas de demandas"
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-pulse">
                      {allAlertas.length}
                    </span>
                  </button>
                </div>

                {/* 🔔 MODAL DE ALERTAS — Destaque na tela */}
                <AnimatePresence>
                  {showAlertaModal && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => dismissAlertaModal()}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -30 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-x-4 top-16 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[520px] max-h-[80vh] z-[9999] bg-white rounded-2xl shadow-2xl border border-red-200 overflow-hidden flex flex-col"
                      >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 py-4 flex items-center justify-between flex-shrink-0">
                          <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-xl">
                              <Bell className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className="text-white font-bold text-base">Alertas de Demandas</h3>
                              <p className="text-white/70 text-[11px]">{allAlertas.length} alerta{allAlertas.length !== 1 ? 's' : ''} — clique para abrir a demanda</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={handleClearAll}
                              className="text-[11px] font-bold text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all">
                              Limpar tudo
                            </button>
                            <button onClick={() => dismissAlertaModal()}
                              className="p-1.5 hover:bg-white/20 rounded-lg transition-all text-white/80 hover:text-white">
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        {/* Alert items */}
                        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                          {allAlertas.map(a => (
                            <button
                              key={`${a.tipo}-${a.id}`}
                              onClick={() => handleAlertClick(a.id)}
                              className="w-full text-left px-5 py-4 hover:bg-blue-50 transition-colors group cursor-pointer"
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                  a.tipo === 'Liberação Conferencista'
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                    : a.tipo === 'Conferida'
                                    ? 'bg-sky-100 text-sky-700 border border-sky-200'
                                    : a.tipo === 'Analisada'
                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                    : a.tipo === 'Encaminhar ao Financeiro'
                                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                    : 'bg-violet-100 text-violet-700 border border-violet-200'
                                }`}>{a.tipo}</span>
                                {a.data && <span className="text-[10px] text-gray-400">{formatDateForDisplay(a.data)}</span>}
                              </div>
                              <p className="text-sm text-gray-700 group-hover:text-[#1351B4] transition-colors leading-relaxed">{a.descricao}</p>
                              <span className="text-[10px] text-gray-400 group-hover:text-[#1351B4] mt-1 inline-flex items-center gap-1 transition-colors">
                                Clique para abrir →
                              </span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
                </>
                );
              })()}

              {/* Última importação de emendas — versão completa em telas médias+ (md), vira só
                  ícone com indicador abaixo disso (nunca desaparece por completo). Vem do
                  servidor (compartilhado por todos os usuários), gravado quando um admin
                  importa um novo arquivo em "Importar Emendas" — não é só o cache deste navegador. */}
              <div
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/8 border border-white/12"
                title={ultimaImportacao ? `Última importação de emendas${ultimaImportacao.usuario ? ` — por ${ultimaImportacao.usuario}` : ''}` : 'Nenhuma importação de emendas registrada ainda'}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ultimaImportacao ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
                <div className="text-right">
                  <p className="text-[9px] text-white/45 uppercase tracking-wide leading-none">Última Importação</p>
                  {ultimaImportacao ? (
                    <p className="text-[11px] font-semibold text-white/80 leading-tight tabular-nums">
                      {new Date(ultimaImportacao.em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      {' '}
                      <span className="text-emerald-300">{new Date(ultimaImportacao.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-white/35 leading-tight">sem registro</p>
                  )}
                </div>
              </div>
              <div
                className="relative md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-white/8 border border-white/12 flex-shrink-0"
                title={ultimaImportacao ? `Última importação de emendas: ${new Date(ultimaImportacao.em).toLocaleString('pt-BR')}${ultimaImportacao.usuario ? ` — por ${ultimaImportacao.usuario}` : ''}` : 'Nenhuma importação de emendas registrada ainda'}
              >
                <Upload className="w-3.5 h-3.5 text-white/60" />
                <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${ultimaImportacao ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
              </div>

              {/* User info — compact, no dropdown (sidebar has all options) */}
              <div className="flex items-center gap-2 pl-2 border-l border-white/20">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold text-white leading-tight">{user?.nome}</p>
                  <p className="text-[10px] text-white/50">
                    {user?.role === 'admin' && 'Administrador'}
                    {user?.role === 'intermediario' && 'Intermediário'}
                    {user?.role === 'usuario' && 'Usuário'}
                    {user?.role === 'visualizador' && 'Visualizador'}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </header>

      {/* ── Body: Sidebar + Main ──────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Admin Sidebar */}
        <AdminSidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(v => !v)}
          isAdmin={!!isAdmin}
          canViewDashboard={!!(user?.role === 'admin' || user?.role === 'visualizador')}
          userName={user?.nome || ''}
          userRole={user?.role || ''}
          onManageUsers={() => setIsUserManagementOpen(true)}
          onImportEmendas={() => setIsImportOpen(true)}
          onUpdateCampos={() => setIsUpdateCamposOpen(true)}
          onForceReload={async () => {
            try {
              await fetch('/api/admin/force-reload', { method: 'POST', headers: getHeaders() });
            } catch { /* silencioso */ }
            forceRefreshFromDB();
          }}
          onViewLogs={() => {
            setLogsBusca('');
            setLogsAdminFiltro('');
            setLogsTipo('auditoria');
            setLogsData([]);
            setLogsLoading(true);
            setShowLogsModal(true);
            const hoje = new Date().toISOString().slice(0, 10);
            setLogsDataInicio(hoje);
            setLogsDataFim(hoje);
            fetch(`/api/admin/logs?tipo=auditoria&data_inicio=${hoje}&data_fim=${hoje}&limit=500`, {
              headers: { 'Authorization': `Bearer ${token}` },
            }).then(r => r.json()).then(d => {
              setLogsData(d.registros || []);
              setLogsTotal(d.total || 0);
            }).finally(() => setLogsLoading(false));
          }}
          onDemonstrativoLote={() => setShowDemonstrativoLote(true)}
          onTrocarSenha={() => { setTrocarSenhaErro(''); setShowSenhaAtual(false); setShowNovaSenha(false); setShowConfirmarSenha(false); setShowTrocarSenhaModal(true); }}
          onAtualizarBD={() => forceRefreshFromDB()}
          onLogout={() => logout()}
        />

      <main className="flex-1 overflow-auto px-3 sm:px-4 py-2">
        {supabaseStatus && !supabaseStatus.supabase && (
          <div className="bg-white border border-blue-200 p-3 rounded-xl mb-4 flex items-start gap-3 shadow-sm">
            <div className="bg-blue-100 p-1.5 rounded-lg">
              <AlertCircle className="text-blue-700 w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-blue-900">Supabase não configurado</h4>
              <p className="text-xs text-red-800 mt-0.5 leading-relaxed">
                O sistema está operando em modo offline (SQLite). Configure as Secrets 
                <code className="bg-blue-100 px-1 rounded mx-1 font-mono">SUPABASE_URL</code> e 
                <code className="bg-blue-100 px-1 rounded mx-1 font-mono">SUPABASE_ANON_KEY</code>.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {/* List Section - Full Width */}
          <div className="w-full">
            {/* ══ PREMIUM TOOLBAR ══════════════════════════════════════════════════════ */}
            {activeTab === 'formalizacao' && (
              <div className="mb-2 space-y-1.5">
                {/* Row 1: Bulk-selection actions (visible only when rows are selected) */}
                <AnimatePresence>
                  {isAdmin && selectedRows.size > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 flex-wrap bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 overflow-hidden"
                    >
                      <span className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5" />
                        {selectedRows.size} selecionado{selectedRows.size !== 1 ? 's' : ''}
                      </span>
                      <div className="w-px h-4 bg-amber-300" />
                      <button
                        onClick={() => setShowAtribuirTecnicoModal(true)}
                        className="h-8 px-3 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 bg-yellow-200 text-yellow-900 hover:bg-yellow-300 border border-yellow-400"
                      >
                        <User className="w-3.5 h-3.5" />
                        Técnico
                      </button>
                      <button
                        onClick={() => setShowAtribuirConferencistaModal(true)}
                        className="h-8 px-3 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 bg-green-200 text-green-900 hover:bg-green-300 border border-green-400"
                      >
                        <User className="w-3.5 h-3.5" />
                        Conferencista
                      </button>
                      <button
                        onClick={() => setShowLiberarAssinaturaModal(true)}
                        className="h-8 px-3 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 bg-orange-200 text-orange-900 hover:bg-orange-300 border border-orange-400"
                      >
                        <PenLine className="w-3.5 h-3.5" />
                        Assinatura
                      </button>
                      <button
                        onClick={() => { setLoteParaAtribuir(''); setPrioridadeParaAtribuir(''); setLoteAcao('definir'); setShowAtribuirLoteModal(true); }}
                        className="h-8 px-3 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 bg-purple-200 text-purple-900 hover:bg-purple-300 border border-purple-400"
                      >
                        <span>🏷</span>
                        Lote/Prior.
                      </button>
                      <button
                        onClick={() => handleResetarTeste(Array.from(selectedRows).map(id => parseInt(String(id))).filter(id => !isNaN(id)))}
                        disabled={resetandoTeste}
                        className="h-8 px-3 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 bg-red-200 text-red-900 hover:bg-red-300 border border-red-400 disabled:opacity-50"
                        title="Limpa técnico, análise e conferencista dos registros selecionados — volta ao estado anterior à atribuição de técnico"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${resetandoTeste ? 'animate-spin' : ''}`} />
                        Resetar Teste
                      </button>
                      <button
                        onClick={() => setSelectedRows(new Set())}
                        className="ml-auto h-8 px-2 text-xs font-medium text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-lg transition-all flex items-center gap-1"
                        title="Desmarcar seleção"
                      >
                        <X className="w-3.5 h-3.5" />
                        Limpar seleção
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Row 2: Main filter/action bar — single row, no wrap */}
                <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 shadow-sm overflow-x-auto scrollbar-none min-w-0">
                  {/* LEFT: Date range */}
                  <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 h-8 bg-gray-50 hover:border-blue-300 transition-colors flex-shrink-0">
                    <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <input
                      type="date"
                      title="Data Liberação — início"
                      value={dataInicioFilter}
                      onChange={e => setDataInicioFilter(e.target.value)}
                      className="text-[11px] text-gray-700 outline-none border-none bg-transparent cursor-pointer w-[106px]"
                    />
                    <span className="text-gray-300 text-xs select-none">–</span>
                    <input
                      type="date"
                      title="Data Liberação — fim"
                      value={dataFimFilter}
                      onChange={e => setDataFimFilter(e.target.value)}
                      className="text-[11px] text-gray-700 outline-none border-none bg-transparent cursor-pointer w-[106px]"
                    />
                    {(dataInicioFilter || dataFimFilter) && (
                      <button
                        onClick={() => { setDataInicioFilter(''); setDataFimFilter(''); }}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Limpar datas"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Fundo a Fundo chip */}
                  <button
                    onClick={() => setFundoAFundoFilter(v => !v)}
                    className={`h-8 px-2.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 border flex-shrink-0 ${
                      fundoAFundoFilter
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-white text-teal-700 border-teal-300 hover:bg-teal-50 hover:border-teal-400'
                    }`}
                    title="Filtrar somente registros Fundo a Fundo"
                  >
                    <DollarSign className="w-3 h-3" />
                    <span className="hidden lg:inline">Fundo a Fundo</span>
                    <span className="lg:hidden">F×F</span>
                    {fundoAFundoFilter && (
                      <span className="bg-white/25 text-white text-[10px] font-black px-1 py-0.5 rounded-full">
                        ✓
                      </span>
                    )}
                  </button>

                  {/* Liberadas para Conferência chip */}
                  <button
                    onClick={() => setEmConferenciaFilter(v => !v)}
                    className={`h-8 px-2.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 border flex-shrink-0 ${
                      emConferenciaFilter
                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                        : 'bg-white text-sky-700 border-sky-300 hover:bg-sky-50 hover:border-sky-400'
                    }`}
                    title={isAdmin ? "Demandas de todos os técnicos, já analisadas e aguardando atribuição de conferencista" : "Suas demandas já analisadas, aguardando atribuição de conferencista"}
                  >
                    <FileSearch className="w-3 h-3" />
                    <span className="hidden lg:inline">Liberadas p/ Conferência</span>
                    <span className="lg:hidden">Conferência</span>
                    {emConferenciaFilter && (
                      <span className="bg-white/25 text-white text-[10px] font-black px-1 py-0.5 rounded-full">
                        ✓
                      </span>
                    )}
                  </button>

                  {/* Active filter chips — from headerFilters & filters */}
                  {(() => {
                    const activeCount = Object.values(filters).filter(v => Array.isArray(v) && v.length > 0).length
                      + Object.values(headerFilters).filter(v => v && v.length > 0).length;
                    if (activeCount === 0) return null;
                    return (
                      <span className="h-8 flex items-center px-2 text-xs font-semibold text-[#1351B4] bg-blue-50 border border-blue-200 rounded-lg flex-shrink-0">
                        {activeCount} filtro{activeCount !== 1 ? 's' : ''} ativo{activeCount !== 1 ? 's' : ''}
                      </span>
                    );
                  })()}

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Clear filters — subtle link style */}
                  <button
                    onClick={() => { clearAllFilters(); setHeaderFilters({}); setDataInicioFilter(''); setDataFimFilter(''); setFundoAFundoFilter(false); }}
                    className="h-8 px-2 text-xs font-medium text-gray-400 hover:text-red-500 flex items-center gap-1 rounded-lg hover:bg-red-50 transition-all flex-shrink-0"
                    title="Limpar todos os filtros"
                  >
                    <X className="w-3.5 h-3.5" />
                    Limpar
                  </button>

                  <div className="w-px h-5 bg-gray-200 flex-shrink-0" />

                  {/* Export dropdown — MOVED TO PORTAL TO ESCAPE OVERFLOW */}
                  <div className="relative flex-shrink-0" ref={exportMenuRef}>
                    <button
                      onClick={() => { 
                        console.log('📊 [EXPORT MENU] Toggle - isExportMenuOpen será:', !isExportMenuOpen);
                        setIsExportMenuOpen(v => !v);
                      }}
                      className="h-8 px-2.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-400"
                      title={`Exportar ${(filteredForExportRef.current?.length || formalizacaoSearchResult.total || 0).toLocaleString('pt-BR')} registros`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Exportar
                      <ChevronDown className="w-3 h-3 opacity-60" />
                    </button>
                    {isExportMenuOpen && exportMenuRef.current && createPortal(
                      <div
                        ref={exportMenuPortalRef}
                        className="fixed bg-white border border-gray-200 rounded-xl shadow-xl z-[9999] overflow-hidden py-1"
                        style={{
                          pointerEvents: 'auto',
                          bottom: 'auto',
                          right: 'auto',
                          width: '176px',
                          top: exportMenuRef.current?.getBoundingClientRect().bottom + 8 + 'px',
                          left: (exportMenuRef.current?.getBoundingClientRect().right - 176) + 'px',
                        }}
                      >
                        <div className="px-3 py-1.5 border-b border-gray-100">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                            {(filteredForExportRef.current?.length || formalizacaoSearchResult.total || 0).toLocaleString('pt-BR')} registros
                          </p>
                        </div>
                        <button
                          onClick={(e) => { 
                            e.stopPropagation();
                            console.log('🟢 [EXPORT XLSX] Button clicked!');
                            setIsExportMenuOpen(false); 
                            exportFormalizacaoXLSX(); 
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-green-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <span className="text-green-600 font-bold text-base">XLS</span>
                          Excel (.xlsx)
                        </button>
                        <button
                          onClick={(e) => { 
                            e.stopPropagation();
                            console.log('🔵 [EXPORT CSV] Button clicked!');
                            setIsExportMenuOpen(false); 
                            exportFormalizacaoCSV(); 
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <span className="text-blue-600 font-bold text-base">CSV</span>
                          CSV (.csv)
                        </button>
                        <button
                          onClick={(e) => { 
                            e.stopPropagation();
                            setIsExportMenuOpen(false); 
                            window.print(); 
                          }}
                          disabled
                          className="w-full text-left px-3 py-2 text-sm text-gray-300 flex items-center gap-2.5 cursor-not-allowed"
                          title="Exportação PDF não disponível"
                        >
                          <span className="text-red-300 font-bold text-base">PDF</span>
                          Imprimir / PDF
                        </button>
                      </div>,
                      document.body
                    )}
                  </div>

                  {/* Columns button with badge — panel rendered via portal to escape overflow */}
                  <div className="relative flex-shrink-0">
                    <button
                      ref={columnMenuBtnRef}
                      onClick={() => {
                        if (isColumnMenuOpen) {
                          setIsColumnMenuOpen(false);
                          setColumnMenuPos(null);
                        } else {
                          const btn = columnMenuBtnRef.current;
                          if (btn) {
                            const rect = btn.getBoundingClientRect();
                            setColumnMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                          }
                          setIsColumnMenuOpen(true);
                        }
                      }}
                      className={`h-8 px-2.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 border ${
                        isColumnMenuOpen
                          ? 'bg-[#1351B4] text-white border-[#1351B4]'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-[#1351B4] hover:text-[#1351B4]'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Colunas
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isColumnMenuOpen ? 'bg-white/20 text-white' : 'bg-[#1351B4] text-white'
                      }`}>
                        {Object.values(visibleColumns).filter(Boolean).length}
                      </span>
                    </button>
                  </div>

                  {/* Columns panel — portaled to body to escape overflow clipping */}
                  {isColumnMenuOpen && columnMenuPos && createPortal(
                    <div
                      ref={columnMenuPanelRef}
                      className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-2xl p-3 w-72 max-h-[480px] overflow-y-auto"
                      style={{ top: columnMenuPos.top, right: columnMenuPos.right }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-2 sticky top-0 bg-white pb-1.5 border-b border-gray-100">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[#1351B4]">Colunas visíveis</p>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setVisibleColumns(Object.fromEntries(Object.keys(visibleColumns).map(k => [k, true])) as typeof visibleColumns)}
                            className="text-[10px] text-gray-500 hover:text-[#1351B4] px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors"
                          >
                            Todas
                          </button>
                          <button
                            onClick={() => setVisibleColumns(Object.fromEntries(Object.keys(visibleColumns).map(k => [k, false])) as typeof visibleColumns)}
                            className="text-[10px] text-gray-500 hover:text-red-500 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors"
                          >
                            Nenhuma
                          </button>
                          <button
                            onClick={() => { setIsColumnMenuOpen(false); setColumnMenuPos(null); }}
                            className="ml-1 text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {/* Two-column grid for compact layout */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                        {[
                          { key: 'seq', label: 'Seq' },
                          { key: 'ano', label: 'Ano' },
                          { key: 'parlamentar', label: 'Parlamentar' },
                          { key: 'partido', label: 'Partido' },
                          { key: 'emenda', label: 'Emenda' },
                          { key: 'emendas_agregadoras', label: 'Emendas Agregadoras' },
                          { key: 'demanda', label: 'Demanda' },
                          { key: 'demandas_formalizacao', label: 'Demandas Form.' },
                          { key: 'numero_convenio', label: 'Nº Convênio' },
                          { key: 'classificacao_emenda_demanda', label: 'Classificação' },
                          { key: 'tipo_formalizacao', label: 'Tipo Formalização' },
                          { key: 'regional', label: 'Regional' },
                          { key: 'municipio', label: 'Município' },
                          { key: 'conveniado', label: 'Conveniado' },
                          { key: 'objeto', label: 'Objeto' },
                          { key: 'portfolio', label: 'Portfólio' },
                          { key: 'valor', label: 'Valor' },
                          { key: 'lote', label: '🔵 Lote' },
                          { key: 'prioridade', label: '⚡ Prioridade' },
                          { key: 'situacao_emenda', label: 'Situação Emenda' },
                          { key: 'situacao_demandas_sempapel', label: 'Situação SemPapel' },
                          { key: 'area_estagio', label: 'Área - Estágio' },
                          { key: 'recurso', label: 'Recurso' },
                          { key: 'parecer_ld', label: 'Parecer LDO' },
                          { key: 'tecnico', label: 'Técnico' },
                          { key: 'data_liberacao', label: 'Data Liberação' },
                          { key: 'area_estagio_situacao_demanda', label: 'Área - Situação' },
                          { key: 'situacao_analise_demanda', label: 'Situação Análise' },
                          { key: 'data_analise_demanda', label: 'Data Análise' },
                          { key: 'motivo_retorno_diligencia', label: 'Motivo Retorno' },
                          { key: 'data_retorno_diligencia', label: 'Data Ret. Dilig.' },
                          { key: 'conferencista', label: 'Conferencista' },
                          { key: 'data_recebimento_demanda', label: 'Data Recebimento' },
                          { key: 'data_retorno', label: 'Data Retorno' },
                          { key: 'observacao_motivo_retorno', label: 'Observações' },
                          { key: 'data_liberacao_assinatura_conferencista', label: 'Lib. Assin. Conf.' },
                          { key: 'data_liberacao_assinatura', label: 'Lib. Assinatura' },
                          { key: 'falta_assinatura', label: 'Falta Assinatura' },
                          { key: 'assinatura', label: 'Assinatura' },
                          { key: 'publicacao', label: 'Publicação' },
                          { key: 'vigencia', label: 'Vigência' },
                          { key: 'encaminhado_em', label: 'Encaminhado em' },
                          { key: 'concluida_em', label: 'Concluída em' },
                        ].map(col => (
                          <label
                            key={col.key}
                            className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 px-1 py-1 rounded-md transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={visibleColumns[col.key as keyof typeof visibleColumns]}
                              onChange={(e) => setVisibleColumns({ ...visibleColumns, [col.key]: e.target.checked })}
                              className="w-3 h-3 rounded border-gray-300 accent-[#1351B4] cursor-pointer flex-shrink-0"
                            />
                            <span className="text-[11px] text-gray-700 truncate">{col.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>,
                    document.body
                  )}

                  <div className="w-px h-4 bg-gray-200 flex-shrink-0" />

                  {/* Record count indicator */}
                  <div className="flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
                    <span className="text-xs font-bold text-gray-700">
                      {formalizacaoSearchResult.total.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-[11px] text-gray-400">reg.</span>
                  </div>
                </div>
              </div>
            )}
            {/* ══ END PREMIUM TOOLBAR ════════════════════════════════════════════════ */}

            {(activeTab === 'admin' || activeTab === 'dashboard') ? (
              <DashboardTecnico initialData={allDataCacheRef.current} refreshKey={dashboardRefreshKey} />
            ) : loading && formalizacoes.length === 0 && formalizacaoSearchResult.data.length === 0 ? (
              <div className="flex flex-col justify-center items-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-b-red-600 mb-4"></div>
                <p className="text-black font-bold">Carregando formalizações...</p>
                <p className="text-gray-600 text-sm mt-1">Por favor, aguarde.</p>
              </div>
            ) : filteredFormalizacoes.length === 0 && !formalizacaoSearchResult.loading ? (
              <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center">
                <div className="bg-purple-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-[#1351B4]" />
                </div>
                <h3 className="text-black font-bold">Nenhum registro encontrado</h3>
                <p className="text-gray-600 text-sm mt-1">Tente ajustar sua busca ou importe novos dados.</p>
                <button
                  onClick={() => clearAllFilters()}
                  className="mt-4 px-6 py-2 text-sm font-bold text-white bg-[#1351B4] rounded-lg hover:bg-[#0C326F] transition-all inline-flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar (Limpar Filtros)
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    {/* Compact options bar */}
                    {activeTab === 'formalizacao' && (
                      <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-50/70 border-b border-gray-200">
                        {/* Mostrar Concluídas */}
                        <label className="flex items-center gap-1.5 text-[11px] cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={!hideConcluidas}
                            onChange={(e) => {
                              const novoValor = !e.target.checked;
                              setHideConcluidas(novoValor);
                              fetchFormalizacoesComFiltros(0, undefined, novoValor);
                            }}
                            className="rounded cursor-pointer accent-[#1351B4] w-3 h-3"
                          />
                          <span className="text-gray-500 group-hover:text-gray-700 transition-colors font-medium select-none">Mostrar Concluídas</span>
                        </label>
                        {/* Somente Minhas Demandas */}
                        {user?.nome && (
                          <label className="flex items-center gap-1.5 text-[11px] cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={showSomenteMinhas}
                              onChange={(e) => {
                                setShowSomenteMinhas(e.target.checked);
                                fetchFormalizacoesComFiltros(0, undefined, undefined, e.target.checked);
                              }}
                              className="rounded cursor-pointer accent-[#1351B4] w-3 h-3"
                            />
                            <span className="text-gray-500 group-hover:text-gray-700 transition-colors font-medium select-none">Somente minhas demandas</span>
                          </label>
                        )}
                        <div className="flex-1" />
                        {hideConcluidas && allDataCacheRef.current && allDataCacheRef.current.length > formalizacaoSearchResult.total && (
                          <span className="text-[10px] text-gray-400">
                            de {allDataCacheRef.current.length.toLocaleString('pt-BR')} total
                          </span>
                        )}
                        {refreshProgress?.active && (
                          <span className="text-[10px] text-blue-500 font-medium flex items-center gap-1">
                            <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                            Carregando...
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Reset column widths */}
                    {Object.keys(columnWidths).length > 0 && (
                      <div className="flex items-center px-3 py-1 bg-gray-50 border-b border-gray-200">
                        <button
                          onClick={() => setColumnWidths({})}
                          className="text-[10px] text-[#1351B4] hover:underline ml-auto"
                        >
                          Resetar larguras
                        </button>
                      </div>
                    )}

                    <div 
                      ref={tableContainerRef}
                      onMouseDown={handleTableMouseDown}
                      onMouseMove={handleTableMouseMove}
                      onMouseUp={handleTableMouseUp}
                      onMouseLeave={handleTableMouseLeave}
                      className={`overflow-x-auto overflow-y-auto bg-white select-none user-select-none ${isDraggingScroll ? 'cursor-grabbing' : 'cursor-grab'}`}
                      style={{ WebkitUserSelect: 'none', userSelect: 'none', maxHeight: 'calc(100vh - 200px)' }}
                    >
                      {(() => {
                        const columnDefinitions = [
                          { key: 'seq', label: 'Seq', minW: 32, render: (f: any) => '—' },
                          { key: 'ano', label: 'Ano', minW: 38, render: (f: any) => f.ano },
                          { key: 'parlamentar', label: 'Parlamentar', minW: 60, render: (f: any) => f.parlamentar },
                          { key: 'partido', label: 'Partido', minW: 60, render: (f: any) => f.partido },
                          { key: 'emenda', label: 'Emenda', minW: 72, render: (f: any) => formatEmendaNumber(f.emenda) },
                          { key: 'emendas_agregadoras', label: 'Agr.', minW: 60, render: (f: any) => f.emendas_agregadoras },
                          { key: 'demanda', label: 'Dem.', minW: 48, render: (f: any) => f.demanda },
                          { key: 'demandas_formalizacao', label: 'Demanda Form.', minW: 80, render: (f: any) => f.demandas_formalizacao },
                          { key: 'numero_convenio', label: 'Convênio', minW: 72, render: (f: any) => f.numero_convenio },
                          { key: 'classificacao_emenda_demanda', label: 'Class.', minW: 56, render: (f: any) => f.classificacao_emenda_demanda },
                          { key: 'tipo_formalizacao', label: 'Tipo Form.', minW: 64, render: (f: any) => f.tipo_formalizacao },
                          { key: 'regional', label: 'Regional', minW: 60, render: (f: any) => f.regional },
                          { key: 'municipio', label: 'Município', minW: 64, render: (f: any) => f.municipio },
                          { key: 'conveniado', label: 'Conveniado', minW: 72, render: (f: any) => f.conveniado },
                          { key: 'objeto', label: 'Objeto', minW: 72, render: (f: any) => f.objeto },
                          { key: 'portfolio', label: 'Portfólio', minW: 60, render: (f: any) => f.portfolio },
                          { key: 'valor', label: 'Valor', minW: 76, align: 'right', render: (f: any) => formatCurrency(f.valor) },
                          { key: 'lote', label: 'Lote', minW: 44, render: (f: any) => {
                            const lote = (f as any).lote;
                            if (!lote) return <span className="text-slate-300">—</span>;
                            const colors: Record<string, string> = {
                              'Lote 1': 'bg-blue-100 text-blue-800 border-blue-300',
                              'Lote 2': 'bg-green-100 text-green-800 border-green-300',
                              'Lote 3': 'bg-orange-100 text-orange-800 border-orange-300',
                            };
                            return <span className={`inline-flex px-1 py-0.5 rounded border font-bold whitespace-nowrap ${colors[lote] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>{lote}</span>;
                          }},
                          { key: 'prioridade', label: 'P.', minW: 32, render: (f: any) => {
                            const p = (f as any).prioridade;
                            if (!p) return <span className="text-slate-300">—</span>;
                            const cfg: Record<string, {cls: string, icon: string}> = {
                              'P0': { cls: 'bg-red-100 text-red-800 border-red-400', icon: '⚡' },
                              'P1': { cls: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: '●' },
                              'P2': { cls: 'bg-gray-100 text-gray-500 border-gray-300', icon: '○' },
                            };
                            const { cls, icon } = cfg[p] || { cls: 'bg-gray-100 text-gray-500 border-gray-300', icon: '' };
                            return <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded border font-bold whitespace-nowrap ${cls}`}>{icon}{p}</span>;
                          }},
                          { key: 'situacao_emenda', label: 'Sit. Emenda', minW: 72, render: (f: any) => f.situacao_emenda },
                          { key: 'situacao_demandas_sempapel', label: 'Sit. SemPapel', minW: 72, render: (f: any) => f.situacao_demandas_sempapel || f.area_estagio_situacao_demanda },
                          { key: 'area_estagio', label: 'Área/Estágio', minW: 80, render: (f: any) => deriveAreaEstagio(f) || f.area_estagio },
                          { key: 'recurso', label: 'Recurso', minW: 56, render: (f: any) => f.recurso },
                          { key: 'parecer_ld', label: 'LDO', minW: 44, render: (f: any) => f.parecer_ld },
                          { key: 'tecnico', label: 'Técnico', minW: 60, render: (f: any) => f.tecnico || '—' },
                          { key: 'data_liberacao', label: 'Lib.', minW: 68, render: (f: any) => formatDateForDisplay(f.data_liberacao || '—') },
                          { key: 'area_estagio_situacao_demanda', label: 'Área/Sit.', minW: 72, render: (f: any) => f.area_estagio_situacao_demanda || f.situacao_demandas_sempapel },
                          { key: 'situacao_analise_demanda', label: 'Sit. Análise', minW: 72, render: (f: any) => f.situacao_analise_demanda },
                          { key: 'data_analise_demanda', label: 'Análise', minW: 68, render: (f: any) => formatDateForDisplay(f.data_analise_demanda || '—') },
                          { key: 'motivo_retorno_diligencia', label: 'Mot. Retorno', minW: 80, render: (f: any) => f.motivo_retorno_diligencia },
                          { key: 'data_retorno_diligencia', label: 'Ret. Dilig.', minW: 68, render: (f: any) => formatDateForDisplay(f.data_retorno_diligencia || '—') },
                          { key: 'conferencista', label: 'Conferencista', minW: 80, render: (f: any) => f.conferencista },
                          { key: 'data_recebimento_demanda', label: 'Receb.', minW: 68, render: (f: any) => formatDateForDisplay(f.data_recebimento_demanda || '—') },
                          { key: 'data_retorno', label: 'Retorno', minW: 68, render: (f: any) => formatDateForDisplay(f.data_retorno || '—') },
                          { key: 'observacao_motivo_retorno', label: 'Obs.', minW: 80, render: (f: any) => f.observacao_motivo_retorno },
                          { key: 'data_liberacao_assinatura_conferencista', label: 'Lib.Conf.', minW: 68, render: (f: any) => formatDateForDisplay(f.data_liberacao_assinatura_conferencista || '—') },
                          { key: 'data_liberacao_assinatura', label: 'Lib.Assin.', minW: 68, render: (f: any) => formatDateForDisplay(f.data_liberacao_assinatura || '—') },
                          { key: 'falta_assinatura', label: 'Falta Assin.', minW: 88, titleStr: (f: any) => f.falta_assinatura || '', render: (f: any) => {
                            if (isAdmin) {
                              return (
                                <button
                                  className="flex items-center gap-1 text-left w-full group"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInlineEditFalta({ id: String(f.id), value: f.falta_assinatura || '' });
                                  }}
                                  title="Clique para editar"
                                >
                                  <span className="truncate flex-1">{f.falta_assinatura || '—'}</span>
                                  <PenLine className="w-3 h-3 text-orange-500 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                                </button>
                              );
                            }
                            return f.falta_assinatura || '—';
                          } },
                          { key: 'assinatura', label: 'Assin.', minW: 68, render: (f: any) => formatDateForDisplay(f.assinatura || '—') },
                          { key: 'publicacao', label: 'Publ.', minW: 68, render: (f: any) => formatDateForDisplay(f.publicacao || '—') },
                          { key: 'vigencia', label: 'Vigência', minW: 68, render: (f: any) => formatDateForDisplay(f.vigencia || '—') },
                          { key: 'encaminhado_em', label: 'Encam.', minW: 68, render: (f: any) => formatDateForDisplay(f.encaminhado_em || '—') },
                          { key: 'concluida_em', label: 'Concluída', minW: 72, render: (f: any) => {
                            if (!f.concluida_em || String(f.concluida_em).trim() === '' || f.concluida_em === '—') return '—';
                            return (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold border border-emerald-200 whitespace-nowrap">
                                <CheckCircle2 className="w-2.5 h-2.5" /> OK
                              </span>
                            );
                          } }
                        ];
                        
                        const visibleCols = columnDefinitions.filter(col => visibleColumns[col.key as keyof typeof visibleColumns]);
                        return (
                          <table className="w-full border-collapse text-[13px] leading-tight" style={{ tableLayout: 'auto', borderSpacing: 0 }}>
                            <thead className="sticky top-0 z-20">
                              <tr>
                                {/* Header do checkbox - só admin */}
                                {isAdmin && (
                                <th className="px-1.5 py-1 w-8 align-middle flex-shrink-0" style={{ backgroundColor: '#1B3A6B', borderBottom: '2px solid rgba(255,255,255,0.18)' }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedRows.size > 0 && selectedRows.size === formalizacoesPaginadas.length}
                                    onChange={() => {
                                      if (selectedRows.size > 0 && selectedRows.size === formalizacoesPaginadas.length) {
                                        setSelectedRows(new Set());
                                      } else {
                                        const newSelected = new Set(selectedRows);
                                        formalizacoesPaginadas.forEach((f) => {
                                          if (f.id) {
                                            newSelected.add(String(f.id).trim());
                                          }
                                        });
                                        setSelectedRows(newSelected);
                                      }
                                    }}
                                    className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer w-4 h-4"
                                    title="Selecionar tudo na página"
                                  />
                                </th>
                                )}
                                {visibleCols.map(col => {
                                  const selectedVals = getColumnFilterValues(col.key);
                                  const hasActive = selectedVals.length > 0;
                                  const isOpen = headerFilterOpen === col.key;
                                  
                                  // Grupos semânticos de colunas — cores profissionais
                                  const colGroup = (() => {
                                    // G1 — Identificação (azul profundo)
                                    if (['seq','ano','parlamentar','partido','emenda','emendas_agregadoras'].includes(col.key))
                                      return { bg: '#1B3A6B', hover: '#152E55' };
                                    // G2 — Demanda / Convênio (azul-aço)
                                    if (['demanda','demandas_formalizacao','numero_convenio','classificacao_emenda_demanda','tipo_formalizacao','regional','municipio','conveniado','objeto','portfolio','valor','lote','prioridade'].includes(col.key))
                                      return { bg: '#15526B', hover: '#0F3E52' };
                                    // G3 — Situação / Área (ameixa / violeta escuro)
                                    if (['situacao_emenda','situacao_demandas_sempapel','area_estagio','recurso','parecer_ld','area_estagio_situacao_demanda','situacao_analise_demanda','motivo_retorno_diligencia','observacao_motivo_retorno'].includes(col.key))
                                      return { bg: '#4A1E6B', hover: '#381652' };
                                    // G4 — Técnico / Datas operacionais (âmbar escuro)
                                    if (['tecnico','data_liberacao','conferencista','data_recebimento_demanda','data_analise_demanda','data_retorno_diligencia','data_retorno'].includes(col.key))
                                      return { bg: '#7D4E1F', hover: '#5C3A16' };
                                    // G5 — Formalização / Assinatura (verde floresta)
                                    if (['data_liberacao_assinatura_conferencista','data_liberacao_assinatura','falta_assinatura','assinatura','publicacao','vigencia','encaminhado_em','concluida_em'].includes(col.key))
                                      return { bg: '#145A32', hover: '#0D3F24' };
                                    // fallback
                                    return { bg: '#1B3A6B', hover: '#152E55' };
                                  })();

                                  const headerBgColor = ''; // unused — we use inline style now
                                  const isYellow = false;   // all groups now use white text

                                  return (
                                    <th 
                                      key={col.key}
                                      ref={(el) => { if (el) columnHeaderRefs.current[col.key] = el; }}
                                      className={`px-1 py-1 text-left text-white text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors relative ${
                                        col.align === 'right' ? 'text-right' : ''
                                      } ${sortColumn === col.key ? 'brightness-90' : ''}`}
                                      style={{
                                        minWidth: columnWidths[col.key] || (col as any).minW || 60,
                                        width: columnWidths[col.key] || undefined,
                                        backgroundColor: colGroup.bg,
                                        borderBottom: '2px solid rgba(255,255,255,0.18)',
                                      }}
                                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = colGroup.hover)}
                                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = colGroup.bg)}
                                    >
                                      {/* Label + Sort + Filter (estilo Excel) */}
                                      <div 
                                        className="flex items-center gap-1 font-bold"
                                        onClick={() => {
                                          const headerEl = columnHeaderRefs.current[col.key];
                                          if (headerEl && tableContainerRef.current) {
                                            const containerWidth = tableContainerRef.current.clientWidth;
                                            const headerLeft = headerEl.offsetLeft;
                                            const headerWidth = headerEl.offsetWidth;
                                            const targetScroll = headerLeft - (containerWidth / 2) + (headerWidth / 2);
                                            tableContainerRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
                                          }
                                          if (sortColumn === col.key) {
                                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                          } else {
                                            setSortColumn(col.key);
                                            setSortOrder('asc');
                                          }
                                        }}
                                        title={`Ordenar por ${col.label}`}
                                      >
                                        <span className="truncate">{col.label}</span>
                                        {sortColumn === col.key && (
                                          <span className="text-yellow-300 text-[10px] flex-shrink-0">
                                            {sortOrder === 'asc' ? '▲' : '▼'}
                                          </span>
                                        )}
                                        {/* Botão filtro inline estilo Excel */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isOpen) {
                                              setHeaderFilterOpen(null);
                                              setHeaderFilterSearch('');
                                            } else {
                                              const thEl = columnHeaderRefs.current[col.key];
                                              if (thEl) {
                                                const rect = thEl.getBoundingClientRect();
                                                const dropW = 240;
                                                const left = Math.min(rect.left, window.innerWidth - dropW - 8);
                                                setHeaderFilterPos({ top: rect.bottom + 4, left: Math.max(8, left) });
                                              }
                                              setHeaderFilterOpen(col.key);
                                              setHeaderFilterSearch('');
                                            }
                                          }}
                                          className={`flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-sm transition-all ${
                                            hasActive 
                                              ? 'bg-yellow-400 text-gray-800' 
                                              : 'text-white/40 hover:text-white hover:bg-white/20'
                                          }`}
                                          title={`Filtrar ${col.label}`}
                                        >
                                          <Filter className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                      {/* Resize handle estilo Excel */}
                                      <div
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          resizingColRef.current = col.key;
                                          resizeStartXRef.current = e.clientX;
                                          const th = columnHeaderRefs.current[col.key];
                                          resizeStartWidthRef.current = th ? th.offsetWidth : 100;
                                          const handleMouseMove = (ev: MouseEvent) => {
                                            if (!resizingColRef.current) return;
                                            const diff = ev.clientX - resizeStartXRef.current;
                                            const newWidth = Math.max(50, resizeStartWidthRef.current + diff);
                                            setColumnWidths(prev => ({ ...prev, [resizingColRef.current!]: newWidth }));
                                          };
                                          const handleMouseUp = () => {
                                            resizingColRef.current = null;
                                            document.removeEventListener('mousemove', handleMouseMove);
                                            document.removeEventListener('mouseup', handleMouseUp);
                                            document.body.style.cursor = '';
                                            document.body.style.userSelect = '';
                                          };
                                          document.addEventListener('mousemove', handleMouseMove);
                                          document.addEventListener('mouseup', handleMouseUp);
                                          document.body.style.cursor = 'col-resize';
                                          document.body.style.userSelect = 'none';
                                        }}
                                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-yellow-400/60 z-10"
                                        title="Arrastar para redimensionar"
                                      />
                                      {/* Dropdown multi-select */}
                                      {isOpen && createPortal(
                                        <div
                                          ref={headerFilterRef}
                                          className="fixed z-[9999] w-60 bg-white rounded-lg shadow-2xl border border-gray-200"
                                          style={{ top: headerFilterPos.top, left: headerFilterPos.left }}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <div className="p-2 border-b border-gray-100 space-y-1.5">
                                            <input
                                              type="text"
                                              placeholder={`Buscar ${col.label}...`}
                                              value={headerFilterSearch}
                                              onChange={(e) => setHeaderFilterSearch(e.target.value)}
                                              className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:border-[#1351B4] focus:ring-1 focus:ring-[#1351B4]/20 outline-none text-gray-900 bg-white"
                                              autoFocus
                                            />
                                            <label className="flex items-center gap-1.5 text-[10px] cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                                              <input
                                                type="checkbox"
                                                checked={hideEmptyFields[col.key] || false}
                                                onChange={(e) => {
                                                  setHideEmptyFields({ ...hideEmptyFields, [col.key]: e.target.checked });
                                                  if (e.target.checked) setShowOnlyEmptyFields({ ...showOnlyEmptyFields, [col.key]: false });
                                                  fetchFormalizacoesComFiltros(0);
                                                }}
                                                className="rounded cursor-pointer accent-[#1351B4] w-3 h-3"
                                              />
                                              <span className="text-gray-600">Ocultar vazios</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 text-[10px] cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                                              <input
                                                type="checkbox"
                                                checked={showOnlyEmptyFields[col.key] || false}
                                                onChange={(e) => {
                                                  setShowOnlyEmptyFields({ ...showOnlyEmptyFields, [col.key]: e.target.checked });
                                                  if (e.target.checked) setHideEmptyFields({ ...hideEmptyFields, [col.key]: false });
                                                  fetchFormalizacoesComFiltros(0);
                                                }}
                                                className="rounded cursor-pointer accent-[#1351B4] w-3 h-3"
                                              />
                                              <span className="text-gray-600">Somente vazios</span>
                                            </label>
                                          </div>
                                          <div className="max-h-56 overflow-y-auto">
                                            {(() => {
                                              // isOpen (condição do bloco pai) garante que col.key === headerFilterOpen aqui
                                              const options = openColumnFilterOptions;
                                              const searchVal = headerFilterSearch.toLowerCase();
                                              const filtered = options.filter(opt => {
                                                if (searchVal) {
                                                  const matchesText = opt.toLowerCase().includes(searchVal);
                                                  const matchesDigits = col.key === 'emenda' && (() => {
                                                    const optDigits = opt.replace(/\D/g, '');
                                                    const searchDigits = headerFilterSearch.replace(/\D/g, '');
                                                    return searchDigits.length > 0 && optDigits.includes(searchDigits);
                                                  })();
                                                  if (!matchesText && !matchesDigits) return false;
                                                }
                                                if (hideEmptyFields[col.key] && (!opt || opt.trim() === '' || opt === '—')) return false;
                                                return true;
                                              });
                                              if (filtered.length === 0) {
                                                return <div className="p-2 text-[10px] text-gray-400 text-center">Nenhuma opção</div>;
                                              }
                                              const sliced = filtered.slice(0, 300);
                                              return [
                                                <label key="__select_all__" className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-blue-50 cursor-pointer text-[11px] text-gray-700 border-b border-gray-100 font-semibold sticky top-0 bg-white">
                                                  <input
                                                    type="checkbox"
                                                    checked={sliced.length > 0 && sliced.every((o: string) => selectedVals.includes(o))}
                                                    ref={el => { if (el) el.indeterminate = sliced.some((o: string) => selectedVals.includes(o)) && !sliced.every((o: string) => selectedVals.includes(o)); }}
                                                    onChange={(e) => {
                                                      if (e.target.checked) {
                                                        setColumnFilterValues(col.key, [...selectedVals, ...sliced.filter((o: string) => !selectedVals.includes(o))]);
                                                      } else {
                                                        setColumnFilterValues(col.key, selectedVals.filter((v: string) => !sliced.includes(v)));
                                                      }
                                                    }}
                                                    className="rounded cursor-pointer accent-[#1351B4] w-3 h-3 flex-shrink-0"
                                                  />
                                                  <span>Selecionar todos</span>
                                                </label>,
                                                ...sliced.map((opt: string) => (
                                                  <label key={opt} className="flex items-center gap-1.5 px-2 py-1 hover:bg-blue-50 cursor-pointer text-[11px] text-gray-700">
                                                    <input
                                                      type="checkbox"
                                                      checked={selectedVals.includes(opt)}
                                                      onChange={() => {
                                                        const newValues = selectedVals.includes(opt)
                                                          ? selectedVals.filter((v: string) => v !== opt)
                                                          : [...selectedVals, opt];
                                                        setColumnFilterValues(col.key, newValues);
                                                      }}
                                                      className="rounded cursor-pointer accent-[#1351B4] w-3 h-3 flex-shrink-0"
                                                    />
                                                    <span className="truncate">{col.key === 'emenda' ? formatEmendaNumber(opt) : (opt || '(vazio)')}</span>
                                                  </label>
                                                ))
                                              ];
                                            })()}
                                          </div>
                                          <div className="border-t border-gray-100 px-2 py-1.5 flex gap-1">
                                            <button
                                              onClick={() => {
                                                setColumnFilterValues(col.key, []);
                                                setHideEmptyFields({ ...hideEmptyFields, [col.key]: false });
                                                setShowOnlyEmptyFields({ ...showOnlyEmptyFields, [col.key]: false });
                                              }}
                                              className="flex-1 px-2 py-1 text-[10px] text-[#1351B4] hover:bg-blue-50 rounded font-medium"
                                            >
                                              Limpar
                                            </button>
                                            <button
                                              onClick={() => { setHeaderFilterOpen(null); setHeaderFilterSearch(''); }}
                                              className="flex-1 px-2 py-1 text-[10px] text-white bg-[#1351B4] rounded hover:bg-[#0C326F] font-medium"
                                            >
                                              OK
                                            </button>
                                          </div>
                                        </div>
                                      , document.body)}
                                    </th>
                                  );
                                })}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {formalizacoesPaginadas.length === 0 ? (
                                <tr>
                                  <td colSpan={visibleCols.length + 1} className="px-4 py-8 text-center">
                                    {formalizacaoSearchResult.loading ? (
                                      <span className="text-slate-500 font-medium">Carregando registros...</span>
                                    ) : (
                                      <div className="flex flex-col items-center gap-3">
                                        <span className="text-slate-500 font-medium">Nenhum registro encontrado com os filtros selecionados</span>
                                        <button
                                          onClick={() => clearAllFilters()}
                                          className="px-4 py-1.5 text-xs font-bold text-white bg-[#1351B4] rounded-lg hover:bg-[#0C326F] transition-all inline-flex items-center gap-1.5"
                                        >
                                          <ArrowLeft className="w-3.5 h-3.5" />
                                          Voltar (Limpar Filtros)
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ) : (
                                formalizacoesPaginadas.map((f, index) => {
                                  const rowKey = `${f.id || index}`;
                                  const isRowSelected = selectedRows.has(rowKey);
                                  return (
                                  <tr
                                    key={`form-${f.id || 'unknown'}-${index}`}
                                    onClick={(e) => {
                                      // Se houve movimento de drag, não seleciona
                                      if (dragStateRef.current.hasMoved) {
                                        dragStateRef.current.hasMoved = false;
                                        return;
                                      }
                                      openEditFormFresh(f);
                                    }}
                                    className={`cursor-pointer transition-all ${
                                      selectedFormalizacao?.id === f.id 
                                        ? 'bg-indigo-200 border-l-4 border-indigo-600' 
                                        : isRowSelected
                                        ? 'bg-amber-100 border-l-4 border-amber-500'
                                        : (f.publicacao && String(f.publicacao).trim() !== '' && String(f.publicacao).trim() !== '—') || (f.concluida_em && String(f.concluida_em).trim() !== '' && String(f.concluida_em).trim() !== '—')
                                        ? 'bg-emerald-50 border-l-4 border-emerald-500 hover:bg-emerald-100'
                                        : isLiberadoParaConferencia(f)
                                        ? 'bg-sky-200 border-l-[6px] border-sky-600 hover:bg-sky-300 font-semibold'
                                        : f.falta_assinatura && String(f.falta_assinatura).trim() !== '' && String(f.falta_assinatura).trim() !== 'DEMANDA ASSINADA'
                                        ? 'bg-amber-50 border-l-4 border-amber-400 hover:bg-amber-100'
                                        : 'hover:bg-blue-50'
                                    }`}
                                  >
                                    {/* Checkbox para seleção - só admin */}
                                    {isAdmin && (
                                    <td className="px-1.5 py-0.5 w-8">
                                      <input
                                        type="checkbox"
                                        checked={isRowSelected}
                                        onChange={() => {
                                          // Garantir que o ID é válido (não usar index como fallback)
                                          if (!f.id) {
                                            console.warn('⚠️ Aviso: Registro sem ID válido:', f);
                                            alert('⚠️ Erro: Este registro não tem ID válido. Contate o suporte.');
                                            return;
                                          }
                                          
                                          const actualId = String(f.id).trim();
                                          const newSelected = new Set(selectedRows);
                                          if (isRowSelected) {
                                            newSelected.delete(actualId);
                                          } else {
                                            newSelected.add(actualId);
                                            // Log para debug
                                            console.log(`✅ Selecionado: ID=${actualId}, Demanda=${f.demandas_formalizacao}, Seq=${f.seq}`);
                                          }
                                          setSelectedRows(newSelected);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer w-4 h-4"
                                      />
                                    </td>
                                    )}
                                    {visibleCols.map(col => (
                                      <td 
                                        key={`${f.id}-${col.key}`}
                                        className={`px-1 py-0.5 truncate text-[13px] leading-tight ${
                                          col.align === 'right' ? 'text-right font-semibold text-emerald-700' : 'text-slate-800'
                                        }`}
                                        style={{ backgroundColor: 'inherit', minWidth: columnWidths[col.key] || (col as any).minW || 60, maxWidth: columnWidths[col.key] || (col as any).minW ? ((columnWidths[col.key] || (col as any).minW) * 2) : 200, overflow: 'hidden' }}
                                        title={(col as any).titleStr ? (col as any).titleStr(f) : String(col.render(f) ?? '')}
                                      >
                                        {col.render(f)}
                                      </td>
                                    ))}
                                  </tr>
                                )
                                })
                              )}
                            </tbody>
                          </table>
                        );
                      })()}
                    </div>

                  {/* Bottom Pagination */}
                  <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200 flex items-center flex-wrap gap-1.5">
                    {/* Botão de Deletar Selecionadas */}
                    {user?.role === 'admin' && selectedRows.size > 0 && (
                      <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        onClick={() => {
                          if (selectedRows.size === 0) {
                            alert('❌ Nenhum registro selecionado');
                            return;
                          }
                          setShowDeleteFormalizacaoModal(true);
                          setFormalizacaoParaDeletar(null);
                        }}
                        className="px-2 py-1 text-[10px] font-bold text-white bg-red-600 rounded transition-colors flex items-center gap-1.5 hover:bg-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                        Deletar {selectedRows.size}
                      </motion.button>
                    )}
                    <button
                      onClick={() => fetchFormalizacoesComFiltros(0)}
                      disabled={paginaAtual === 0 || formalizacaoSearchResult.loading}
                      className="px-2 py-1 text-[10px] font-bold text-white bg-[#1351B4] rounded disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:bg-[#0C326F]"
                      title="Primeira página"
                    >
                      ⏮
                    </button>
                    <button
                      onClick={() => fetchFormalizacoesComFiltros(Math.max(0, paginaAtual - 1))}
                      disabled={paginaAtual === 0 || formalizacaoSearchResult.loading}
                      className="px-2 py-1 text-[10px] font-bold text-white bg-[#1351B4] rounded disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:bg-[#0C326F]"
                      title="Página anterior"
                    >
                      ◀
                    </button>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: Math.min(5, totalPaginas) }).map((_, i) => {
                        const startPage = Math.max(0, Math.min(paginaAtual - 2, totalPaginas - 5));
                        const pagina = startPage + i;
                        return (
                          <button
                            key={`page-form-${pagina}`}
                            onClick={() => fetchFormalizacoesComFiltros(pagina)}
                            disabled={formalizacaoSearchResult.loading}
                            className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${
                              paginaAtual === pagina
                                ? 'text-white bg-[#1351B4]'
                                : 'bg-white text-gray-600 border border-gray-300 hover:border-[#1351B4] hover:text-[#1351B4]'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            {pagina + 1}
                          </button>
                        );
                      })}
                    </div>
                    <button
                        onClick={() => fetchFormalizacoesComFiltros(Math.min(totalPaginas - 1, paginaAtual + 1))}
                        disabled={paginaAtual >= totalPaginas - 1 || formalizacaoSearchResult.loading}
                        className="px-2 py-1 text-[10px] font-bold text-white bg-[#1351B4] rounded disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:bg-[#0C326F]"
                        title="Próxima página"
                      >
                        ▶
                      </button>
                      <button
                        onClick={() => fetchFormalizacoesComFiltros(totalPaginas - 1)}
                        disabled={paginaAtual >= totalPaginas - 1 || formalizacaoSearchResult.loading}
                        className="px-2 py-1 text-[10px] font-bold text-white bg-[#1351B4] rounded disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:bg-[#0C326F]"
                        title="Última página"
                      >
                        ⏭
                      </button>
                      <span className="text-[10px] text-gray-500 ml-1">
                        Pág. {paginaAtual + 1}/{totalPaginas}
                      </span>
                    </div>
                  </div>
              </div>
            )}
          </div>

          {/* Detail panel desativado — clique na linha abre editar */}
        </div>
      </main>
      </div>{/* end flex body */}

      {/* Supabase Guide Modal */}
      <AnimatePresence>
        {isSupabaseGuideOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSupabaseGuideOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-indigo-50 p-3 rounded-2xl">
                  <DbIcon className="w-6 h-6 text-[#1351B4]" />
                </div>
                <button onClick={() => setIsSupabaseGuideOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Conectar ao Supabase</h2>
              <p className="text-slate-500 text-sm mb-6">Siga os passos abaixo para migrar seus dados para a nuvem.</p>
              
              <div className="space-y-4 mb-8">
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Crie um projeto no Supabase</h4>
                    <p className="text-xs text-slate-500">Acesse supabase.com e crie um novo projeto gratuito.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Crie a tabela 'emendas'</h4>
                    <p className="text-xs text-slate-500">Use o SQL Editor com o script que preparei para você.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Configure as Secrets</h4>
                    <p className="text-xs text-slate-500">Adicione SUPABASE_URL e SUPABASE_ANON_KEY nas configurações do AI Studio.</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6">
                <div className="flex items-center gap-2 text-[#1351B4] font-bold text-xs uppercase tracking-wider mb-2">
                  <Info className="w-3 h-3" />
                  Dica de Importação
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Você pode usar o botão "Importar CSV" para subir os dados do seu arquivo diretamente para o Supabase após configurar as chaves.
                </p>
              </div>

              <button 
                onClick={() => {
                  const sql = `CREATE TABLE emendas (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  detalhes TEXT,
  natureza TEXT,
  ano_refer TEXT,
  codigo_num TEXT,
  num_emenda TEXT,
  parecer_ld TEXT,
  situacao_e TEXT,
  situacao_d TEXT,
  data_ult_e TEXT,
  data_ult_d TEXT,
  num_indicacao TEXT,
  parlamentar TEXT,
  partido TEXT,
  tipo_beneficiario TEXT,
  beneficiario TEXT,
  cnpj TEXT,
  municipio TEXT,
  objeto TEXT,
  orgao_entidade TEXT,
  regional TEXT,
  num_convenio TEXT,
  num_processo TEXT,
  data_assinatura TEXT,
  data_publicacao TEXT,
  agencia TEXT,
  conta TEXT,
  valor NUMERIC DEFAULT 0,
  valor_desembolsado NUMERIC DEFAULT 0,
  portfolio TEXT,
  qtd_dias INTEGER DEFAULT 0,
  vigencia TEXT,
  data_prorrogacao TEXT,
  dados_bancarios TEXT,
  status TEXT,
  data_pagamento TEXT,
  num_codigo TEXT,
  notas_empenho TEXT,
  valor_total_empenhado NUMERIC DEFAULT 0,
  notas_liquidacao TEXT,
  valor_total_liquidado NUMERIC DEFAULT 0,
  programa TEXT,
  valor_total_pago NUMERIC DEFAULT 0,
  ordem_bancaria TEXT,
  data_paga TEXT,
  valor_total_ordem_bancaria NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar acesso público (opcional)
ALTER TABLE emendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir tudo para usuários autenticados" ON emendas FOR ALL TO anon USING (true) WITH CHECK (true);`;
                  navigator.clipboard.writeText(sql);
                  alert('Script SQL copiado para a área de transferência!');
                }}
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
              >
                Copiar Script SQL
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Busca em Lista */}
      <AnimatePresence>
        {isBuscaListaOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsBuscaListaOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileSearch className="w-5 h-5 text-violet-600" /> Busca por Lista
                </h2>
                <button onClick={() => setIsBuscaListaOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-2">
                Cole ou digite uma lista de <strong>demandas</strong>, <strong>emendas</strong> ou <strong>nº convênio</strong> — uma por linha, ou separadas por vírgula/ponto e vírgula. Suporta <strong>5.000+ itens</strong>.
              </p>
              {/* Botão para carregar arquivo de texto */}
              <label className="inline-flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 cursor-pointer mb-2 font-medium">
                <Upload className="w-3.5 h-3.5" />
                Carregar arquivo (.txt / .csv)
                <input
                  type="file"
                  accept=".txt,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const text = ev.target?.result as string;
                      setBuscaListaText(prev => prev ? prev + '\n' + text : text);
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }}
                />
              </label>
              <textarea
                className="w-full h-72 border border-slate-200 rounded-xl p-3 text-sm font-mono text-slate-800 resize-y focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                placeholder={"202601687824\n202604087827\n202609287830\n..."}
                value={buscaListaText}
                onChange={(e) => setBuscaListaText(e.target.value)}
                autoFocus
              />
              {/* Preview do número de termos detectados */}
              {(() => {
                const previewCount = buscaListaText
                  .split(/[\n,;]+/).map(t => t.trim()).filter(Boolean).length;
                return previewCount > 0 ? (
                  <p className="text-xs mt-1 font-semibold text-violet-600">
                    {previewCount.toLocaleString('pt-BR')} {previewCount === 1 ? 'item detectado' : 'itens detectados'}
                    {buscaListaTerms.length > 0 && ` — ${buscaListaTerms.length.toLocaleString('pt-BR')} aplicados`}
                  </p>
                ) : buscaListaTerms.length > 0 ? (
                  <p className="text-xs mt-1 text-violet-600 font-semibold">
                    {buscaListaTerms.length.toLocaleString('pt-BR')} {buscaListaTerms.length === 1 ? 'item aplicado' : 'itens aplicados'}
                  </p>
                ) : null;
              })()}
              <div className="flex gap-2 mt-3">
                <button
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-2 rounded-xl transition-colors"
                  onClick={() => {
                    const terms = buscaListaText
                      .split(/[\n,;]+/)
                      .map(t => t.trim())
                      .filter(Boolean);
                    setBuscaListaTerms(terms);
                    setIsBuscaListaOpen(false);
                  }}
                >
                  Filtrar
                </button>
                <button
                  className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold py-2 rounded-xl transition-colors"
                  onClick={() => {
                    setBuscaListaText('');
                    setBuscaListaTerms([]);
                    setIsBuscaListaOpen(false);
                  }}
                >
                  Limpar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import CSV Modal */}
      <AnimatePresence>
        {isImportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { if (importStatus === 'idle' || importStatus === 'done' || importStatus === 'error') setIsImportOpen(false); }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Upload className="w-5 h-5 text-violet-600" /> Importar Emendas</h2>
                <button onClick={() => { if (importStatus === 'idle' || importStatus === 'done' || importStatus === 'error') { setIsImportOpen(false); setImportStatus('idle'); setImportProgress(0); setImportMessage(''); setImportError(''); } }} className="p-1.5 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <p className="text-sm text-slate-500 mb-4">Selecione o arquivo de emendas no formato <strong>XLSX</strong>. O sistema detecta automaticamente o cabeçalho e sincroniza os dados.</p>

              <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportCSV(f); e.target.value = ''; }} />

              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => fileInputRef.current?.click()} disabled={importStatus === 'uploading' || importStatus === 'backing-up' || importStatus === 'syncing' || importStatus === 'parsing'} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-400 text-white text-sm font-semibold rounded-lg px-5 py-2.5 transition-colors">
                  <Upload className="w-4 h-4" /> Selecionar Arquivo
                </button>
                {importStatus === 'done' && (
                  <button onClick={() => { setImportStatus('idle'); setImportProgress(0); setImportMessage(''); setImportError(''); }} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors">
                    <RefreshCw className="w-4 h-4" /> Nova importação
                  </button>
                )}
              </div>

              {importStatus !== 'idle' && (
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 font-medium">{importMessage}</span>
                    {importProgress > 0 && <span className="text-slate-500 font-bold">{importProgress}%</span>}
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${importProgress}%` }} transition={{ duration: 0.3 }} className={`h-full rounded-full ${importStatus === 'error' ? 'bg-red-500' : importStatus === 'done' ? 'bg-green-500' : 'bg-violet-500'}`} />
                  </div>
                  {importTotal > 0 && importStatus === 'uploading' && (
                    <p className="text-xs text-slate-500">{Math.round(importProgress * importTotal / 90)} de {importTotal} registros</p>
                  )}
                </div>
              )}

              {importStatus === 'done' && (
                <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">{importMessage}</p>
                </div>
              )}
              {importStatus === 'error' && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-800">{importError}</p>
                    <button onClick={() => { setImportStatus('idle'); setImportProgress(0); setImportMessage(''); setImportError(''); }} className="mt-1 text-xs text-red-600 hover:text-red-800 underline">Tentar novamente</button>
                  </div>
                </div>
              )}

              {importStatus !== 'idle' && importStatus !== 'error' && (
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className={`flex items-center gap-1 ${importStatus === 'parsing' ? 'text-violet-600 font-semibold' : importProgress > 0 ? 'text-green-600' : ''}`}>
                    {importProgress > 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5 animate-spin" />} Leitura
                  </span>
                  <span className={`flex items-center gap-1 ${
                    importStatus === 'uploading' ? 'text-violet-600 font-semibold'
                    : (importStatus === 'backing-up' || importStatus === 'syncing' || importStatus === 'done') ? 'text-green-600' : ''
                  }`}>
                    {(importStatus === 'backing-up' || importStatus === 'syncing' || importStatus === 'done')
                      ? <CheckCircle2 className="w-3.5 h-3.5" />
                      : importStatus === 'uploading'
                        ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        : <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />} Upload
                  </span>
                  <span className={`flex items-center gap-1 ${
                    importStatus === 'backing-up' ? 'text-amber-600 font-semibold'
                    : (importStatus === 'syncing' || importStatus === 'done') ? 'text-green-600' : ''
                  }`}>
                    {(importStatus === 'syncing' || importStatus === 'done')
                      ? <CheckCircle2 className="w-3.5 h-3.5" />
                      : importStatus === 'backing-up'
                        ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        : <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />} Backup
                  </span>
                  <span className={`flex items-center gap-1 ${importStatus === 'syncing' ? 'text-violet-600 font-semibold' : importStatus === 'done' ? 'text-green-600' : ''}`}>
                    {importStatus === 'done' ? <CheckCircle2 className="w-3.5 h-3.5" /> : importStatus === 'syncing' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />} Sync
                  </span>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Update Tipo/Recurso Modal */}
      <AnimatePresence>
        {isUpdateCamposOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { if (updateCamposStatus === 'idle' || updateCamposStatus === 'done' || updateCamposStatus === 'error') setIsUpdateCamposOpen(false); }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><PenLine className="w-5 h-5 text-emerald-600" /> Atualizar Tipo/Recurso</h2>
                <button onClick={() => { if (updateCamposStatus === 'idle' || updateCamposStatus === 'done' || updateCamposStatus === 'error') { setIsUpdateCamposOpen(false); setUpdateCamposStatus('idle'); setUpdateCamposProgress(0); setUpdateCamposMessage(''); setUpdateCamposError(''); } }} className="p-1.5 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <p className="text-sm text-slate-500 mb-3">Envie uma planilha com as colunas <strong>Emenda</strong>, <strong>Tipo de formalização</strong> e <strong>Recurso</strong>. O sistema usará a coluna "Emenda" como referência para atualizar os campos correspondentes na tabela de formalização.</p>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
                <p className="text-xs font-bold text-slate-700 mb-1">Colunas esperadas:</p>
                <div className="flex gap-2 flex-wrap">
                  <span className="bg-slate-200 text-slate-700 text-xs font-mono px-2 py-0.5 rounded">Emenda</span>
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-mono px-2 py-0.5 rounded">Tipo de formalização</span>
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-mono px-2 py-0.5 rounded">Recurso</span>
                </div>
              </div>

              <input ref={fileInputUpdateCamposRef} type="file" accept=".csv,.xls,.xlsx,.xml" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpdateCamposCSV(f); e.target.value = ''; }} />

              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => fileInputUpdateCamposRef.current?.click()} disabled={updateCamposStatus === 'uploading' || updateCamposStatus === 'backing-up' || updateCamposStatus === 'parsing'} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white text-sm font-semibold rounded-lg px-5 py-2.5 transition-colors">
                  <Upload className="w-4 h-4" /> Selecionar Arquivo
                </button>
                {updateCamposStatus === 'done' && (
                  <button onClick={() => { setUpdateCamposStatus('idle'); setUpdateCamposProgress(0); setUpdateCamposMessage(''); setUpdateCamposError(''); }} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors">
                    <RefreshCw className="w-4 h-4" /> Nova atualização
                  </button>
                )}
              </div>

              {updateCamposStatus !== 'idle' && (
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 font-medium">{updateCamposMessage}</span>
                    {updateCamposProgress > 0 && <span className="text-slate-500 font-bold">{updateCamposProgress}%</span>}
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${updateCamposProgress}%` }} transition={{ duration: 0.3 }} className={`h-full rounded-full ${updateCamposStatus === 'error' ? 'bg-red-500' : updateCamposStatus === 'done' ? 'bg-green-500' : 'bg-emerald-500'}`} />
                  </div>
                </div>
              )}

              {updateCamposStatus === 'done' && (
                <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">{updateCamposMessage}</p>
                </div>
              )}
              {updateCamposStatus === 'error' && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-800">{updateCamposError}</p>
                    <button onClick={() => { setUpdateCamposStatus('idle'); setUpdateCamposProgress(0); setUpdateCamposMessage(''); setUpdateCamposError(''); }} className="mt-1 text-xs text-red-600 hover:text-red-800 underline">Tentar novamente</button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Formalization Form Modal */}
      <AnimatePresence>
        {isFormalizacaoFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeEditForm}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-gray-50 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Diálogo de confirmação de descarte */}
              {confirmDiscard && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm rounded-2xl">
                  <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-amber-100 p-2 rounded-lg flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      </div>
                      <h3 className="text-base font-bold text-slate-800">Alterações não salvas</h3>
                    </div>
                    <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                      Você fez alterações neste registro que ainda não foram salvas. Deseja descartar as alterações e fechar?
                    </p>
                    <div className="flex gap-3 justify-end">
                      <button
                        type="button"
                        onClick={() => setConfirmDiscard(false)}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        Continuar editando
                      </button>
                      <button
                        type="button"
                        onClick={() => { setConfirmDiscard(false); editFormRef.current?.requestSubmit(); }}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#1351B4] hover:bg-[#0C326F] transition-colors"
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={discardAndClose}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
                      >
                        Descartar alterações
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="px-6 py-4 flex justify-between items-center bg-gradient-to-r from-[#1351B4] to-[#0C326F]">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingFormalizacao ? 'Editar Demanda' : 'Nova Demanda'}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[11px] text-white/60">Preencha os campos para atualizar as informações.</p>
                    {formDirty && (
                      <span className="text-[10px] font-semibold bg-amber-400/30 text-amber-200 border border-amber-400/40 px-2 py-0.5 rounded-full">
                        Alterações não salvas
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeEditForm}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-white/80" />
                </button>
              </div>

              <form ref={editFormRef} key={editingFormalizacao?.id ?? 'new'} onSubmit={handleSubmitFormalizacao} onChange={() => setFormDirty(true)} className="flex-1 overflow-y-auto p-6 space-y-5">

                {/* Permissões por papel: técnico e conferencista */}
                {(() => {
                  const isTecnicoAtribuido = !isAdmin && editingFormalizacao && (
                    (user?.id && editingFormalizacao.usuario_atribuido_id && user.id === editingFormalizacao.usuario_atribuido_id) ||
                    (user?.nome && editingFormalizacao.tecnico && user.nome === editingFormalizacao.tecnico)
                  );
                  const isConferencistaAtribuido = !isAdmin && editingFormalizacao && (
                    user?.nome && editingFormalizacao.conferencista && user.nome === editingFormalizacao.conferencista
                  );
                  const tecnicoEditableFields = [
                    'area_estagio_situacao_demanda', 'situacao_analise_demanda', 'data_analise_demanda',
                    'observacao_analise_demanda',
                    'motivo_retorno_diligencia', 'data_retorno_diligencia',
                    'data_liberacao_assinatura', 'falta_assinatura', 'assinatura',
                    'publicacao', 'vigencia', 'encaminhado_em', 'concluida_em'
                  ];
                  const conferencistaEditableFields = [
                    'area_estagio_situacao_demanda', 'situacao_analise_demanda',
                    'data_liberacao_assinatura_conferencista', 'data_retorno', 'data_recebimento_demanda', 'observacao_motivo_retorno',
                    'falta_assinatura', 'assinatura',
                    'publicacao', 'vigencia', 'encaminhado_em', 'concluida_em'
                  ];
                  const isFieldDisabled = (fieldName: string): boolean => {
                    if (isAdmin) return false;
                    if (isVisualizador) return true;
                    // When user is BOTH técnico AND conferencista, allow fields from either list
                    if (isTecnicoAtribuido && isConferencistaAtribuido) {
                      return !tecnicoEditableFields.includes(fieldName) && !conferencistaEditableFields.includes(fieldName);
                    }
                    if (isTecnicoAtribuido) return !tecnicoEditableFields.includes(fieldName);
                    if (isConferencistaAtribuido) return !conferencistaEditableFields.includes(fieldName);
                    if (isUsuario) return true;
                    // ⚠️ SEGURANÇA: isIntermediario sem atribuição, e qualquer outro role não mapeado
                    // só pode ver — não pode editar nenhum campo do formulário
                    return true;
                  };
                  const lockOnceFilledFields = new Set([
                    'data_liberacao_assinatura', 'falta_assinatura', 'assinatura',
                    'publicacao', 'vigencia', 'encaminhado_em', 'concluida_em'
                  ]);
                  const isDateLocked = (fieldName: string): boolean => {
                    if (isAdmin) return false;
                    if (!editingFormalizacao) return false;
                    const val = (editingFormalizacao as any)[fieldName];
                    return !!val && String(val).trim() !== '';
                  };
                  const isDisabled = (fieldName: string, _isDate = false): boolean => {
                    if (isFieldDisabled(fieldName)) return true;
                    if (lockOnceFilledFields.has(fieldName) && isDateLocked(fieldName)) return true;
                    return false;
                  };
                  const disabledClass = (fieldName: string, isDate = false): string => {
                    return isDisabled(fieldName, isDate) ? 'opacity-50 cursor-not-allowed bg-gray-50' : '';
                  };
                  const toInputDate = (val?: string): string => {
                    if (!val) return '';
                    const s = val.trim();
                    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
                    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
                      const [d, m, y] = s.split('/');
                      return `${y}-${m}-${d}`;
                    }
                    return '';
                  };

                  // Estilo de seção por role — cartões neutros (branco), a cor vive só no
                  // detalhe esquerdo, no selo do ícone e no pill do papel. Reduz o "arco-íris"
                  // de fundos coloridos que deixava o modal poluído.
                  const sectionRole = (role: 'tecnico' | 'conferencista' | 'shared' | 'readonly' | 'admin') => {
                    const styles = {
                      tecnico:       { border: 'border-l-4 border-l-violet-500 border border-gray-200',  bg: 'bg-gray-50/70', headerBg: 'bg-violet-600',  headerText: 'text-violet-700',  badge: 'bg-violet-50 text-violet-700 border-violet-200' },
                      conferencista: { border: 'border-l-4 border-l-sky-500 border border-gray-200',     bg: 'bg-gray-50/70', headerBg: 'bg-sky-600',     headerText: 'text-sky-700',     badge: 'bg-sky-50 text-sky-700 border-sky-200' },
                      shared:        { border: 'border-l-4 border-l-emerald-500 border border-gray-200', bg: 'bg-gray-50/70', headerBg: 'bg-emerald-600', headerText: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                      readonly:      { border: 'border-l-4 border-l-gray-300 border border-gray-200',    bg: 'bg-gray-50/70', headerBg: 'bg-gray-400',    headerText: 'text-gray-600',    badge: 'bg-gray-100 text-gray-600 border-gray-200' },
                      admin:         { border: 'border-l-4 border-l-rose-500 border border-gray-200',    bg: 'bg-gray-50/70', headerBg: 'bg-rose-600',    headerText: 'text-rose-700',    badge: 'bg-rose-50 text-rose-700 border-rose-200' },
                    };
                    return styles[role];
                  };

                  return (
                    <>

                {/* Legenda de cores */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2 rounded-xl bg-gray-50 border border-gray-100 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-500"></span> Técnico edita</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-500"></span> Conferencista edita</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Ambos editam</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Somente Admin</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-400"></span> Somente leitura</span>
                </div>

                {/* ═══════════ DADOS DA EMENDA (Somente leitura — expansível) ═══════════ */}
                {editingFormalizacao && (() => {
                  const s = sectionRole('readonly');
                  const f = editingFormalizacao;
                  const detailFields: { label: string; value: string }[] = [
                    { label: 'Ano', value: f.ano || '—' },
                    { label: 'Parlamentar', value: f.parlamentar || '—' },
                    { label: 'Partido', value: f.partido || '—' },
                    { label: 'Emenda', value: formatEmendaNumber(f.emenda) || '—' },
                    { label: 'Emendas Agregadoras', value: f.emendas_agregadoras || '—' },
                    { label: 'Demanda', value: f.demanda || f.demandas_formalizacao || '—' },
                    { label: 'Nº Convênio', value: f.numero_convenio || '—' },
                    { label: 'Classificação', value: f.classificacao_emenda_demanda || '—' },
                    { label: 'Tipo Formalização', value: f.tipo_formalizacao || '—' },
                    { label: 'Regional', value: f.regional || '—' },
                    { label: 'Município', value: f.municipio || '—' },
                    { label: 'Conveniado', value: f.conveniado || '—' },
                    { label: 'Objeto', value: f.objeto || '—' },
                    { label: 'Portfólio', value: f.portfolio || '—' },
                    { label: 'Valor', value: formatCurrency(f.valor) },
                    { label: 'Situação Emenda', value: f.situacao_emenda || '—' },
                    { label: 'Situação SemPapel', value: f.situacao_demandas_sempapel || '—' },
                    { label: 'Área - Estágio', value: f.area_estagio || '—' },
                    { label: 'Recurso', value: f.recurso || '—' },
                    { label: 'Parecer LDO', value: f.parecer_ld || '—' },
                  ];
                  // First 3 always visible, rest collapsible
                  const mainFields = detailFields.slice(0, 6);
                  const extraFields = detailFields.slice(6);
                  return (
                  <div className={`rounded-2xl shadow-sm overflow-hidden ${s.border} ${s.bg}`}>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('emenda-details-extra');
                        if (el) el.classList.toggle('hidden');
                        const chevron = document.getElementById('emenda-details-chevron');
                        if (chevron) chevron.classList.toggle('rotate-90');
                      }}
                      className={`w-full px-5 py-3 flex items-center gap-2.5 ${s.bg} border-b border-gray-100 hover:brightness-95 transition-all cursor-pointer`}
                    >
                      <div className={`${s.headerBg} text-white rounded-lg w-6 h-6 flex items-center justify-center text-[10px] font-bold shadow-sm`}>
                        <Lock className="w-3 h-3" />
                      </div>
                      <h3 className={`text-xs font-bold ${s.headerText} uppercase tracking-wide`}>Detalhes da Emenda</h3>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.badge}`}>Somente Leitura</span>
                      <ChevronRight id="emenda-details-chevron" className={`w-3.5 h-3.5 ml-auto text-gray-400 transition-transform duration-200`} />
                    </button>
                    <div className="px-5 py-3 bg-white">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-x-4 gap-y-2">
                        {mainFields.map(({ label, value }) => (
                          <div key={label} className="min-w-0">
                            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider block truncate">{label}</span>
                            <p className="text-xs font-semibold text-gray-800 mt-0.5 truncate" title={value}>{value}</p>
                          </div>
                        ))}
                      </div>
                      <div id="emenda-details-extra" className="hidden mt-3 pt-3 border-t border-gray-100">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2">
                          {extraFields.map(({ label, value }) => (
                            <div key={label} className="min-w-0">
                              <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider block truncate">{label}</span>
                              <p className="text-xs font-semibold text-gray-800 mt-0.5 truncate" title={value}>{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })()}

                {/* ═══════════ ESTÁGIO DA DEMANDA (Ambos) ═══════════ */}
                {(() => {
                  const s = sectionRole('shared');
                  return (
                  <div className={`rounded-2xl shadow-sm overflow-hidden ${s.border} ${s.bg}`}>
                    <div className={`px-5 py-3 flex items-center gap-2.5 ${s.bg} border-b border-gray-100`}>
                      <div className={`${s.headerBg} text-white rounded-lg w-6 h-6 flex items-center justify-center text-[10px] font-bold shadow-sm`}>★</div>
                      <h3 className={`text-xs font-bold ${s.headerText} uppercase tracking-wide`}>Área – Estágio da Situação da Demanda</h3>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.badge}`}>Técnico + Conferencista</span>
                    </div>
                    <div className="p-5 bg-white">
                      <select
                        id="area_estagio_situacao_demanda_select"
                        name="area_estagio_situacao_demanda"
                        defaultValue={editingFormalizacao?.area_estagio_situacao_demanda || ''}
                        disabled={isDisabled('area_estagio_situacao_demanda')}
                        className={`w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all appearance-none ${disabledClass('area_estagio_situacao_demanda')}`}
                      >
                        <option value="">-- Selecione --</option>
                        <option value="DEMANDA COM O TÉCNICO">DEMANDA COM O TÉCNICO</option>
                        <option value="DEMANDA COM O TÉCNICO - FUNDO A FUNDO">DEMANDA COM O TÉCNICO - FUNDO A FUNDO</option>
                        <option value="EM ANÁLISE DA DOCUMENTAÇÃO">EM ANÁLISE DA DOCUMENTAÇÃO</option>
                        <option value="EM ANÁLISE DA DOCUMENTAÇÃO - FUNDO A FUNDO">EM ANÁLISE DA DOCUMENTAÇÃO - FUNDO A FUNDO</option>
                        <option value="EM ANÁLISE DO PLANO DE TRABALHO">EM ANÁLISE DO PLANO DE TRABALHO</option>
                        <option value="EM ANÁLISE DO PLANO DE TRABALHO - FUNDO A FUNDO">EM ANÁLISE DO PLANO DE TRABALHO - FUNDO A FUNDO</option>
                        <option value="AGUARDANDO DOCUMENTAÇÃO">AGUARDANDO DOCUMENTAÇÃO</option>
                        <option value="AGUARDANDO DOCUMENTAÇÃO - FUNDO A FUNDO">AGUARDANDO DOCUMENTAÇÃO - FUNDO A FUNDO</option>
                        <option value="DEMANDA EM DILIGÊNCIA">DEMANDA EM DILIGÊNCIA</option>
                        <option value="DEMANDA EM DILIGÊNCIA - FUNDO A FUNDO">DEMANDA EM DILIGÊNCIA - FUNDO A FUNDO</option>
                        <option value="DEMANDA EM DILIGÊNCIA DOCUMENTO - DRS">DEMANDA EM DILIGÊNCIA DOCUMENTO - DRS</option>
                        <option value="DEMANDA EM DILIGÊNCIA DOCUMENTO - DRS - FUNDO A FUNDO">DEMANDA EM DILIGÊNCIA DOCUMENTO - DRS - FUNDO A FUNDO</option>
                        <option value="DEMANDA EM DILIGÊNCIA PLANO DE TRABALHO - CRS">DEMANDA EM DILIGÊNCIA PLANO DE TRABALHO - CRS</option>
                        <option value="DEMANDA EM DILIGÊNCIA PLANO DE TRABALHO - CRS - FUNDO A FUNDO">DEMANDA EM DILIGÊNCIA PLANO DE TRABALHO - CRS - FUNDO A FUNDO</option>
                        <option value="COMITÊ GESTOR">COMITÊ GESTOR</option>
                        <option value="COMITÊ GESTOR - FUNDO A FUNDO">COMITÊ GESTOR - FUNDO A FUNDO</option>
                        <option value="OUTRAS PENDÊNCIAS">OUTRAS PENDÊNCIAS</option>
                        <option value="OUTRAS PENDÊNCIAS - FUNDO A FUNDO">OUTRAS PENDÊNCIAS - FUNDO A FUNDO</option>
                        <option value="EM FORMALIZAÇÃO">EM FORMALIZAÇÃO</option>
                        <option value="EM FORMALIZAÇÃO - FUNDO A FUNDO">EM FORMALIZAÇÃO - FUNDO A FUNDO</option>
                        <option value="EM CONFERÊNCIA">EM CONFERÊNCIA</option>
                        <option value="EM CONFERÊNCIA - FUNDO A FUNDO">EM CONFERÊNCIA - FUNDO A FUNDO</option>
                        <option value="CONFERÊNCIA COM PENDÊNCIA">CONFERÊNCIA COM PENDÊNCIA</option>
                        <option value="CONFERÊNCIA COM PENDÊNCIA - FUNDO A FUNDO">CONFERÊNCIA COM PENDÊNCIA - FUNDO A FUNDO</option>
                        <option value="EM ASSINATURA">EM ASSINATURA</option>
                        <option value="EM ASSINATURA - FUNDO A FUNDO">EM ASSINATURA - FUNDO A FUNDO</option>
                        <option value="EMPENHO CANCELADO">EMPENHO CANCELADO</option>
                        <option value="EMPENHO CANCELADO - FUNDO A FUNDO">EMPENHO CANCELADO - FUNDO A FUNDO</option>
                        <option value="LAUDAS">LAUDAS</option>
                        <option value="LAUDAS - FUNDO A FUNDO">LAUDAS - FUNDO A FUNDO</option>
                        <option value="PUBLICAÇÃO NO DOE">PUBLICAÇÃO NO DOE</option>
                        <option value="PUBLICAÇÃO NO DOE - FUNDO A FUNDO">PUBLICAÇÃO NO DOE - FUNDO A FUNDO</option>
                        <option value="PROCESSO SIAFEM">PROCESSO SIAFEM</option>
                        <option value="PROCESSO SIAFEM - FUNDO A FUNDO">PROCESSO SIAFEM - FUNDO A FUNDO</option>
                        <option value="EM ANÁLISE ORÇAMENTÁRIA CGOF – FUNDO A FUNDO">EM ANÁLISE ORÇAMENTÁRIA CGOF – FUNDO A FUNDO</option>
                        <option value="PARECER COORDENADOR CGOF – FUNDO A FUNDO">PARECER COORDENADOR CGOF – FUNDO A FUNDO</option>
                        <option value="APROVAÇÃO - CHEFIA DE GABINETE – FUNDO A FUNDO">APROVAÇÃO - CHEFIA DE GABINETE – FUNDO A FUNDO</option>
                        <option value="AGUARDANDO APROVAÇÃO DO SECRETARIO DE ESTADO DA SAÚDE – FUNDO A FUNDO">AGUARDANDO APROVAÇÃO DO SECRETARIO DE ESTADO DA SAÚDE – FUNDO A FUNDO</option>
                        <option value="AGUARDANDO RESOLUÇÃO PARA EMISSÃO RESOLUÇÃO PARA REPASSE FUNDO A FUNDO - DOE">AGUARDANDO RESOLUÇÃO PARA EMISSÃO RESOLUÇÃO PARA REPASSE FUNDO A FUNDO - DOE</option>
                        <option value="FORMALIZADO AGUARDANDO IMPEDIMENTO">FORMALIZADO AGUARDANDO IMPEDIMENTO</option>
                      </select>

                      {/* ── Histórico de alterações da situação ── */}
                      {(() => {
                        const hist = (editingFormalizacao?.historico_situacao ?? []).slice().reverse();
                        if (hist.length === 0) return null;
                        const campoLabel: Record<string, string> = {
                          area_estagio_situacao_demanda: 'Área – Estágio',
                          situacao_analise_demanda: 'Situação Análise',
                          data_analise_demanda: 'Data Análise',
                          data_liberacao: 'Data Liberação',
                          data_recebimento_demanda: 'Data Recebimento',
                          data_liberacao_assinatura_conferencista: 'Lib. Assinatura (Conf.)',
                          data_liberacao_assinatura: 'Lib. Assinatura',
                          tecnico: 'Técnico',
                          conferencista: 'Conferencista',
                          publicacao: 'Publicação',
                          concluida_em: 'Concluída em',
                          motivo_retorno_diligencia: 'Motivo Retorno',
                          data_retorno_diligencia: 'Data Retorno Diligência',
                          data_retorno: 'Data Retorno',
                          observacao_motivo_retorno: 'Obs. Motivo Retorno',
                          assinatura: 'Assinatura',
                          vigencia: 'Vigência',
                          encaminhado_em: 'Encaminhado em',
                          falta_assinatura: 'Falta Assinatura',
                          recurso: 'Recurso',
                        };
                        const isSistema = (u: string) => !u || u === 'sistema';
                        const initials = (nome: string) => {
                          const parts = nome.trim().split(/\s+/);
                          if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                          return nome.slice(0, 2).toUpperCase();
                        };
                        return (
                          <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-50 flex items-center justify-between border-b border-slate-200">
                              <div className="flex items-center gap-2">
                                <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
                                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Histórico de Alterações</span>
                              </div>
                              <span className="text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                                {hist.length} registro{hist.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                              {hist.map((entry, i) => (
                                <div key={i} className="px-4 py-2.5 bg-white hover:bg-slate-50 transition-colors text-[11px]">
                                  <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <span className="font-semibold text-slate-700 text-[11px]">
                                      {campoLabel[entry.campo] ?? entry.campo}
                                    </span>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      <span className="text-slate-400 text-[10px]">{entry.em}</span>
                                      {isSistema(entry.usuario) ? (
                                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-full">
                                          sistema
                                        </span>
                                      ) : (
                                        <div className="flex items-center gap-1">
                                          <span className="w-5 h-5 rounded-full bg-[#1351B4] text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0">
                                            {initials(entry.usuario)}
                                          </span>
                                          <span className="text-[10px] font-semibold text-[#1351B4] max-w-[120px] truncate" title={entry.usuario}>
                                            {entry.usuario}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] max-w-[220px] truncate" title={entry.de || '(vazio)'}>
                                      {entry.de || '(vazio)'}
                                    </span>
                                    <span className="text-slate-400 font-bold">→</span>
                                    <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded text-[10px] max-w-[220px] truncate" title={entry.para || '(vazio)'}>
                                      {entry.para || '(vazio)'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  );
                })()}

                {/* ═══════════ 1. ATRIBUIÇÃO (Somente Admin) ═══════════ */}
                {(() => {
                  const s = sectionRole('admin');
                  return (
                  <div className={`rounded-2xl shadow-sm overflow-hidden ${s.border} ${s.bg}`}>
                    <div className={`px-5 py-3 flex items-center gap-2.5 ${s.bg} border-b border-gray-100`}>
                      <div className={`${s.headerBg} text-white rounded-lg w-6 h-6 flex items-center justify-center text-[10px] font-bold shadow-sm`}>1</div>
                      <h3 className={`text-xs font-bold ${s.headerText} uppercase tracking-wide flex items-center gap-2`}>
                        <ClipboardList className="w-3.5 h-3.5" />
                        Atribuição da Demanda
                      </h3>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.badge}`}>Somente Admin</span>
                    </div>
                    <div className="p-5 bg-white grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500 ml-0.5">Técnico</label>
                        <select
                          name="tecnico"
                          defaultValue={editingFormalizacao?.tecnico || ''}
                          disabled={isDisabled('tecnico')}
                          className={`w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:border-[#1351B4] focus:ring-4 focus:ring-[#1351B4]/10 outline-none transition-all appearance-none ${disabledClass('tecnico')}`}
                        >
                          <option value="">-- Selecione o Técnico --</option>
                          {tecnicosDisponiveis.map((t: any) => (
                            <option key={t.id} value={t.nome}>{t.nome} ({t.email})</option>
                          ))}
                        </select>
                      </div>
                      <Input label="Data da Liberação" name="data_liberacao" type="date" defaultValue={toInputDate(editingFormalizacao?.data_liberacao)} disabled={isDisabled('data_liberacao')} />
                      <Input label="Área - Estágio" name="area_estagio" defaultValue={editingFormalizacao?.area_estagio} disabled={isDisabled('area_estagio')} />
                      <Input label="Recurso" name="recurso" defaultValue={editingFormalizacao?.recurso} disabled={isDisabled('recurso')} />
                    </div>
                  </div>
                  );
                })()}

                {/* ═══════════ 2. ANÁLISE DA DEMANDA (Técnico) ═══════════ */}
                {(() => {
                  const s = sectionRole('tecnico');
                  return (
                  <div className={`rounded-2xl shadow-sm overflow-hidden ${s.border} ${s.bg}`}>
                    <div className={`px-5 py-3 flex items-center gap-2.5 ${s.bg} border-b border-gray-100`}>
                      <div className={`${s.headerBg} text-white rounded-lg w-6 h-6 flex items-center justify-center text-[10px] font-bold shadow-sm`}>2</div>
                      <h3 className={`text-xs font-bold ${s.headerText} uppercase tracking-wide flex items-center gap-2`}>
                        <FileSearch className="w-3.5 h-3.5" />
                        Análise da Demanda
                      </h3>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.badge}`}>Técnico</span>
                    </div>
                    <div className="p-5 bg-white grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                      <Input label="Situação - Análise Demanda" name="situacao_analise_demanda" defaultValue={editingFormalizacao?.situacao_analise_demanda} disabled={isDisabled('situacao_analise_demanda')} />
                      <Input label="Observação" name="observacao_analise_demanda" defaultValue={editingFormalizacao?.observacao_analise_demanda} disabled={isDisabled('observacao_analise_demanda')} />
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500 ml-0.5">Data - Análise Demanda</label>
                        {isAdmin ? (
                          <Input label="" name="data_analise_demanda" type="date" defaultValue={editingFormalizacao?.data_analise_demanda} />
                        ) : isDisabled('data_analise_demanda') || isDateLocked('data_analise_demanda') ? (
                          <>
                            <input type="hidden" name="data_analise_demanda" defaultValue={editingFormalizacao?.data_analise_demanda || ''} />
                            <span className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 min-h-[38px] flex items-center opacity-50">
                              {editingFormalizacao?.data_analise_demanda ? formatDateForDisplay(editingFormalizacao.data_analise_demanda) : '—'}
                            </span>
                          </>
                        ) : (
                          <>
                            <input type="hidden" name="data_analise_demanda" id="data_analise_demanda_hidden" defaultValue={editingFormalizacao?.data_analise_demanda || ''} />
                            <div className="flex items-center gap-2">
                              <span id="data_analise_demanda_display" className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 min-h-[38px] flex items-center">
                                {editingFormalizacao?.data_analise_demanda ? formatDateForDisplay(editingFormalizacao.data_analise_demanda) : '—'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const dataHoje = preencherDataDeHoje('data_analise_demanda_hidden', 'data_analise_demanda_display');
                                  // Mesmo clique também libera a demanda para o admin atribuir um conferencista
                                  if (liberarConferenciaInputRef.current && !liberarConferenciaInputRef.current.value) {
                                    liberarConferenciaInputRef.current.value = dataHoje;
                                  }
                                  // Move a Área - Estágio para "EM CONFERÊNCIA" (ou variante Fundo a Fundo, conforme o checkbox)
                                  const areaSelect = document.getElementById('area_estagio_situacao_demanda_select') as HTMLSelectElement;
                                  const fundoCheck = document.getElementById('demanda_analisada_fundo_a_fundo') as HTMLInputElement;
                                  if (areaSelect) {
                                    areaSelect.value = fundoCheck?.checked ? 'EM CONFERÊNCIA - FUNDO A FUNDO' : 'EM CONFERÊNCIA';
                                  }
                                  // Salva imediatamente sem fechar o modal — não depende do usuário lembrar de clicar em "Atualizar Registro" depois
                                  salvarFormularioRapido(true);
                                }}
                                className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
                              >
                                <CheckSquare className="w-3.5 h-3.5" />
                                Demanda Analisada
                              </button>
                            </div>
                            <label className="flex items-center gap-1.5 mt-1.5 text-[11px] text-gray-500 cursor-pointer select-none">
                              <input type="checkbox" id="demanda_analisada_fundo_a_fundo" className="rounded border-gray-300 accent-violet-600" />
                              É Fundo a Fundo? (ao clicar em "Demanda Analisada", a Área – Estágio vai para "EM CONFERÊNCIA - FUNDO A FUNDO" em vez de "EM CONFERÊNCIA")
                            </label>
                          </>
                        )}
                      </div>

                      {/* ── Liberação para conferência: reflete o clique em "Demanda Analisada" ── */}
                      <input
                        type="hidden"
                        name="data_liberacao_conferencia"
                        ref={liberarConferenciaInputRef}
                        defaultValue={editingFormalizacao?.data_liberacao_conferencia || ''}
                      />
                      {editingFormalizacao && (isTecnicoAtribuido || isAdmin) && (() => {
                        const jaAtribuido = !!(editingFormalizacao.conferencista ?? '').trim();
                        const jaLiberado = isLiberadoParaConferencia(editingFormalizacao);
                        const dataLiberacaoStr = (editingFormalizacao.data_liberacao_conferencia ?? '').trim();
                        if (jaAtribuido) {
                          return (
                            <div className="md:col-span-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                              Já atribuída ao conferencista {editingFormalizacao.conferencista}
                            </div>
                          );
                        }
                        if (jaLiberado) {
                          // Quem pode desfazer: admin, ou o próprio técnico responsável (ex: analisou
                          // errado e precisa corrigir a Área – Estágio antes de liberar de novo).
                          const podeDesfazer = isAdmin || isTecnicoAtribuido;
                          return (
                            <div className="md:col-span-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold">
                              <FileSearch className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="flex-1">
                                {dataLiberacaoStr
                                  ? <>Liberada para conferência em {formatDateForDisplay(dataLiberacaoStr)} — aguardando atribuição de conferencista</>
                                  : <>Liberada para conferência (Área – Estágio já em "EM CONFERÊNCIA") — aguardando atribuição de conferencista</>}
                              </span>
                              {podeDesfazer && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Limpa a liberação para conferência
                                    if (liberarConferenciaInputRef.current) {
                                      liberarConferenciaInputRef.current.value = '';
                                    }
                                    // Limpa a data de análise para permitir refazer a análise do zero
                                    // (enquanto preenchida, o botão "Demanda Analisada" fica escondido)
                                    const dataAnaliseInput = editFormRef.current?.querySelector(
                                      'input[name="data_analise_demanda"]'
                                    ) as HTMLInputElement | null;
                                    if (dataAnaliseInput) dataAnaliseInput.value = '';
                                    // Volta a Área – Estágio para "DEMANDA COM O TÉCNICO" (preservando a
                                    // variante Fundo a Fundo) se ainda estiver em "EM CONFERÊNCIA" — senão
                                    // isLiberadoParaConferencia() continuaria considerando a demanda liberada
                                    // mesmo com a data de liberação limpa
                                    const estagioAtual = (editingFormalizacao.area_estagio_situacao_demanda ?? '').trim().toUpperCase();
                                    let novoEstagio = editingFormalizacao.area_estagio_situacao_demanda ?? '';
                                    if (estagioAtual.startsWith('EM CONFERÊNCIA')) {
                                      novoEstagio = estagioAtual.includes('FUNDO A FUNDO')
                                        ? 'DEMANDA COM O TÉCNICO - FUNDO A FUNDO'
                                        : 'DEMANDA COM O TÉCNICO';
                                      const areaSelect = document.getElementById('area_estagio_situacao_demanda_select') as HTMLSelectElement | null;
                                      if (areaSelect) areaSelect.value = novoEstagio;
                                    }
                                    setEditingFormalizacao(prev => prev ? {
                                      ...prev,
                                      data_liberacao_conferencia: '',
                                      data_analise_demanda: '',
                                      area_estagio_situacao_demanda: novoEstagio,
                                    } : prev);
                                    // Salva imediatamente sem fechar o modal — não depende do usuário lembrar de clicar em "Atualizar Registro" depois
                                    salvarFormularioRapido(true);
                                  }}
                                  className="flex-shrink-0 text-sky-600 hover:text-sky-800 hover:underline font-semibold"
                                  title="Desfazer a análise (ex: técnico analisou errado) — a demanda volta para o técnico corrigir a Área – Estágio"
                                >
                                  Desfazer Análise
                                </button>
                              )}
                            </div>
                          );
                        }
                        return (
                          <p className="md:col-span-2 text-[11px] text-gray-400">
                            Clique em "Demanda Analisada" para liberar esta demanda para o admin atribuir um conferencista.
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                  );
                })()}

                {/* ═══════════ 3. DILIGÊNCIA (Técnico) ═══════════ */}
                {(() => {
                  const s = sectionRole('tecnico');
                  return (
                  <div className={`rounded-2xl shadow-sm overflow-hidden ${s.border} ${s.bg}`}>
                    <div className={`px-5 py-3 flex items-center gap-2.5 ${s.bg} border-b border-gray-100`}>
                      <div className={`${s.headerBg} text-white rounded-lg w-6 h-6 flex items-center justify-center text-[10px] font-bold shadow-sm`}>3</div>
                      <h3 className={`text-xs font-bold ${s.headerText} uppercase tracking-wide flex items-center gap-2`}>
                        <Send className="w-3.5 h-3.5" />
                        Diligência
                      </h3>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.badge}`}>Técnico</span>
                    </div>
                    <div className="p-5 bg-white grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                      <Input label="Motivo do Retorno da Diligência" name="motivo_retorno_diligencia" defaultValue={editingFormalizacao?.motivo_retorno_diligencia} disabled={isDisabled('motivo_retorno_diligencia')} />
                      <Input label="Data do Retorno da Diligência" name="data_retorno_diligencia" type="date" defaultValue={toInputDate(editingFormalizacao?.data_retorno_diligencia)} disabled={isDisabled('data_retorno_diligencia')} />
                    </div>
                  </div>
                  );
                })()}

                {/* ═══════════ 4. CONFERÊNCIA (Conferencista) ═══════════ */}
                {(() => {
                  const s = sectionRole('conferencista');
                  return (
                  <div className={`rounded-2xl shadow-sm overflow-hidden ${s.border} ${s.bg}`}>
                    <div className={`px-5 py-3 flex items-center gap-2.5 ${s.bg} border-b border-gray-100`}>
                      <div className={`${s.headerBg} text-white rounded-lg w-6 h-6 flex items-center justify-center text-[10px] font-bold shadow-sm`}>4</div>
                      <h3 className={`text-xs font-bold ${s.headerText} uppercase tracking-wide flex items-center gap-2`}>
                        <FileText className="w-3.5 h-3.5" />
                        Conferência
                      </h3>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.badge}`}>Conferencista</span>
                    </div>
                    <div className="p-5 bg-white space-y-4">
                      {/* Conferencista */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500 ml-0.5">Conferencista</label>
                        <select
                          name="conferencista"
                          defaultValue={editingFormalizacao?.conferencista || ''}
                          disabled={isDisabled('conferencista')}
                          className={`w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all appearance-none ${disabledClass('conferencista')}`}
                        >
                          <option value="">-- Selecione o Conferencista --</option>
                          {tecnicosDisponiveis.map((t: any) => (
                            <option key={t.id} value={t.nome}>{t.nome} ({t.email})</option>
                          ))}
                        </select>
                      </div>
                      {/* Data Recebimento + Data Retorno */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                        <Input label="Data Recebimento Demanda" name="data_recebimento_demanda" type="date" defaultValue={toInputDate(editingFormalizacao?.data_recebimento_demanda)} disabled={isDisabled('data_recebimento_demanda')} />
                        <Input label="Data do Retorno" name="data_retorno" type="date" defaultValue={toInputDate(editingFormalizacao?.data_retorno)} disabled={isDisabled('data_retorno')} />
                      </div>
                      {/* Observação */}
                      <Input label="Observação - Motivo do Retorno" name="observacao_motivo_retorno" defaultValue={editingFormalizacao?.observacao_motivo_retorno} disabled={isDisabled('observacao_motivo_retorno')} />
                      {/* Data Liberação da Assinatura - Conferencista (com botão) */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500 ml-0.5">Data Liberação da Assinatura - Conferencista</label>
                        {isAdmin ? (
                          <Input label="" name="data_liberacao_assinatura_conferencista" type="date" defaultValue={editingFormalizacao?.data_liberacao_assinatura_conferencista} />
                        ) : isDisabled('data_liberacao_assinatura_conferencista') || isDateLocked('data_liberacao_assinatura_conferencista') ? (
                          <>
                            <input type="hidden" name="data_liberacao_assinatura_conferencista" defaultValue={editingFormalizacao?.data_liberacao_assinatura_conferencista || ''} />
                            <span className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 min-h-[38px] flex items-center opacity-50">
                              {editingFormalizacao?.data_liberacao_assinatura_conferencista ? formatDateForDisplay(editingFormalizacao.data_liberacao_assinatura_conferencista) : '—'}
                            </span>
                          </>
                        ) : (
                          <>
                            <input type="hidden" name="data_liberacao_assinatura_conferencista" id="data_liberacao_conferencista_hidden" defaultValue={editingFormalizacao?.data_liberacao_assinatura_conferencista || ''} />
                            <div className="flex items-center gap-2">
                              <span id="data_liberacao_conferencista_display" className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 min-h-[38px] flex items-center">
                                {editingFormalizacao?.data_liberacao_assinatura_conferencista ? formatDateForDisplay(editingFormalizacao.data_liberacao_assinatura_conferencista) : '—'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  preencherDataDeHoje('data_liberacao_conferencista_hidden', 'data_liberacao_conferencista_display');
                                  // Salva imediatamente sem fechar o modal — não depende do usuário lembrar de clicar em "Atualizar Registro" depois
                                  salvarFormularioRapido(true);
                                }}
                                className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
                              >
                                <CheckSquare className="w-3.5 h-3.5" />
                                Liberação Conferência
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })()}

                {/* ═══════════ 5. ASSINATURAS (Somente Admin) ═══════════ */}
                {(() => {
                  const s = sectionRole('admin');
                  return (
                  <div className={`rounded-2xl shadow-sm overflow-hidden ${s.border} ${s.bg}`}>
                    <div className={`px-5 py-3 flex items-center gap-2.5 ${s.bg} border-b border-gray-100`}>
                      <div className={`${s.headerBg} text-white rounded-lg w-6 h-6 flex items-center justify-center text-[10px] font-bold shadow-sm`}>5</div>
                      <h3 className={`text-xs font-bold ${s.headerText} uppercase tracking-wide flex items-center gap-2`}>
                        <PenLine className="w-3.5 h-3.5" />
                        Assinaturas
                      </h3>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.badge}`}>Somente Admin</span>
                    </div>
                    <div className="p-5 bg-white space-y-4">
                      {isAdmin && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                          <Input label="Data Liberação de Assinatura" name="data_liberacao_assinatura" type="date" defaultValue={toInputDate(editingFormalizacao?.data_liberacao_assinatura)} disabled={isDisabled('data_liberacao_assinatura')} />
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500 ml-0.5">Falta Assinatura</label>
                            <div className={`bg-white border border-gray-200 rounded-lg p-3 space-y-2 ${isDisabled('falta_assinatura') ? 'opacity-50 pointer-events-none bg-gray-50' : ''}`}>
                              {[
                                'GESTOR ADMINISTRATIVO DRS',
                                'GESTOR TÉCNICO DRS',
                                'DIRETOR DRS',
                                'COORDENADOR CRS',
                                'DIRETOR GGCON',
                                'ORDENADOR DE DESPESAS',
                                'SECRETÁRIO',
                                'GESTOR – CONVÊNIO / DEMANDANTE',
                                'ORÇAMENTO CGOF',
                                'CHEFIA DE GABINETE',
                                'AGUARDANDO RESOLUÇÃO',
                                'NOTA DE RESERVA - GCF',
                                'AGUARDANDO FINALIZAÇÃO',
                                'LOTE3',
                              ].map((opcao) => {
                                const checked = editingFormalizacao?.falta_assinatura
                                  ? editingFormalizacao.falta_assinatura.split(',').map((s: string) => s.trim()).includes(opcao)
                                  : false;
                                return (
                                  <label key={opcao} className="flex items-center gap-2.5 cursor-pointer group">
                                    <input
                                      type="checkbox"
                                      name="falta_assinatura"
                                      value={opcao}
                                      defaultChecked={checked}
                                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/30 accent-emerald-600"
                                    />
                                    <span className="text-xs text-gray-700 group-hover:text-gray-900">{opcao}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                      <input type="hidden" id="demanda_assinada_flag" name="demanda_assinada_flag" defaultValue={editingFormalizacao?.assinatura ? 'DEMANDA ASSINADA' : ''} />
                    </div>
                  </div>
                  );
                })()}

                {/* ═══════════ 6. PUBLICAÇÃO E FINALIZAÇÃO (Ambos) ═══════════ */}
                {(() => {
                  const s = sectionRole('shared');
                  return (
                  <div className={`rounded-2xl shadow-sm overflow-hidden ${s.border} ${s.bg}`}>
                    <div className={`px-5 py-3 flex items-center gap-2.5 ${s.bg} border-b border-gray-100`}>
                      <div className={`${s.headerBg} text-white rounded-lg w-6 h-6 flex items-center justify-center text-[10px] font-bold shadow-sm`}>6</div>
                      <h3 className={`text-xs font-bold ${s.headerText} uppercase tracking-wide flex items-center gap-2`}>
                        <BookOpen className="w-3.5 h-3.5" />
                        Publicação e Finalização
                      </h3>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.badge}`}>Técnico + Conferencista</span>
                    </div>
                    <div className="p-5 bg-white space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-gray-500 ml-0.5">Assinatura</label>
                          <input
                            type="date"
                            name="assinatura"
                            defaultValue={toInputDate(editingFormalizacao?.assinatura)}
                            disabled={isDisabled('assinatura')}
                            onChange={(e) => {
                              if (e.target.value && e.target.value.trim() !== '') {
                                const checkboxes = document.querySelectorAll<HTMLInputElement>('input[name="falta_assinatura"]');
                                checkboxes.forEach(cb => { cb.checked = false; });
                                const hiddenDemandaAssinada = document.getElementById('demanda_assinada_flag') as HTMLInputElement;
                                if (hiddenDemandaAssinada) hiddenDemandaAssinada.value = 'DEMANDA ASSINADA';
                              } else {
                                const hiddenDemandaAssinada = document.getElementById('demanda_assinada_flag') as HTMLInputElement;
                                if (hiddenDemandaAssinada) hiddenDemandaAssinada.value = '';
                              }
                            }}
                            className={`w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all ${isDisabled('assinatura', true) ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-gray-500 ml-0.5">Publicação</label>
                          <input
                            type="date"
                            name="publicacao"
                            defaultValue={toInputDate(editingFormalizacao?.publicacao)}
                            disabled={isDisabled('publicacao')}
                            onChange={(e) => {
                              if (e.target.value) {
                                const pub = new Date(e.target.value + 'T12:00:00');
                                const day = pub.getDay();
                                const daysToAdd = ((3 - day + 7) % 7) || 7;
                                const nextWed = new Date(pub);
                                nextWed.setDate(pub.getDate() + daysToAdd);
                                const enc = document.getElementById('encaminhado_em_input') as HTMLInputElement;
                                if (enc && !enc.disabled) {
                                  const y = nextWed.getFullYear();
                                  const m = String(nextWed.getMonth() + 1).padStart(2, '0');
                                  const d = String(nextWed.getDate()).padStart(2, '0');
                                  enc.value = `${y}-${m}-${d}`;
                                }
                              }
                            }}
                            className={`w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all ${isDisabled('publicacao', true) ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
                          />
                        </div>
                        <Input label="Vigência" name="vigencia" type="date" defaultValue={toInputDate(editingFormalizacao?.vigencia)} disabled={isDisabled('vigencia')} />
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-gray-500 ml-0.5">Encaminhado em</label>
                          <input
                            id="encaminhado_em_input"
                            type="date"
                            name="encaminhado_em"
                            defaultValue={toInputDate(editingFormalizacao?.encaminhado_em)}
                            disabled={isDisabled('encaminhado_em')}
                            className={`w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all ${isDisabled('encaminhado_em', true) ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-gray-500 ml-0.5">Concluída em</label>
                          <div className="flex gap-2 items-center">
                            <input
                              id="concluida_em_input"
                              type="date"
                              name="concluida_em"
                              defaultValue={toInputDate(editingFormalizacao?.concluida_em)}
                              disabled={isDisabled('concluida_em')}
                              className={`flex-1 px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all ${isDisabled('concluida_em') ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
                            />
                            {!isDisabled('concluida_em') && !(editingFormalizacao?.concluida_em) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const inp = document.getElementById('concluida_em_input') as HTMLInputElement;
                                  if (inp) inp.value = new Date().toISOString().split('T')[0];
                                }}
                                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1 flex-shrink-0"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Concluir
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })()}

                {/* Footer buttons — fixo na base do modal, sempre visível mesmo rolando o formulário */}
                <div className="sticky bottom-0 -mx-6 -mb-6 mt-2 px-6 py-4 bg-gray-50/95 backdrop-blur-sm border-t border-gray-200 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeEditForm}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  {!isVisualizador && (
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#1351B4] hover:bg-[#0C326F] shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {editingFormalizacao ? 'Atualizar Registro' : 'Salvar Demanda'}
                  </button>
                  )}
                </div>

                    </>
                  );
                })()}
              </form>
            </motion.div>
          </div>
        )}

        {/* Modal de Atribuição de Técnico */}
        <AnimatePresence>
          {showAtribuirTecnicoModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => { setShowAtribuirTecnicoModal(false); setAtribuicaoStep('select'); }}
                className="fixed inset-0 bg-black/40 z-40"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed inset-0 flex items-center justify-center z-50 p-4"
              >
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-100 p-2 rounded-lg">
                        <User className="text-amber-600 w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">Atribuir a Técnico</h3>
                    </div>
                    <button onClick={() => { setShowAtribuirTecnicoModal(false); setAtribuicaoStep('select'); }} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
                  </div>

                  {/* ── SELEÇÃO ── */}
                  {atribuicaoStep === 'select' && (
                    <div className="space-y-4">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-amber-900 font-semibold">{selectedRows.size} registro(s) selecionado(s)</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 ml-1 block mb-2">Selecione o Técnico</label>
                        <select
                          value={atribuicaoTecnico?.id || ''}
                          onChange={(e) => { const id = parseInt(e.target.value); setAtribuicaoTecnico(tecnicosDisponiveis.find(t => t.id === id) || null); }}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                        >
                          <option value="">-- Selecione --</option>
                          {tecnicosDisponiveis.map(t => <option key={t.id} value={t.id}>{t.nome} ({t.email})</option>)}
                        </select>
                      </div>
                      <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">A data de liberação será preenchida automaticamente com a data de hoje.</div>
                      <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => { setShowAtribuirTecnicoModal(false); setAtribuicaoStep('select'); }} className="flex-1 px-4 py-2.5 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors">Cancelar</button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (selectedRows.size === 0) { alert('❌ Nenhum registro selecionado'); return; }
                            const confirmMsg = `⚠️ REMOVER ATRIBUIÇÃO DE TÉCNICO\n\n` +
                              `Você está prestes a REMOVER o técnico de ${selectedRows.size} registro(s).\n\n` +
                              `As demandas ficarão SEM TÉCNICO.\n\n` +
                              `Tem certeza que deseja continuar?`;
                            if (!confirm(confirmMsg)) return;
                            const ids = Array.from(selectedRows).map(id => parseInt(String(id))).filter(id => !isNaN(id));
                            setAtribuindoTecnico(true);
                            try {
                              const r = await fetch('/api/formalizacao/remover-tecnico', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ ids }) });
                              if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Erro ao remover'); }
                              const res = await r.json();
                              setSelectedRows(new Set()); setAtribuicaoTecnico(null); setShowAtribuirTecnicoModal(false); setAtribuicaoStep('select');
                              fetchFormalizacoesComFiltros(0);
                              alert(`✅ Atribuição removida de ${res.updated} registro(s)!\n\nAs demandas agora estão SEM TÉCNICO.`);
                            } catch (err: any) { alert(`❌ Erro: ${err.message}`); } finally { setAtribuindoTecnico(false); }
                          }}
                          className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
                          disabled={atribuindoTecnico || selectedRows.size === 0}
                        >Remover Atribuição</button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!atribuicaoTecnico) { alert('Selecione um técnico'); return; }
                            const ids = Array.from(selectedRows).map(id => parseInt(String(id))).filter(id => !isNaN(id));
                            const cache = allDataCacheRef.current;
                            // Separate all IDs for API calls (keeps all rows, incl. aggregating amendments)
                            const allIdsComTecnico: number[] = [];
                            const allIdsSemTecnico: number[] = [];
                            // Deduplicated maps for display (one entry per unique demand number)
                            const demandasComTecnico = new Map<string, { id: number; demanda: string; tecnicoAtual: string }>();
                            const demandasSemTecnico = new Map<string, { id: number; demanda: string }>();
                            for (const id of ids) {
                              const reg = cache.find((r: any) => r.id === id);
                              const label = reg ? (reg.demandas_formalizacao || reg.demanda || `ID ${id}`) : `ID ${id}`;
                              if (reg?.tecnico?.trim()) {
                                allIdsComTecnico.push(id);
                                if (!demandasComTecnico.has(label)) demandasComTecnico.set(label, { id, demanda: label, tecnicoAtual: reg.tecnico });
                              } else {
                                allIdsSemTecnico.push(id);
                                if (!demandasSemTecnico.has(label)) demandasSemTecnico.set(label, { id, demanda: label });
                              }
                            }
                            setAtribuicaoConflicts({
                              jaAtribuidos: Array.from(demandasComTecnico.values()),
                              semTecnico: Array.from(demandasSemTecnico.values()),
                              allIdsSemTecnico,
                              allIdsComTecnico,
                            });
                            setAtribuicaoStep('confirm');
                          }}
                          className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-amber-500 hover:bg-amber-600 transition-colors disabled:opacity-50"
                          disabled={!atribuicaoTecnico}
                        >Atribuir</button>
                      </div>
                    </div>
                  )}

                  {/* ── CONFIRMAÇÃO ── */}
                  {atribuicaoStep === 'confirm' && (
                    <div className="space-y-4">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                        <User className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-amber-700">Atribuindo para:</p>
                          <p className="text-sm font-bold text-amber-900">{atribuicaoTecnico?.nome}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-green-700">{atribuicaoConflicts.semTecnico.length}</p>
                          <p className="text-xs text-green-800 font-medium mt-0.5">Sem técnico</p>
                          <p className="text-[10px] text-green-600">Serão atribuídos</p>
                        </div>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-orange-700">{atribuicaoConflicts.jaAtribuidos.length}</p>
                          <p className="text-xs text-orange-800 font-medium mt-0.5">Já têm técnico</p>
                          <p className="text-[10px] text-orange-600">Serão sobrescritos</p>
                        </div>
                      </div>
                      {atribuicaoConflicts.jaAtribuidos.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-orange-700 mb-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />Já têm técnico atribuído:</p>
                          <div className="max-h-36 overflow-y-auto border border-orange-200 rounded-lg divide-y divide-orange-100">
                            {atribuicaoConflicts.jaAtribuidos.map(r => (
                              <div key={r.id} className="px-3 py-1.5 flex justify-between items-center text-xs">
                                <span className="text-slate-700 truncate max-w-[55%]" title={r.demanda}>{r.demanda}</span>
                                <span className="text-orange-600 font-semibold truncate">{r.tecnicoAtual}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setAtribuicaoStep('select')} className="flex-1 px-4 py-2.5 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors" disabled={atribuindoTecnico}>← Voltar</button>
                        {atribuicaoConflicts.jaAtribuidos.length > 0 && atribuicaoConflicts.semTecnico.length > 0 && (
                          <button type="button" onClick={async () => {
                            const confirmMsg = `Confirma atribuição apenas dos ${atribuicaoConflicts.allIdsSemTecnico.length} registro(s) sem técnico?\n\n(Os ${atribuicaoConflicts.jaAtribuidos.length} que já têm técnico não serão alterados)`;
                            if (confirm(confirmMsg)) {
                              executarAtribuicaoTecnico(atribuicaoConflicts.allIdsSemTecnico);
                            }
                          }} className="flex-1 px-3 py-2.5 rounded-lg font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm" disabled={atribuindoTecnico}>
                            {atribuindoTecnico ? '⏳...' : `Só os livres (${atribuicaoConflicts.allIdsSemTecnico.length})`}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            let confirmMsg: string;
                            if (atribuicaoConflicts.jaAtribuidos.length > 0) {
                              confirmMsg = `⚠️ ATENÇÃO: Você está prestes a SOBRESCREVER o técnico de ${atribuicaoConflicts.jaAtribuidos.length} registro(s)!\n\n` +
                                `• ${atribuicaoConflicts.semTecnico.length} registro(s) sem técnico serão atribuídos\n` +
                                `• ${atribuicaoConflicts.jaAtribuidos.length} registro(s) terão seu técnico atual SUBSTITUÍDO\n\n` +
                                `Novo técnico: ${atribuicaoTecnico?.nome}\n\n` +
                                `Tem certeza que deseja continuar?`;
                            } else {
                              confirmMsg = `Confirma atribuição do técnico ${atribuicaoTecnico?.nome} para ${atribuicaoConflicts.allIdsSemTecnico.length} registro(s)?`;
                            }
                            if (confirm(confirmMsg)) {
                              executarAtribuicaoTecnico([...atribuicaoConflicts.allIdsSemTecnico, ...atribuicaoConflicts.allIdsComTecnico]);
                            }
                          }}
                          className={`flex-1 px-3 py-2.5 rounded-lg font-medium text-white transition-colors disabled:opacity-50 text-sm ${atribuicaoConflicts.jaAtribuidos.length > 0 ? 'bg-orange-500 hover:bg-orange-600' : 'bg-amber-500 hover:bg-amber-600'}`}
                          disabled={atribuindoTecnico}
                        >
                          {atribuindoTecnico ? '⏳ Atribuindo...' : atribuicaoConflicts.jaAtribuidos.length > 0 ? `Atribuir todos (sobrescrever)` : `Confirmar (${atribuicaoConflicts.allIdsSemTecnico.length})`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </AnimatePresence>

      {/* Modal de Atribuição de Conferencista */}
      <AnimatePresence>
        {showAtribuirConferencistaModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowAtribuirConferencistaModal(false); setAtribuicaoConfStep('select'); }}
              className="fixed inset-0 bg-black/40 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-lg"><User className="text-green-600 w-5 h-5" /></div>
                    <h3 className="text-xl font-bold text-slate-900">Atribuir a Conferencista</h3>
                  </div>
                  <button onClick={() => { setShowAtribuirConferencistaModal(false); setAtribuicaoConfStep('select'); }} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
                </div>

                {/* ── SELEÇÃO ── */}
                {atribuicaoConfStep === 'select' && (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-900 font-semibold">{selectedRows.size} registro(s) selecionado(s)</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 ml-1 block mb-2">Selecione o Conferencista</label>
                      <select
                        value={atribuicaoConferencista?.id || ''}
                        onChange={(e) => { const id = parseInt(e.target.value); setAtribuicaoConferencista(tecnicosDisponiveis.find(t => t.id === id) || null); }}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all"
                      >
                        <option value="">-- Selecione --</option>
                        {tecnicosDisponiveis.map(t => <option key={t.id} value={t.id}>{t.nome} ({t.email})</option>)}
                      </select>
                    </div>
                    <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">A data de recebimento será preenchida automaticamente com a data de hoje.</div>
                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => { setShowAtribuirConferencistaModal(false); setAtribuicaoConfStep('select'); }} className="flex-1 px-4 py-2.5 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors">Cancelar</button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (selectedRows.size === 0) { alert('❌ Nenhum registro selecionado'); return; }
                          const confirmMsg = `⚠️ REMOVER ATRIBUIÇÃO DE CONFERENCISTA\n\n` +
                            `Você está prestes a REMOVER o conferencista de ${selectedRows.size} registro(s).\n\n` +
                            `As demandas ficarão SEM CONFERENCISTA.\n\n` +
                            `Tem certeza que deseja continuar?`;
                          if (!confirm(confirmMsg)) return;
                          const ids = Array.from(selectedRows).map(id => parseInt(String(id))).filter(id => !isNaN(id));
                          setAtribuindoConferencista(true);
                          try {
                            const r = await fetch('/api/formalizacao/remover-conferencista', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ ids }) });
                            if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Erro ao remover'); }
                            const res = await r.json();
                            setSelectedRows(new Set()); setAtribuicaoConferencista(null); setShowAtribuirConferencistaModal(false); setAtribuicaoConfStep('select');
                            fetchFormalizacoesComFiltros(0);
                            alert(`✅ Atribuição removida de ${res.updated} registro(s)!\n\nAs demandas agora estão SEM CONFERENCISTA.`);
                          } catch (err: any) { alert(`❌ Erro: ${err.message}`); } finally { setAtribuindoConferencista(false); }
                        }}
                        className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
                        disabled={atribuindoConferencista || selectedRows.size === 0}
                      >Remover Atribuição</button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!atribuicaoConferencista) { alert('Selecione um conferencista'); return; }
                          const ids = Array.from(selectedRows).map(id => parseInt(String(id))).filter(id => !isNaN(id));
                          const cache = allDataCacheRef.current;
                          // Separate all IDs for API calls (keeps all rows, incl. aggregating amendments)
                          const allIdsComConf: number[] = [];
                          const allIdsSemConf: number[] = [];
                          // Deduplicated maps for display (one entry per unique demand number)
                          const demandasComConf = new Map<string, { id: number; demanda: string; confAtual: string }>();
                          const demandasSemConf = new Map<string, { id: number; demanda: string }>();
                          for (const id of ids) {
                            const reg = cache.find((r: any) => r.id === id);
                            const label = reg ? (reg.demandas_formalizacao || reg.demanda || `ID ${id}`) : `ID ${id}`;
                            if (reg?.conferencista?.trim()) {
                              allIdsComConf.push(id);
                              if (!demandasComConf.has(label)) demandasComConf.set(label, { id, demanda: label, confAtual: reg.conferencista });
                            } else {
                              allIdsSemConf.push(id);
                              if (!demandasSemConf.has(label)) demandasSemConf.set(label, { id, demanda: label });
                            }
                          }
                          setAtribuicaoConfConflicts({
                            jaAtribuidos: Array.from(demandasComConf.values()),
                            semConf: Array.from(demandasSemConf.values()),
                            allIdsSemConf,
                            allIdsComConf,
                          });
                          setAtribuicaoConfStep('confirm');
                        }}
                        className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-green-500 hover:bg-green-600 transition-colors disabled:opacity-50"
                        disabled={!atribuicaoConferencista}
                      >Atribuir</button>
                    </div>
                  </div>
                )}

                {/* ── CONFIRMAÇÃO ── */}
                {atribuicaoConfStep === 'confirm' && (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                      <User className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-green-700">Atribuindo para:</p>
                        <p className="text-sm font-bold text-green-900">{atribuicaoConferencista?.nome}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-green-700">{atribuicaoConfConflicts.semConf.length}</p>
                        <p className="text-xs text-green-800 font-medium mt-0.5">Sem conferencista</p>
                        <p className="text-[10px] text-green-600">Serão atribuídos</p>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-orange-700">{atribuicaoConfConflicts.jaAtribuidos.length}</p>
                        <p className="text-xs text-orange-800 font-medium mt-0.5">Já têm conferencista</p>
                        <p className="text-[10px] text-orange-600">Serão sobrescritos</p>
                      </div>
                    </div>
                    {atribuicaoConfConflicts.jaAtribuidos.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-orange-700 mb-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />Já têm conferencista atribuído:</p>
                        <div className="max-h-36 overflow-y-auto border border-orange-200 rounded-lg divide-y divide-orange-100">
                          {atribuicaoConfConflicts.jaAtribuidos.map(r => (
                            <div key={r.id} className="px-3 py-1.5 flex justify-between items-center text-xs">
                              <span className="text-slate-700 truncate max-w-[55%]" title={r.demanda}>{r.demanda}</span>
                              <span className="text-orange-600 font-semibold truncate">{r.confAtual}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => setAtribuicaoConfStep('select')} className="flex-1 px-4 py-2.5 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors" disabled={atribuindoConferencista}>← Voltar</button>
                      {atribuicaoConfConflicts.jaAtribuidos.length > 0 && atribuicaoConfConflicts.semConf.length > 0 && (
                        <button type="button" onClick={async () => {
                          const confirmMsg = `Confirma atribuição apenas dos ${atribuicaoConfConflicts.allIdsSemConf.length} registro(s) sem conferencista?\n\n(Os ${atribuicaoConfConflicts.jaAtribuidos.length} que já têm conferencista não serão alterados)`;
                          if (confirm(confirmMsg)) {
                            executarAtribuicaoConferencista(atribuicaoConfConflicts.allIdsSemConf);
                          }
                        }} className="flex-1 px-3 py-2.5 rounded-lg font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm" disabled={atribuindoConferencista}>
                          {atribuindoConferencista ? '⏳...' : `Só os livres (${atribuicaoConfConflicts.allIdsSemConf.length})`}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          let confirmMsg: string;
                          if (atribuicaoConfConflicts.jaAtribuidos.length > 0) {
                            confirmMsg = `⚠️ ATENÇÃO: Você está prestes a SOBRESCREVER o conferencista de ${atribuicaoConfConflicts.jaAtribuidos.length} registro(s)!\n\n` +
                              `• ${atribuicaoConfConflicts.semConf.length} registro(s) sem conferencista serão atribuídos\n` +
                              `• ${atribuicaoConfConflicts.jaAtribuidos.length} registro(s) terão seu conferencista atual SUBSTITUÍDO\n\n` +
                              `Novo conferencista: ${atribuicaoConferencista?.nome}\n\n` +
                              `Tem certeza que deseja continuar?`;
                          } else {
                            confirmMsg = `Confirma atribuição do conferencista ${atribuicaoConferencista?.nome} para ${atribuicaoConfConflicts.allIdsSemConf.length} registro(s)?`;
                          }
                          if (confirm(confirmMsg)) {
                            executarAtribuicaoConferencista([...atribuicaoConfConflicts.allIdsSemConf, ...atribuicaoConfConflicts.allIdsComConf]);
                          }
                        }}
                        className={`flex-1 px-3 py-2.5 rounded-lg font-medium text-white transition-colors disabled:opacity-50 text-sm ${atribuicaoConfConflicts.jaAtribuidos.length > 0 ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'}`}
                        disabled={atribuindoConferencista}
                      >
                        {atribuindoConferencista ? '⏳ Atribuindo...' : atribuicaoConfConflicts.jaAtribuidos.length > 0 ? 'Atribuir todos (sobrescrever)' : `Confirmar (${atribuicaoConfConflicts.allIdsSemConf.length})`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal de Liberar para Assinatura em Lote */}
      <AnimatePresence>
        {showLiberarAssinaturaModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLiberarAssinaturaModal(false)}
              className="fixed inset-0 bg-black/40 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <PenLine className="text-orange-600 w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Liberar para Assinatura</h3>
                  </div>
                  <button
                    onClick={() => setShowLiberarAssinaturaModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-orange-900 font-medium">
                    {selectedRows.size} registro(s) selecionado(s)
                  </p>
                  <p className="text-xs text-orange-700 mt-1">
                    A coluna “Data Lib. Assinatura” será preenchida com a data de hoje.
                  </p>
                </div>

                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg mb-6">
                  <span className="font-semibold">Data:</span> {new Date().toLocaleDateString('pt-BR')}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowLiberarAssinaturaModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                    disabled={liberandoAssinatura}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={liberandoAssinatura}
                    onClick={async () => {
                      const idsToUpdate = Array.from(selectedRows).map(id => {
                        const numId = parseInt(id, 10);
                        if (isNaN(numId) || numId <= 0) return null;
                        return numId;
                      }).filter(id => id !== null) as number[];

                      if (idsToUpdate.length === 0) {
                        alert('❌ Nenhum ID válido selecionado');
                        return;
                      }

                      const now = new Date();
                      const dataLiberacao = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;

                      setLiberandoAssinatura(true);
                      try {
                        const response = await fetch('/api/formalizacao/liberar-assinatura', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({ ids: idsToUpdate, data_liberacao_assinatura: dataLiberacao })
                        });

                        if (!response.ok) {
                          const error = await response.json();
                          throw new Error(error.error || `Erro HTTP ${response.status}`);
                        }

                        const result = await response.json();

                        if (result.updatedRecords && result.updatedRecords.length > 0) {
                          const updateMap = new Map(result.updatedRecords.map((r: any) => [r.id, r]));
                          const updater = (list: any[]) => list.map((f: any) => {
                            const u = updateMap.get(f.id);
                            return u ? { ...f, ...u } : f;
                          });
                          if (allDataCacheRef.current.length > 0) {
                            allDataCacheRef.current = updater(allDataCacheRef.current);
                            syncLocalStorageCache(); // persistir alteração imediatamente
                          }
                          if (filteredForExportRef.current.length > 0) {
                            filteredForExportRef.current = updater(filteredForExportRef.current);
                          }
                          setFormalizacoes(prev => updater(prev));
                          setFormalizacaoSearchResult((prev: any) => ({
                            ...prev,
                            data: updater(prev.data)
                          }));
                        }

                        setSelectedRows(new Set());
                        setShowLiberarAssinaturaModal(false);
                        alert(`✅ Sucesso! ${result.updated} registro(s) liberados para assinatura!`);
                      } catch (error: any) {
                        alert(`❌ Erro ao liberar para assinatura:\n\n${error.message}`);
                      } finally {
                        setLiberandoAssinatura(false);
                      }
                    }}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {liberandoAssinatura ? (
                      <>
                        <div className="animate-spin">⏳</div>
                        Processando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Confirmar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal de Atribuir Lote e Prioridade */}
      <AnimatePresence>
        {showAtribuirLoteModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAtribuirLoteModal(false)}
              className="fixed inset-0 bg-black/40 z-40" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <span className="text-lg">🏷</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Lote / Prioridade</h3>
                  </div>
                  <button onClick={() => setShowAtribuirLoteModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-5">
                  <p className="text-sm text-purple-900 font-medium">{selectedRows.size} registro(s) selecionado(s)</p>
                  <p className="text-xs text-purple-700 mt-1">Deixe um campo em branco para não alterar. Escolha "— Remover" para limpar o valor.</p>
                </div>

                <div className="space-y-4">
                  {/* Lote */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Lote</label>
                    <select value={loteParaAtribuir}
                      onChange={e => setLoteParaAtribuir(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all text-sm"
                      disabled={atribuindoLote}>
                      <option value="">(não alterar)</option>
                      <option value="Lote 1">🔵 Lote 1</option>
                      <option value="Lote 2">🟢 Lote 2</option>
                      <option value="Lote 3">🟠 Lote 3</option>
                      <option value="__remover_lote__">— Remover lote</option>
                    </select>
                  </div>

                  {/* Prioridade */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Prioridade</label>
                    <select value={prioridadeParaAtribuir}
                      onChange={e => setPrioridadeParaAtribuir(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all text-sm"
                      disabled={atribuindoLote}>
                      <option value="">(não alterar)</option>
                      <option value="P0">⚡ P0 — Urgente (máxima prioridade)</option>
                      <option value="P1">🟡 P1 — Normal</option>
                      <option value="P2">⚪ P2 — Baixa</option>
                      <option value="__remover_prioridade__">— Remover prioridade</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setShowAtribuirLoteModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                    disabled={atribuindoLote}>Cancelar</button>
                  <button
                    type="button"
                    disabled={atribuindoLote || (loteParaAtribuir === '' && prioridadeParaAtribuir === '')}
                    onClick={async () => {
                      const idsToUpdate = Array.from(selectedRows).map(id => parseInt(String(id), 10)).filter(id => !isNaN(id) && id > 0);
                      if (idsToUpdate.length === 0) { alert('❌ Nenhum ID válido'); return; }
                      setAtribuindoLote(true);
                      try {
                        const payload: any = { ids: idsToUpdate };
                        if (loteParaAtribuir !== '') payload.lote = loteParaAtribuir === '__remover_lote__' ? '' : loteParaAtribuir;
                        if (prioridadeParaAtribuir !== '') payload.prioridade = prioridadeParaAtribuir === '__remover_prioridade__' ? '' : prioridadeParaAtribuir;
                        const resp = await fetch('/api/formalizacao/atribuir-lote', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                          body: JSON.stringify(payload)
                        });
                        if (!resp.ok) { const e = await resp.json(); throw new Error(e.error || `Erro HTTP ${resp.status}`); }
                        const result = await resp.json();
                        if (result.updatedRecords && result.updatedRecords.length > 0) {
                          const updateMap = new Map(result.updatedRecords.map((r: any) => [r.id, r]));
                          const updater = (list: any[]) => list.map((f: any) => { const u = updateMap.get(f.id); return u ? { ...f, ...u } : f; });
                          if (allDataCacheRef.current.length > 0) { allDataCacheRef.current = updater(allDataCacheRef.current); syncLocalStorageCache(); }
                          if (filteredForExportRef.current.length > 0) { filteredForExportRef.current = updater(filteredForExportRef.current); }
                          setFormalizacoes(prev => updater(prev));
                          setFormalizacaoSearchResult((prev: any) => ({ ...prev, data: updater(prev.data) }));
                        }
                        setSelectedRows(new Set());
                        setShowAtribuirLoteModal(false);
                        alert(`✅ Lote/Prioridade definidos em ${result.updated} registro(s)!`);
                      } catch (error: any) {
                        alert(`❌ Erro: ${error.message}`);
                      } finally {
                        setAtribuindoLote(false);
                      }
                    }}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {atribuindoLote ? (<><div className="animate-spin">⏳</div>Processando...</>) : (<><CheckCircle2 className="w-4 h-4" />Confirmar</>)}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal Demonstrativo Lote / Prioridade */}
      <AnimatePresence>
        {showDemonstrativoLote && (() => {
          const cache = allDataCacheRef.current || [];
          const total = cache.length;
          const LOTES = ['Lote 1', 'Lote 2', 'Lote 3'];
          const PRIOS = ['P0', 'P1', 'P2'];
          const PRIO_LABELS: Record<string, string> = { P0: '⚡ P0 Urgente', P1: '🟡 P1 Normal', P2: '⚪ P2 Baixa' };
          const countBy = (field: string, val: string) => cache.filter((r: any) => r[field] === val).length;
          const matrix = (lote: string, prio: string) => cache.filter((r: any) => r.lote === lote && r.prioridade === prio).length;
          const semLote = cache.filter((r: any) => !r.lote).length;
          const semPrio = cache.filter((r: any) => !r.prioridade).length;
          const comLote = cache.filter((r: any) => !!r.lote).length;
          const comPrio = cache.filter((r: any) => !!r.prioridade).length;
          return (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                onClick={() => setShowDemonstrativoLote(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl pointer-events-auto overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                    <div>
                      <h2 className="text-lg font-bold">📊 Demonstrativo — Lote e Prioridade</h2>
                      <p className="text-xs text-purple-200 mt-0.5">{total.toLocaleString('pt-BR')} registros no total · {comLote.toLocaleString('pt-BR')} com lote · {comPrio.toLocaleString('pt-BR')} com prioridade</p>
                    </div>
                    <button onClick={() => setShowDemonstrativoLote(false)} className="text-white/70 hover:text-white text-xl font-bold leading-none">×</button>
                  </div>
                  <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">

                    {/* Totais lado a lado */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Por Lote */}
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h3 className="text-xs font-bold uppercase text-gray-500 mb-3">Por Lote</h3>
                        <div className="space-y-2">
                          {LOTES.map(lote => {
                            const cnt = countBy('lote', lote);
                            const pct = total > 0 ? Math.round(cnt / total * 100) : 0;
                            const barColors: Record<string, string> = { 'Lote 1': 'bg-blue-400', 'Lote 2': 'bg-green-400', 'Lote 3': 'bg-orange-400' };
                            const badgeColors: Record<string, string> = { 'Lote 1': 'bg-blue-100 text-blue-800 border-blue-300', 'Lote 2': 'bg-green-100 text-green-800 border-green-300', 'Lote 3': 'bg-orange-100 text-orange-800 border-orange-300' };
                            return (
                              <div key={lote}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`inline-flex px-2 py-0.5 rounded border text-[11px] font-bold ${badgeColors[lote]}`}>{lote}</span>
                                  <span className="text-sm font-bold text-gray-800">{cnt.toLocaleString('pt-BR')} <span className="text-xs font-normal text-gray-400">({pct}%)</span></span>
                                </div>
                                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all ${barColors[lote]}`} style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                          <div className="pt-1 border-t border-gray-200 flex justify-between text-xs text-gray-400">
                            <span>Sem lote</span>
                            <span>{semLote.toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Por Prioridade */}
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h3 className="text-xs font-bold uppercase text-gray-500 mb-3">Por Prioridade</h3>
                        <div className="space-y-2">
                          {PRIOS.map(prio => {
                            const cnt = countBy('prioridade', prio);
                            const pct = total > 0 ? Math.round(cnt / total * 100) : 0;
                            const barColors: Record<string, string> = { P0: 'bg-red-400', P1: 'bg-yellow-400', P2: 'bg-gray-300' };
                            const badgeColors: Record<string, string> = { P0: 'bg-red-100 text-red-800 border-red-400', P1: 'bg-yellow-100 text-yellow-800 border-yellow-300', P2: 'bg-gray-100 text-gray-600 border-gray-300' };
                            return (
                              <div key={prio}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`inline-flex px-2 py-0.5 rounded border text-[11px] font-bold ${badgeColors[prio]}`}>{PRIO_LABELS[prio]}</span>
                                  <span className="text-sm font-bold text-gray-800">{cnt.toLocaleString('pt-BR')} <span className="text-xs font-normal text-gray-400">({pct}%)</span></span>
                                </div>
                                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all ${barColors[prio]}`} style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                          <div className="pt-1 border-t border-gray-200 flex justify-between text-xs text-gray-400">
                            <span>Sem prioridade</span>
                            <span>{semPrio.toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Matriz Lote × Prioridade */}
                    <div>
                      <h3 className="text-xs font-bold uppercase text-gray-500 mb-3">Matriz Lote × Prioridade</h3>
                      <div className="overflow-hidden rounded-xl border border-gray-200">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase w-28">Lote</th>
                              {PRIOS.map(p => (
                                <th key={p} className="px-4 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">{PRIO_LABELS[p]}</th>
                              ))}
                              <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-400 uppercase">S/ Prior.</th>
                              <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-600 uppercase">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {LOTES.map((lote, li) => {
                              const rowTotal = countBy('lote', lote);
                              const semPrioNaLote = cache.filter((r: any) => r.lote === lote && !r.prioridade).length;
                              const badgeColors: Record<string, string> = { 'Lote 1': 'bg-blue-100 text-blue-800 border-blue-300', 'Lote 2': 'bg-green-100 text-green-800 border-green-300', 'Lote 3': 'bg-orange-100 text-orange-800 border-orange-300' };
                              return (
                                <tr key={lote} className={li % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex px-2 py-0.5 rounded border text-[11px] font-bold ${badgeColors[lote]}`}>{lote}</span>
                                  </td>
                                  {PRIOS.map(p => (
                                    <td key={p} className="px-4 py-3 text-center font-semibold text-gray-700">{matrix(lote, p).toLocaleString('pt-BR')}</td>
                                  ))}
                                  <td className="px-4 py-3 text-center text-gray-400">{semPrioNaLote.toLocaleString('pt-BR')}</td>
                                  <td className="px-4 py-3 text-center font-bold text-gray-800">{rowTotal.toLocaleString('pt-BR')}</td>
                                </tr>
                              );
                            })}
                            {/* Linha sem lote */}
                            <tr className="bg-gray-50 border-t-2 border-gray-200">
                              <td className="px-4 py-3 text-xs text-gray-400 italic">Sem lote</td>
                              {PRIOS.map(p => (
                                <td key={p} className="px-4 py-3 text-center text-gray-400">
                                  {cache.filter((r: any) => !r.lote && r.prioridade === p).length.toLocaleString('pt-BR')}
                                </td>
                              ))}
                              <td className="px-4 py-3 text-center text-gray-400">
                                {cache.filter((r: any) => !r.lote && !r.prioridade).length.toLocaleString('pt-BR')}
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-gray-500">{semLote.toLocaleString('pt-BR')}</td>
                            </tr>
                            {/* Totais coluna */}
                            <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                              <td className="px-4 py-3 text-xs text-gray-600 uppercase">Total</td>
                              {PRIOS.map(p => (
                                <td key={p} className="px-4 py-3 text-center text-gray-800">{countBy('prioridade', p).toLocaleString('pt-BR')}</td>
                              ))}
                              <td className="px-4 py-3 text-center text-gray-400">{semPrio.toLocaleString('pt-BR')}</td>
                              <td className="px-4 py-3 text-center text-gray-900">{total.toLocaleString('pt-BR')}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                  <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
                    <button onClick={() => setShowDemonstrativoLote(false)}
                      className="px-4 py-2 text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
                      Fechar
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* Modal de Deletar Formalizacao */}
      <AnimatePresence>
        {showDeleteFormalizacaoModal && (formalizacaoParaDeletar || selectedRows.size > 0) && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteFormalizacaoModal(false)}
              className="fixed inset-0 bg-black/40 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-600 p-2 rounded-lg">
                      <AlertCircle className="text-white w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {selectedRows.size > 0 && !formalizacaoParaDeletar ? 'Deletar Formalizações' : 'Deletar Formalização'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowDeleteFormalizacaoModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  {selectedRows.size > 0 && !formalizacaoParaDeletar ? (
                    <>
                      <p className="text-sm text-red-700 font-bold">
                        Você está prestes a deletar {selectedRows.size} registro{selectedRows.size === 1 ? '' : 's'}
                      </p>
                      <p className="text-xs text-red-600 mt-2">
                        Esta ação irá deletar permanentemente todos os registros selecionados. Digite sua senha para confirmar.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-red-700">
                        <strong>Demanda:</strong> {formalizacaoParaDeletar?.demandas_formalizacao || 'N/A'}
                      </p>
                      <p className="text-sm text-red-700 mt-1">
                        <strong>Convênio:</strong> {formalizacaoParaDeletar?.numero_convenio || 'N/A'}
                      </p>
                      <p className="text-xs text-red-600 mt-2">
                        Esta ação irá deletar este registro permanentemente. Digite sua senha para confirmar.
                      </p>
                    </>
                  )}
                </div>

                <form onSubmit={confirmarDeletarFormalizacao} className="space-y-4">
                  <div>
                    <label className="text-sm font-bold text-slate-700 ml-1">Sua Senha</label>
                    <input
                      type="password"
                      value={senhaParaDeletarFormalizacao}
                      onChange={(e) => setSenhaParaDeletarFormalizacao(e.target.value)}
                      className="w-full mt-2 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                      placeholder="Digite sua senha para confirmar"
                      required
                      autoFocus
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Digite sua senha de admin para confirmar a exclusão
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowDeleteFormalizacaoModal(false)}
                      className="flex-1 bg-slate-200 text-slate-700 font-bold py-2.5 rounded-lg hover:bg-slate-300 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-red-600 text-white font-bold py-2.5 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Deletar
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* User Management Side Panel */}
      <UserManagementPanel 
        isOpen={isUserManagementOpen} 
        onClose={() => setIsUserManagementOpen(false)} 
      />

      {/* Modal de Logs de Atribuição */}
      <AnimatePresence>
        {showLogsModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowLogsModal(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              className="fixed inset-4 md:inset-8 bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-slate-50">
                <div className="flex items-center gap-3">
                  <ClipboardList className="w-5 h-5 text-[#1351B4]" />
                  <h2 className="text-lg font-bold text-slate-900">Logs do Sistema</h2>
                  {logsTotal > 0 && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">{logsTotal} registros</span>}
                </div>
                <button onClick={() => setShowLogsModal(false)} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Toolbar */}
              <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap gap-3 items-center bg-white">
                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1 flex-wrap">
                  {([['auditoria', '📋 Por Admin/Data'], ['todos', 'Todas as demandas'], ['atribuicoes', 'Reatribuições'], ['busca', 'Buscar técnico']] as const).map(([v, label]) => (
                    <button
                      key={v}
                      onClick={() => {
                        setLogsTipo(v);
                        setLogsData([]);
                        setLogsExpandedId(null);
                        if (v !== 'busca' && v !== 'auditoria') {
                          setLogsLoading(true);
                          fetch(`/api/admin/logs?tipo=${v}&limit=500`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                          }).then(r => r.json()).then(d => {
                            setLogsData(d.registros || []);
                            setLogsTotal(d.total || 0);
                          }).finally(() => setLogsLoading(false));
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        logsTipo === v ? 'bg-white text-[#1351B4] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >{label}</button>
                  ))}
                </div>

                {/* Filtros de auditoria (modo Por Admin/Data) */}
                {logsTipo === 'auditoria' && (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 font-medium whitespace-nowrap">De:</label>
                      <input type="date" value={logsDataInicio} onChange={e => setLogsDataInicio(e.target.value)}
                        className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#1351B4]" />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Até:</label>
                      <input type="date" value={logsDataFim} onChange={e => setLogsDataFim(e.target.value)}
                        className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#1351B4]" />
                    </div>
                    <input
                      type="text"
                      value={logsAdminFiltro}
                      onChange={e => setLogsAdminFiltro(e.target.value)}
                      placeholder="Filtrar por admin..."
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#1351B4] w-44"
                    />
                  </>
                )}

                {/* Campo de busca (modo busca técnico) */}
                {logsTipo === 'busca' && (
                  <input
                    type="text"
                    value={logsBusca}
                    onChange={e => setLogsBusca(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && logsBusca.trim()) {
                        setLogsData([]);
                        setLogsLoading(true);
                        fetch(`/api/admin/logs?busca=${encodeURIComponent(logsBusca.trim())}&limit=500`, {
                          headers: { 'Authorization': `Bearer ${token}` }
                        }).then(r => r.json()).then(d => {
                          setLogsData(d.registros || []);
                          setLogsTotal(d.total || 0);
                        }).finally(() => setLogsLoading(false));
                      }
                    }}
                    placeholder="Nome do técnico (Enter para buscar)"
                    className="flex-1 min-w-48 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#1351B4]"
                  />
                )}

                <button
                  disabled={logsLoading || (logsTipo === 'busca' && !logsBusca.trim())}
                  onClick={() => {
                    setLogsLoading(true);
                    setLogsData([]);
                    let params: string;
                    if (logsTipo === 'auditoria') {
                      params = `tipo=auditoria&limit=1000`;
                      if (logsDataInicio) params += `&data_inicio=${logsDataInicio}`;
                      if (logsDataFim) params += `&data_fim=${logsDataFim}`;
                      if (logsAdminFiltro.trim()) params += `&admin=${encodeURIComponent(logsAdminFiltro.trim())}`;
                    } else if (logsTipo === 'busca') {
                      params = `busca=${encodeURIComponent(logsBusca.trim())}&limit=500`;
                    } else {
                      params = `tipo=${logsTipo}&limit=500`;
                    }
                    fetch(`/api/admin/logs?${params}`, {
                      headers: { 'Authorization': `Bearer ${token}` }
                    }).then(r => r.json()).then(d => {
                      setLogsData(d.registros || []);
                      setLogsTotal(d.total || 0);
                    }).finally(() => setLogsLoading(false));
                  }}
                  className="px-4 py-1.5 bg-[#1351B4] text-white text-sm font-semibold rounded-lg hover:bg-[#0d3f8f] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {logsLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {logsLoading ? 'Carregando...' : 'Buscar'}
                </button>
              </div>

              {/* Conteúdo */}
              <div className="flex-1 overflow-auto">
                {logsLoading && (
                  <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-400">
                    <RefreshCw className="w-8 h-8 animate-spin" />
                    <span className="text-sm">Consultando banco de dados...</span>
                  </div>
                )}

                {!logsLoading && logsData.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
                    <ClipboardList className="w-8 h-8" />
                    <span className="text-sm">
                      {logsTipo === 'auditoria' ? 'Nenhuma atribuição encontrada no período selecionado. Clique em Buscar.' :
                       logsTipo === 'busca' && !logsBusca ? 'Digite um nome e pressione Buscar' :
                       logsTipo === 'busca' ? 'Nenhum resultado para essa busca' :
                       'Nenhum registro encontrado'}
                    </span>
                  </div>
                )}

                {/* Vista de auditoria: agrupada por admin + data */}
                {!logsLoading && logsData.length > 0 && logsTipo === 'auditoria' && (() => {
                  const isLegacy = !!(logsData[0] as any)?._legacy;

                  if (isLegacy) {
                    // Dados históricos (antes do log): agrupados por data_liberacao
                    const byDate: Map<string, any[]> = new Map();
                    for (const r of logsData) {
                      const dt = r.data_liberacao || '(sem data)';
                      if (!byDate.has(dt)) byDate.set(dt, []);
                      byDate.get(dt)!.push(r);
                    }
                    return (
                      <div className="p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-800">
                          ⚠️ <strong>Dados históricos</strong> — exibindo distribuição atual das demandas. O log de auditoria (quem atribuiu) começará a funcionar a partir de agora. Execute o SQL de criação da tabela no Supabase para ativar.
                        </div>
                        {Array.from(byDate.entries())
                          .sort((a, b) => b[0].localeCompare(a[0]))
                          .map(([dt, items], gi) => {
                          const isExpanded = logsExpandedId === gi;
                          const totalDemandas = items.reduce((s, r) => s + (r._count || 0), 0);
                          return (
                            <div key={gi} className="border border-blue-200 rounded-xl overflow-hidden shadow-sm">
                              <button
                                className="w-full flex items-center gap-3 px-5 py-3 text-left bg-blue-50 hover:bg-blue-100 transition-colors"
                                onClick={() => setLogsExpandedId(isExpanded ? null : gi)}
                              >
                                <div className="flex-1 flex flex-wrap items-center gap-3">
                                  <span className="text-sm font-bold text-slate-800">📅 Data lib.: {dt}</span>
                                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                    ✅ {totalDemandas} demanda{totalDemandas !== 1 ? 's' : ''} atribuídas
                                  </span>
                                  {!isExpanded && (
                                    <div className="flex flex-wrap gap-1.5 ml-2">
                                      {items.map((r: any) => (
                                        <span key={r.id} className="text-xs bg-white border border-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                                          {(r.tecnico_novo || '').split(' ')[0]} ({r._count})
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                              {isExpanded && (
                                <div className="bg-white border-t border-gray-100 p-4 flex flex-col gap-3">
                                  {items.map((r: any) => (
                                    <div key={r.id} className="bg-slate-50 rounded-lg p-3">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-sm font-bold text-slate-800">→ {r.tecnico_novo}</span>
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">{r._count} demanda{r._count !== 1 ? 's' : ''}</span>
                                      </div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {(r.demandas || []).map((d: string, ii: number) => (
                                          <span key={ii} className="text-xs font-mono bg-white border border-gray-200 text-slate-600 px-2 py-0.5 rounded">{d}</span>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  // Dados reais do log_atribuicoes: agrupar por data + admin + acao
                  const groups: Map<string, { date: string; admin: string; role: string; acao: string; items: any[] }> = new Map();
                  for (const r of logsData) {
                    const dt = new Date(r.criado_em).toLocaleDateString('pt-BR');
                    const key = `${dt}||${r.admin_nome}||${r.acao}`;
                    if (!groups.has(key)) groups.set(key, { date: dt, admin: r.admin_nome, role: r.admin_role || '', acao: r.acao, items: [] });
                    groups.get(key)!.items.push(r);
                  }
                  return (
                    <div className="p-4 flex flex-col gap-4">
                      {Array.from(groups.values()).map((g, gi) => {
                        // Agrupar por tecnico_novo (atribuir/remover) ou campo_alterado (outros)
                        const isTecnicoAcao = ['atribuir', 'remover'].includes(g.acao);
                        const byTecnico: Map<string, any[]> = new Map();
                        for (const item of g.items) {
                          const tk = isTecnicoAcao
                            ? (item.tecnico_novo || '(removido)')
                            : (item.campo_alterado ? item.campo_alterado.replace(/_/g, ' ') : g.acao);
                          if (!byTecnico.has(tk)) byTecnico.set(tk, []);
                          byTecnico.get(tk)!.push(item);
                        }
                        const isExpanded = logsExpandedId === gi;
                        const isRemove = g.acao.startsWith('remover');
                        const isAlterar = g.acao.startsWith('alterar');
                        const borderColor = isRemove ? 'border-red-200' : isAlterar ? 'border-amber-200' : 'border-blue-200';
                        const bgColor = isRemove ? 'bg-red-50 hover:bg-red-100' : isAlterar ? 'bg-amber-50 hover:bg-amber-100' : 'bg-blue-50 hover:bg-blue-100';
                        const textColor = isRemove ? 'text-red-700' : isAlterar ? 'text-amber-700' : 'text-[#1351B4]';
                        const badgeColor = isRemove ? 'bg-red-100 text-red-700' : isAlterar ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';
                        const acaoLabel: Record<string, string> = {
                          atribuir: '✅ atribuiu',
                          remover: '❌ removeu',
                          atribuir_conferencista: '📎 atribuiu conferencista',
                          remover_conferencista: '📎 removeu conferencista',
                          liberar_assinatura: '✍️ liberou assinatura',
                          alterar_situacao: '🔄 alterou situação',
                          alterar_campo: '✏️ alterou campo',
                        };
                        const labelAcao = acaoLabel[g.acao] || `📝 ${g.acao}`;
                        return (
                          <div key={gi} className={`border rounded-xl overflow-hidden shadow-sm ${borderColor}`}>
                            {/* Cabeçalho do grupo */}
                            <button
                              className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${bgColor}`}
                              onClick={() => setLogsExpandedId(isExpanded ? null : gi)}
                            >
                              <div className="flex-1 flex flex-wrap items-center gap-3">
                                <span className="text-sm font-bold text-slate-800">📅 {g.date}</span>
                                <span className={`text-sm font-bold ${textColor}`}>
                                  {g.admin}
                                </span>
                                <span className="text-xs text-gray-400 font-medium">({g.role})</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                                  {labelAcao} {g.items.length} vez{g.items.length !== 1 ? 'es' : ''}
                                </span>
                                {/* Resumo inline por técnico */}
                                {!isExpanded && !isRemove && (
                                  <div className="flex flex-wrap gap-1.5 ml-2">
                                    {Array.from(byTecnico.entries()).map(([tk, itens]) => (
                                      <span key={tk} className="text-xs bg-white border border-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                                        {isTecnicoAcao ? tk.split(' ')[0] : tk} ({itens.length})
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>

                            {/* Detalhes expandidos */}
                            {isExpanded && (
                              <div className="bg-white border-t border-gray-100 p-4 flex flex-col gap-2">
                                {/* Cabeçalho da tabela de detalhes */}
                                <div className="grid text-[10px] font-bold text-gray-400 uppercase tracking-wide px-2 pb-1 border-b border-gray-100"
                                  style={{gridTemplateColumns: isTecnicoAcao ? '1fr 1.4fr 1.4fr 90px' : '1fr 1fr 1fr 90px'}}>
                                  <span>Demanda</span>
                                  <span>{isTecnicoAcao ? 'Técnico Anterior' : 'Campo'}</span>
                                  <span>{isTecnicoAcao ? 'Técnico Novo' : 'Novo Valor'}</span>
                                  <span className="text-right">Horário</span>
                                </div>
                                {g.items.map((item: any, ii: number) => {
                                  const anterior = isTecnicoAcao
                                    ? (item.tecnico_anterior || '—')
                                    : (item.valor_anterior || '—');
                                  const novo = isTecnicoAcao
                                    ? (item.tecnico_novo || '(removido)')
                                    : (item.valor_novo || '—');
                                  const hora = item.criado_em
                                    ? new Date(item.criado_em).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit', second:'2-digit'})
                                    : '—';
                                  const isRemovido = novo === '(removido)';
                                  return (
                                    <div key={ii}
                                      className="grid items-center gap-x-3 px-2 py-1.5 rounded-lg hover:bg-slate-50 text-sm"
                                      style={{gridTemplateColumns: isTecnicoAcao ? '1fr 1.4fr 1.4fr 90px' : '1fr 1fr 1fr 90px'}}>
                                      {/* Demanda */}
                                      <span className="font-mono font-semibold text-slate-700 truncate text-xs">
                                        {item.demanda || `#${item.formalizacao_id}`}
                                      </span>
                                      {/* Anterior */}
                                      <span className="text-xs text-gray-500 truncate" title={anterior}>
                                        {anterior !== '—' ? anterior.split(' ')[0] + (anterior.split(' ').length > 1 ? ' ' + anterior.split(' ')[1] : '') : '—'}
                                      </span>
                                      {/* Novo + seta */}
                                      <span className={`text-xs font-semibold truncate flex items-center gap-1 ${isRemovido ? 'text-red-500' : isTecnicoAcao ? 'text-emerald-700' : 'text-amber-700'}`} title={novo}>
                                        <span className="text-gray-300">→</span>
                                        {!isTecnicoAcao ? novo : (novo !== '(removido)'
                                          ? novo.split(' ')[0] + (novo.split(' ').length > 1 ? ' ' + novo.split(' ')[1] : '')
                                          : '(removido)')}
                                      </span>
                                      {/* Horário */}
                                      <span className="text-[10px] text-gray-400 text-right font-mono">{hora}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Vista padrão: tabela para os outros modos */}
                {!logsLoading && logsData.length > 0 && logsTipo !== 'auditoria' && (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide w-8"></th>
                        <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide">Demanda</th>
                        <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide">Técnico Atual</th>
                        <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide">Conferencista</th>
                        <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide">Data Liberação ↑</th>
                        <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide">Regional</th>
                        <th className="text-center px-4 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide">Histórico</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {logsData.map((r: any) => {
                        const hasHistory = Array.isArray(r.historico_atribuicoes) && r.historico_atribuicoes.length > 0;
                        const isExpanded = logsExpandedId === r.id;
                        return (
                          <>
                            <tr key={r.id} className={`hover:bg-blue-50/40 transition-colors ${
                              isExpanded ? 'bg-blue-50' : ''
                            }`}>
                              <td className="px-4 py-2.5">
                                {hasHistory && (
                                  <button
                                    onClick={() => setLogsExpandedId(isExpanded ? null : r.id)}
                                    className="p-1 rounded hover:bg-blue-100 text-[#1351B4] transition-colors"
                                    title="Ver histórico de reatribuições"
                                  >
                                    {isExpanded
                                      ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                                      : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    }
                                  </button>
                                )}
                              </td>
                              <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{r.demanda}</td>
                              <td className="px-4 py-2.5">
                                <span className={`font-semibold ${
                                  (r.tecnico || '').toLowerCase().includes('paula') ? 'text-orange-600' : 'text-slate-800'
                                }`}>{r.tecnico || <span className="text-gray-400 italic">—</span>}</span>
                              </td>
                              <td className="px-4 py-2.5 text-slate-600 text-xs">{r.conferencista || '—'}</td>
                              <td className="px-4 py-2.5 text-slate-600 text-xs">{r.data_liberacao ? r.data_liberacao.split('-').reverse().join('/') : '—'}</td>
                              <td className="px-4 py-2.5 text-slate-600 text-xs">{r.regional || '—'}</td>
                              <td className="px-4 py-2.5 text-center">
                                {hasHistory ? (
                                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                                    {r.historico_atribuicoes.length} mudança{r.historico_atribuicoes.length > 1 ? 's' : ''}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 text-xs">sem hist</span>
                                )}
                              </td>
                            </tr>
                            {isExpanded && hasHistory && (
                              <tr key={`${r.id}-hist`} className="bg-amber-50">
                                <td colSpan={7} className="px-8 py-3">
                                  <div className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-2">
                                    <ClipboardList className="w-3.5 h-3.5" />
                                    Histórico de reatribuições (do mais antigo para o mais recente)
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    {r.historico_atribuicoes.map((h: any, idx: number) => (
                                      <div key={idx} className="bg-white border border-amber-200 rounded-lg px-4 py-2 flex flex-wrap gap-4 text-xs">
                                        <div>
                                          <span className="text-gray-400 font-medium">Técnico anterior:</span>{' '}
                                          <span className={`font-bold ${
                                            (h.tecnico || '').toLowerCase().includes('paula') ? 'text-orange-600' : 'text-slate-800'
                                          }`}>{h.tecnico || '—'}</span>
                                        </div>
                                        {h.conferencista && <div><span className="text-gray-400 font-medium">Conferencista:</span>{' '}<span className="font-semibold text-slate-700">{h.conferencista}</span></div>}
                                        {h.data_liberacao && <div><span className="text-gray-400 font-medium">Data lib.:</span>{' '}<span className="font-semibold text-slate-700">{h.data_liberacao.split('-').reverse().join('/')}</span></div>}
                                        {h.situacao_analise_demanda && <div><span className="text-gray-400 font-medium">Situação:</span>{' '}<span className="font-semibold text-slate-700">{h.situacao_analise_demanda}</span></div>}
                                        {h.gravado_em && <div className="ml-auto"><span className="text-gray-400 font-medium">Gravado em:</span>{' '}<span className="font-semibold text-slate-500">{new Date(h.gravado_em).toLocaleString('pt-BR')}</span></div>}
                                      </div>
                                    ))}
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex flex-wrap gap-4 text-xs">
                                      <div><span className="text-blue-400 font-medium">Técnico ATUAL:</span>{' '}<span className={`font-bold ${(r.tecnico || '').toLowerCase().includes('paula') ? 'text-orange-600' : 'text-blue-800'}`}>{r.tecnico || '—'}</span></div>
                                      {r.data_liberacao && <div><span className="text-blue-400 font-medium">Data lib.:</span>{' '}<span className="font-semibold text-blue-700">{r.data_liberacao.split('-').reverse().join('/')}</span></div>}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer info */}
              {!logsLoading && logsData.length > 0 && (
                <div className="px-6 py-3 border-t border-gray-100 bg-slate-50 flex items-center gap-4">
                  <span className="text-xs text-gray-500">
                    Exibindo <strong>{logsData.length}</strong> de <strong>{logsTotal}</strong> registros.
                    {logsTipo === 'auditoria' && ' Log de atribuições por admin.'}
                    {logsTipo === 'todos' && ' Todas as demandas com atribuição atual.'}
                    {logsTipo === 'atribuicoes' && ' Apenas registros com histórico de reatribuição.'}
                    {logsTipo === 'busca' && ` Resultado da busca por "${logsBusca}".`}
                    {logsData.length >= 500 && logsTotal > 500 && <span className="text-amber-600 font-medium"> Mostrando primeiros 500 — use filtros para refinar.</span>}
                  </span>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal de Troca de Senha */}
      <AnimatePresence>
        {showTrocarSenhaModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTrocarSenhaModal(false)}
              className="fixed inset-0 bg-black/40 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#1351B4] p-2 rounded-lg">
                      <Settings className="text-white w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Trocar Senha</h3>
                  </div>
                  <button
                    onClick={() => setShowTrocarSenhaModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {trocarSenhaErro && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{trocarSenhaErro}</p>
                  </div>
                )}

                <form
                  onSubmit={(e) => { e.preventDefault(); handleTrocarSenha(); }}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-sm font-bold text-slate-700 ml-1">Senha Atual</label>
                    <div className="relative mt-2">
                      <input
                        type={showSenhaAtual ? 'text' : 'password'}
                        value={trocarSenhaAtual}
                        onChange={(e) => setTrocarSenhaAtual(e.target.value)}
                        className="w-full px-4 py-2 pr-10 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1351B4] focus:ring-4 focus:ring-[#1351B4]/10"
                        placeholder="Digite sua senha atual"
                        autoFocus
                      />
                      <button type="button" onClick={() => setShowSenhaAtual(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showSenhaAtual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700 ml-1">Nova Senha</label>
                    <div className="relative mt-2">
                      <input
                        type={showNovaSenha ? 'text' : 'password'}
                        value={trocarNovaSenha}
                        onChange={(e) => setTrocarNovaSenha(e.target.value)}
                        className="w-full px-4 py-2 pr-10 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1351B4] focus:ring-4 focus:ring-[#1351B4]/10"
                        placeholder="Mínimo 6 caracteres"
                      />
                      <button type="button" onClick={() => setShowNovaSenha(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showNovaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700 ml-1">Confirmar Nova Senha</label>
                    <div className="relative mt-2">
                      <input
                        type={showConfirmarSenha ? 'text' : 'password'}
                        value={trocarConfirmarSenha}
                        onChange={(e) => setTrocarConfirmarSenha(e.target.value)}
                        className="w-full px-4 py-2 pr-10 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1351B4] focus:ring-4 focus:ring-[#1351B4]/10"
                        placeholder="Repita a nova senha"
                      />
                      <button type="button" onClick={() => setShowConfirmarSenha(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showConfirmarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowTrocarSenhaModal(false)}
                      className="flex-1 bg-slate-200 text-slate-700 font-bold py-2.5 rounded-lg hover:bg-slate-300 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={trocarSenhaLoading}
                      className="flex-1 bg-[#1351B4] text-white font-bold py-2.5 rounded-lg hover:bg-[#0C326F] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {trocarSenhaLoading ? (
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Salvar
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #CBD5E1;
        }
      `}</style>

      {/* Edição inline de falta_assinatura */}
      {inlineEditFalta && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/20 z-[9000]"
            onClick={() => setInlineEditFalta(null)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9001] bg-white rounded-2xl shadow-2xl p-5 w-80">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <PenLine className="w-4 h-4 text-orange-500" />
                Falta Assinatura
              </h4>
              <button onClick={() => setInlineEditFalta(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-1 mb-4">
              {[
                'GESTOR ADMINISTRATIVO DRS',
                'GESTOR TÉCNICO DRS',
                'DIRETOR DRS',
                'COORDENADOR CRS',
                'DIRETOR GGCON',
                'ORDENADOR DE DESPESAS',
                'SECRETÁRIO',
                'GESTOR – CONVÊNIO / DEMANDANTE',
                'ORÇAMENTO CGOF',
                'CHEFIA DE GABINETE',
                'AGUARDANDO RESOLUÇÃO',
                'NOTA DE RESERVA - GCF',
                'AGUARDANDO FINALIZAÇÃO',
                'LOTE3',
              ].map(opcao => {
                const currentValues = inlineEditFalta.value
                  ? inlineEditFalta.value.split(',').map((s: string) => s.trim()).filter(Boolean)
                  : [];
                const isChecked = currentValues.includes(opcao);
                return (
                  <label key={opcao} className="flex items-center gap-2.5 cursor-pointer hover:bg-orange-50 p-1.5 rounded">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        const FALTA_ORDER = [
                          'GESTOR ADMINISTRATIVO DRS', 'GESTOR TÉCNICO DRS', 'DIRETOR DRS',
                          'COORDENADOR CRS', 'DIRETOR GGCON', 'ORDENADOR DE DESPESAS',
                          'SECRETÁRIO', 'GESTOR – CONVÊNIO / DEMANDANTE', 'ORÇAMENTO CGOF',
                          'CHEFIA DE GABINETE', 'AGUARDANDO RESOLUÇÃO', 'NOTA DE RESERVA - GCF',
                          'AGUARDANDO FINALIZAÇÃO', 'LOTE3'
                        ];
                        const newValues = isChecked
                          ? currentValues.filter(v => v !== opcao)
                          : [...currentValues, opcao];
                        const sorted = newValues.sort((a, b) => {
                          const ia = FALTA_ORDER.indexOf(a);
                          const ib = FALTA_ORDER.indexOf(b);
                          return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                        });
                        setInlineEditFalta({ ...inlineEditFalta, value: sorted.join(', ') });
                      }}
                      className="w-4 h-4 rounded border-gray-300 accent-orange-500"
                    />
                    <span className="text-xs text-gray-700">{opcao}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setInlineEditFalta(null)}
                className="flex-1 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                disabled={savingFalta}
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!inlineEditFalta.id) return;
                  setSavingFalta(true);
                  try {
                    const response = await fetch(`/api/formalizacao/${inlineEditFalta.id}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ falta_assinatura: inlineEditFalta.value })
                    });
                    if (!response.ok) {
                      const err = await response.json();
                      throw new Error(err.error || 'Erro ao salvar');
                    }
                    const numId = parseInt(inlineEditFalta.id);
                    const savedValue = inlineEditFalta.value;
                    const updater = (list: any[]) => list.map((item: any) =>
                      item.id === numId ? { ...item, falta_assinatura: savedValue } : item
                    );
                    if (allDataCacheRef.current.length > 0) {
                      allDataCacheRef.current = updater(allDataCacheRef.current);
                      syncLocalStorageCache(); // persistir alteração imediatamente
                    }
                    if (filteredForExportRef.current.length > 0) {
                      filteredForExportRef.current = updater(filteredForExportRef.current);
                    }
                    setFormalizacoes(prev => updater(prev));
                    setFormalizacaoSearchResult((prev: any) => ({
                      ...prev,
                      data: updater(prev.data)
                    }));
                    setInlineEditFalta(null);
                  } catch (error: any) {
                    alert(`❌ Erro ao salvar:\n${error.message}`);
                  } finally {
                    setSavingFalta(false);
                  }
                }}
                className="flex-1 px-3 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                disabled={savingFalta}
              >
                {savingFalta
                  ? <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                  : <Check className="w-3.5 h-3.5" />
                }
                Salvar
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Floating refresh progress bar */}
      {refreshProgress && refreshProgress.active && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-white rounded-xl shadow-2xl border border-slate-200 p-4 min-w-[280px] max-w-[340px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-[#1351B4] animate-spin" />
              Atualizando dados...
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {refreshProgress.loaded.toLocaleString()}{refreshProgress.total > 0 ? ` / ~${refreshProgress.total.toLocaleString()}` : ''}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#1351B4] to-[#0C326F] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${refreshProgress.total > 0 ? Math.min(100, (refreshProgress.loaded / refreshProgress.total) * 100) : 0}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">
            {refreshProgress.loaded === refreshProgress.total && refreshProgress.loaded > 0
              ? `Concluído em ${((Date.now() - refreshProgress.startTime) / 1000).toFixed(1)}s`
              : `${((Date.now() - refreshProgress.startTime) / 1000).toFixed(0)}s decorridos`
            }
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          � MODAL "MINHAS ATRIBUIÇÕES" — Técnicos e Conferencistas
          ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showMinhasAtribuicoesModal && !isAdmin && (() => {
          const minhasFiltradas = notifTodas.filter(n => {
            if (minhasAtrFiltro === 'pendentes') return !n.confirmado;
            if (minhasAtrFiltro === 'confirmadas') return n.confirmado;
            return true;
          });
          const totalPend = notifTodas.filter(n => !n.confirmado).length;
          const totalConf = notifTodas.filter(n => n.confirmado).length;

          return (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowMinhasAtribuicoesModal(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9990]"
              />
              <motion.div
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                className="fixed inset-4 md:inset-8 bg-white rounded-2xl shadow-2xl z-[9991] flex flex-col overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#1351B4] to-blue-600 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl">
                      <ClipboardList className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Minhas Atribuições</h2>
                      <p className="text-xs text-white/70">
                        {totalPend > 0
                          ? `${totalPend} aguardando confirmação · ${totalConf} confirmada(s)`
                          : `${totalConf} atribuição(ões) · tudo confirmado ✓`}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setShowMinhasAtribuicoesModal(false)} className="p-2 rounded-lg hover:bg-white/20 transition-colors text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Alerta de pendências */}
                {totalPend > 0 && (
                  <div className="mx-6 mt-4 flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex-shrink-0">
                    <span className="text-amber-500 text-xl">⏳</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-amber-800">
                        Você tem {totalPend} atribuição(ões) aguardando confirmação
                      </p>
                      <p className="text-xs text-amber-600">Confirme o recebimento para notificar o administrador</p>
                    </div>
                  </div>
                )}

                {/* Abas */}
                <div className="flex items-center gap-0 px-6 pt-4 pb-0 flex-shrink-0 border-b border-gray-200">
                  {(['pendentes', 'confirmadas', 'todas'] as const).map(aba => {
                    const counts = { pendentes: totalPend, confirmadas: totalConf, todas: notifTodas.length };
                    const labels = { pendentes: 'Pendentes', confirmadas: 'Confirmadas', todas: 'Todas' };
                    const activeColors = {
                      pendentes: 'border-amber-500 text-amber-700 font-bold',
                      confirmadas: 'border-emerald-500 text-emerald-700 font-bold',
                      todas: 'border-blue-500 text-blue-700 font-bold',
                    };
                    return (
                      <button
                        key={aba}
                        onClick={() => setMinhasAtrFiltro(aba)}
                        className={`flex items-center gap-2 px-5 py-3 text-sm border-b-2 transition-colors -mb-px ${minhasAtrFiltro === aba ? activeColors[aba] : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                      >
                        {labels[aba]}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          aba === 'pendentes' ? 'bg-amber-100 text-amber-700' :
                          aba === 'confirmadas' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>{counts[aba]}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Lista de atribuições */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                  {minhasFiltradas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 py-16">
                      <CheckCircle className="w-12 h-12 opacity-20" />
                      <p className="text-sm font-medium">
                        {minhasAtrFiltro === 'pendentes' ? 'Nenhuma pendência — tudo confirmado!' :
                         minhasAtrFiltro === 'confirmadas' ? 'Nenhuma atribuição confirmada ainda' :
                         'Você ainda não recebeu atribuições'}
                      </p>
                    </div>
                  ) : (
                    minhasFiltradas.map(notif => {
                      const isPend = !notif.confirmado;
                      const isConfirmandoThis = confirmandoNotifId === notif.id;
                      return (
                        <div key={notif.id} className={`rounded-2xl border p-5 transition-all ${isPend ? 'border-amber-300 bg-amber-50' : 'border-emerald-200 bg-emerald-50/40'}`}>
                          {/* Cabeçalho do card */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${notif.tipo === 'tecnico' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>
                                {notif.tipo === 'tecnico' ? 'Técnico' : 'Conferencista'}
                              </span>
                              {isPend ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">⏳ Aguardando confirmação</span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Confirmado
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500">
                              {new Date(notif.data_atribuicao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Info */}
                          <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                            <div>
                              <p className="text-xs text-slate-500 font-medium mb-0.5">Atribuído por</p>
                              <p className="font-semibold text-slate-800">{notif.admin_nome}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 font-medium mb-0.5">Total de demandas</p>
                              <p className="font-bold text-blue-600 text-base">{notif.total_demandas}</p>
                            </div>
                          </div>

                          {/* Demandas */}
                          {notif.demandas && notif.demandas.length > 0 && (
                            <div className="mb-3">
                              {(() => {
                                const demandasUniques = Array.from(new Set(notif.demandas || []));
                                return (
                                  <>
                                    <p className="text-xs text-slate-500 font-medium mb-1.5">Demandas atribuídas ({demandasUniques.length}):</p>
                                    <div className="flex flex-wrap gap-1">
                                      {demandasUniques.map((d, i) => (
                                        <span key={i} className="text-[10px] bg-white border border-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-mono">{d}</span>
                                      ))}
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          )}

                          {/* Se confirmado: mostrar detalhes */}
                          {!isPend && (
                            <div className="mt-2 pt-3 border-t border-emerald-200 grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <p className="text-slate-500 font-medium">Confirmado em:</p>
                                <p className="font-semibold text-emerald-700">
                                  {notif.confirmado_em ? new Date(notif.confirmado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-500 font-medium">Sua observação:</p>
                                <p className="text-slate-700">{notif.observacao || '(sem observação)'}</p>
                              </div>
                            </div>
                          )}

                          {/* Botão / Formulário de confirmação */}
                          {isPend && (
                            isConfirmandoThis ? (
                              <div className="mt-3 space-y-2">
                                <textarea
                                  value={notifObservacao}
                                  onChange={e => setNotifObservacao(e.target.value)}
                                  placeholder="Observação (opcional) — ex: recebi e estou analisando..."
                                  rows={2}
                                  className="w-full text-sm border border-amber-300 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none bg-white"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => { setConfirmandoNotifId(null); setNotifObservacao(''); }}
                                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={async () => {
                                      try {
                                        const r = await fetch('/api/notificacoes/confirmar', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                          body: JSON.stringify({ id: notif.id, observacao: notifObservacao || null }),
                                        });
                                        const res = await r.json() as any;
                                        if (!r.ok && !res.ja_confirmado) {
                                          alert(`Erro: ${res.error || 'Falha ao confirmar'}`);
                                          return;
                                        }
                                        setNotifPendentes(prev => prev.filter(n => n.id !== notif.id));
                                        setNotifTodas(prev => prev.map(n => n.id === notif.id
                                          ? { ...n, confirmado: true, confirmado_em: new Date().toISOString(), observacao: notifObservacao || null }
                                          : n));
                                        setConfirmandoNotifId(null);
                                        setNotifObservacao('');
                                      } catch (err: any) {
                                        alert(`Erro de rede: ${err.message}`);
                                      }
                                    }}
                                    className="flex-1 px-3 py-2 text-sm rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    Confirmar Recebimento
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setConfirmandoNotifId(notif.id); setNotifObservacao(''); }}
                                className="mt-3 w-full px-4 py-2.5 text-sm rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Confirmar Recebimento
                              </button>
                            )
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-gray-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
                  <p className="text-xs text-slate-500">
                    {totalPend > 0
                      ? <span className="text-amber-600 font-semibold">{totalPend} pendente(s) de confirmação</span>
                      : <span className="text-emerald-600 font-semibold">✓ Todas as atribuições confirmadas</span>}
                  </p>
                  <button onClick={() => setShowMinhasAtribuicoesModal(false)} className="text-xs text-slate-500 hover:text-slate-700 underline">
                    Fechar
                  </button>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════
          �🔔 MODAL DE CONFIRMAÇÃO DE RECEBIMENTO — Para Técnicos/Conferencistas
          ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showNotifModal && notifPendentes.length > 0 && !isAdmin && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9990]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 40 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              className="fixed inset-x-4 top-8 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[600px] max-h-[90vh] z-[9991] flex flex-col overflow-hidden rounded-2xl shadow-2xl"
            >
              {/* Banner de atenção */}
              <div className="bg-gradient-to-r from-[#1351B4] to-blue-500 px-6 py-5 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-2xl flex-shrink-0">
                    <ClipboardList className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-0.5">Atenção</p>
                    <h3 className="text-white font-bold text-lg leading-tight">
                      Você recebeu {notifPendentes.reduce((s, n) => s + (n.total_demandas || 0), 0)} demanda(s) para analisar
                    </h3>
                    <p className="text-white/70 text-xs mt-0.5">
                      Confirme o recebimento para que o administrador saiba que você está ciente
                    </p>
                  </div>
                </div>
              </div>

              {/* Cards das atribuições pendentes */}
              <div className="flex-1 overflow-y-auto bg-white p-5 space-y-4">
                {notifPendentes.map((notif, idx) => (
                  <div key={notif.id} className="rounded-2xl border-2 border-blue-200 bg-blue-50 overflow-hidden">
                    {/* Cabeçalho do card */}
                    <div className="bg-blue-100 px-4 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-800">
                          Atribuição {notifPendentes.length > 1 ? `${idx + 1} de ${notifPendentes.length}` : ''}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${notif.tipo === 'tecnico' ? 'bg-amber-200 text-amber-900' : 'bg-green-200 text-green-900'}`}>
                          {notif.tipo === 'tecnico' ? 'Técnico' : 'Conferencista'}
                        </span>
                      </div>
                      <span className="text-[10px] text-blue-600">
                        {new Date(notif.data_atribuicao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="p-4">
                      {/* Resumo */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-0.5">Atribuído por</p>
                          <p className="text-sm font-bold text-slate-800">{notif.admin_nome}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-0.5">Qtd. de demandas</p>
                          <p className="text-xl font-black text-blue-600">{notif.total_demandas}</p>
                        </div>
                      </div>

                      {/* Lista de demandas */}
                      {notif.demandas && notif.demandas.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1.5">Demandas:</p>
                          <div className="flex flex-wrap gap-1">
                            {notif.demandas.slice(0, 20).map((d, i) => (
                              <span key={i} className="text-[10px] bg-white border border-blue-300 text-blue-900 px-2 py-0.5 rounded-full font-mono font-semibold">{d}</span>
                            ))}
                            {notif.demandas.length > 20 && (
                              <span className="text-[10px] text-slate-500 italic px-1 self-center">+{notif.demandas.length - 20} mais</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Confirmação */}
                      {confirmandoNotifId === notif.id ? (
                        <div className="space-y-2.5 bg-white rounded-xl border border-blue-200 p-3">
                          <p className="text-xs font-semibold text-slate-600">Observação para o administrador (opcional):</p>
                          <textarea
                            value={notifObservacao}
                            onChange={e => setNotifObservacao(e.target.value)}
                            placeholder="Ex: Recebi as demandas e já estou analisando..."
                            rows={2}
                            autoFocus
                            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setConfirmandoNotifId(null); setNotifObservacao(''); }}
                              className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                              Voltar
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const r = await fetch('/api/notificacoes/confirmar', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                    body: JSON.stringify({ id: notif.id, observacao: notifObservacao || null }),
                                  });
                                  const res = await r.json() as any;
                                  if (!r.ok && !res.ja_confirmado) {
                                    alert(`Erro: ${res.error || 'Falha ao confirmar'}`);
                                    return;
                                  }
                                  setNotifPendentes(prev => prev.filter(n => n.id !== notif.id));
                                  setNotifTodas(prev => prev.map(n => n.id === notif.id
                                    ? { ...n, confirmado: true, confirmado_em: new Date().toISOString(), observacao: notifObservacao || null }
                                    : n));
                                  setConfirmandoNotifId(null);
                                  setNotifObservacao('');
                                  if (notifPendentes.filter(n => n.id !== notif.id).length === 0) {
                                    setShowNotifModal(false);
                                  }
                                } catch (err: any) {
                                  alert(`Erro de rede: ${err.message}`);
                                }
                              }}
                              className="flex-1 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Confirmar Recebimento
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setConfirmandoNotifId(notif.id); setNotifObservacao(''); }}
                          className="w-full px-4 py-3 text-sm rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Confirmar Recebimento
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Rodapé */}
              <div className="bg-slate-100 border-t border-gray-200 px-5 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold text-amber-600">{notifPendentes.length}</span> atribuição(ões) aguardando sua confirmação
                  </p>
                  <button
                    onClick={() => logout()}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 bg-white hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors"
                    title="Sair do sistema"
                  >
                    <LogOut className="w-3 h-3" />
                    Sair
                  </button>
                </div>
                <button
                  onClick={() => setShowNotifModal(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
                >
                  Confirmar mais tarde
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════
          🔔 PAINEL ADMIN — Atribuições / Gestão de Demandas e Responsáveis
          ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showNotifAdminModal && isAdmin && (() => {
          // ── Global dedup: sort DESC, per user skip rows whose IDs are all already seen ──
          const _globalSeen = new Map<string, Set<number>>();
          const notifDedup = [...notifTodas]
            .sort((a, b) => new Date(b.data_atribuicao).getTime() - new Date(a.data_atribuicao).getTime())
            .filter(n => {
              const key = n.usuario_nome;
              if (!_globalSeen.has(key)) _globalSeen.set(key, new Set());
              const seen = _globalSeen.get(key)!;
              const ids: number[] = n.formalizacao_ids || [];
              if (ids.length > 0 && ids.every(id => seen.has(id))) return false;
              ids.forEach(id => seen.add(id));
              return true;
            });

          // ── Compute unique formalizacao_ids per responsável (bug fix: dedup) ──
          const resumoPorUsuario = notifTodas.reduce((acc: Record<string, any>, n: NotifItem) => {
            const key = n.usuario_nome;
            if (!acc[key]) acc[key] = { nome: n.usuario_nome, tipo: n.tipo, pendentes: 0, confirmadas: 0, idSet: new Set<number>() };
            if (n.confirmado) acc[key].confirmadas++;
            else acc[key].pendentes++;
            (n.formalizacao_ids || []).forEach((id: number) => acc[key].idSet.add(id));
            return acc;
          }, {} as Record<string, any>);

          const resumoArr = (Object.values(resumoPorUsuario) as any[])
            .map(r => ({ ...r, total_demandas: r.idSet.size }))
            .sort((a: any, b: any) => b.pendentes - a.pendentes || a.nome.localeCompare(b.nome));

          // ── KPI totals (based on deduped rows) ────────────────────────────
          const totalPendentes   = notifDedup.filter(n => !n.confirmado).length;
          const totalConfirmadas = notifDedup.filter(n => n.confirmado).length;
          const totalTecnicos    = resumoArr.length;

          // ── Sidebar list (search + status filter) ──────────────────────────
          const sidebarFiltered = resumoArr.filter((r: any) => {
            const matchSearch = !notifSearchResp || r.nome.toLowerCase().includes(notifSearchResp.toLowerCase());
            const matchStatus = notifSidebarStatus === 'todos' ? true
              : notifSidebarStatus === 'pendentes' ? r.pendentes > 0
              : r.pendentes === 0;
            return matchSearch && matchStatus;
          });

          // ── Main content: filter by responsável + tab (uses deduped rows) ──
          const notifFiltradas = notifDedup.filter(n => {
            const matchResp = !notifFiltroResponsavel || n.usuario_nome === notifFiltroResponsavel;
            const matchAba  = notifFiltroAba === 'pendentes' ? !n.confirmado
              : notifFiltroAba === 'confirmadas' ? n.confirmado
              : true;
            return matchResp && matchAba;
          });

          // ── Group by date, desc ────────────────────────────────────────────
          const grupos: Record<string, NotifItem[]> = {};
          notifFiltradas.forEach(n => {
            const dataKey = new Date(n.data_atribuicao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            if (!grupos[dataKey]) grupos[dataKey] = [];
            grupos[dataKey].push(n);
          });
          const gruposOrdenados = Object.entries(grupos).sort(([a], [b]) => {
            const parseDate = (s: string) => { const [d, m, y] = s.split('/'); return new Date(`${y}-${m}-${d}`).getTime(); };
            return parseDate(b) - parseDate(a);
          });

          return (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowNotifAdminModal(false)}
                className="fixed inset-0 bg-black/60 z-[9990]"
              />
              <motion.div
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                className="fixed inset-4 md:inset-8 bg-slate-100 rounded-2xl shadow-2xl z-[9991] flex flex-col overflow-hidden"
              >
                {/* ── HEADER ─────────────────────────────────────────────────── */}
                <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700 flex-shrink-0">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-black text-white tracking-tight leading-tight">Atribuições</h2>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">Gestão de Demandas e Responsáveis</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          try {
                            const r = await fetch('/api/notificacoes', { headers: getHeaders() });
                            if (!r.ok) return;
                            const data = await r.json() as any;
                            const items = data.items || [];
                            setNotifTodas(items);
                            setNotifPendentes(items.filter((n: any) => !n.confirmado));
                          } catch {}
                        }}
                        className="text-xs bg-white/10 text-white hover:bg-white/20 px-4 py-2 rounded-lg font-semibold transition-colors border border-white/20"
                      >
                        ↻ Atualizar
                      </button>
                      <button
                        onClick={() => setShowNotifAdminModal(false)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* ── KPI cards ────────────────────────────────────────────── */}
                  <div className="grid grid-cols-4 gap-3">
                    {([
                      { label: 'Pendentes',   value: totalPendentes,   color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30' },
                      { label: 'Confirmadas', value: totalConfirmadas, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
                      { label: 'Total',       value: notifDedup.length, color: 'text-blue-300',   bg: 'bg-blue-500/10 border-blue-500/30' },
                      { label: 'Técnicos',    value: totalTecnicos,    color: 'text-purple-300',  bg: 'bg-purple-500/10 border-purple-500/30' },
                    ] as const).map(kpi => (
                      <div key={kpi.label} className={`rounded-xl border px-4 py-3 ${kpi.bg} shadow-sm hover:shadow-md transition-shadow`}>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{kpi.label}</p>
                        <p className={`text-3xl font-black leading-none ${kpi.color}`}>{kpi.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── BODY: sidebar + main ───────────────────────────────────── */}
                <div className="flex flex-1 overflow-hidden">

                  {/* ── Sidebar Responsáveis ─────────────────────────────────── */}
                  <div className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Responsáveis</p>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Pesquisar..."
                          value={notifSearchResp}
                          onChange={e => setNotifSearchResp(e.target.value)}
                          className="w-full text-xs pl-7 pr-2 py-1.5 border border-slate-200 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 outline-none bg-slate-50"
                        />
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">🔍</span>
                      </div>
                    </div>

                    {/* Status filter */}
                    <div className="px-4 py-2.5 border-b border-slate-100 flex flex-col gap-1.5">
                      {([
                        { key: 'todos',       label: 'Todos' },
                        { key: 'pendentes',   label: 'Pendentes' },
                        { key: 'confirmados', label: 'Confirmados' },
                      ] as const).map(f => (
                        <label key={f.key} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="radio"
                            name="notifSidebarStatus"
                            checked={notifSidebarStatus === f.key}
                            onChange={() => setNotifSidebarStatus(f.key)}
                            className="accent-blue-600"
                          />
                          <span className={`text-xs font-medium ${notifSidebarStatus === f.key ? 'text-blue-700' : 'text-slate-600 group-hover:text-slate-800'}`}>{f.label}</span>
                        </label>
                      ))}
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto">
                      <button
                        onClick={() => setNotifFiltroResponsavel(null)}
                        className={`w-full text-left px-4 py-2.5 flex items-center justify-between border-b border-slate-50 transition-colors text-xs font-semibold ${!notifFiltroResponsavel ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-500'}`}
                      >
                        <span>Todos</span>
                        <span className="text-[10px] font-normal text-slate-400">{notifTodas.length} notif.</span>
                      </button>
                      {sidebarFiltered.map((r: any) => (
                        <button
                          key={r.nome}
                          onClick={() => setNotifFiltroResponsavel(notifFiltroResponsavel === r.nome ? null : r.nome)}
                          className={`w-full text-left px-4 py-2.5 border-b border-slate-50 transition-colors ${notifFiltroResponsavel === r.nome ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-slate-50'}`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`text-xs font-semibold truncate max-w-[130px] ${notifFiltroResponsavel === r.nome ? 'text-blue-700' : 'text-slate-700'}`} title={r.nome}>{r.nome}</span>
                            <span className={`text-[10px] font-bold ml-1 shrink-0 ${r.pendentes > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {r.pendentes > 0 ? `${r.pendentes} ⏳` : '✓'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">{r.total_demandas} dem. únicas</div>
                        </button>
                      ))}
                      {sidebarFiltered.length === 0 && (
                        <div className="px-4 py-6 text-center text-xs text-slate-400">Nenhum resultado</div>
                      )}
                    </div>
                  </div>

                  {/* ── Main content ─────────────────────────────────────────── */}
                  <div className="flex-1 flex flex-col overflow-hidden bg-white">
                    {/* Tabs */}
                    <div className="flex items-center gap-0 px-6 border-b border-gray-200 bg-white flex-shrink-0">
                      {(['pendentes', 'confirmadas', 'todas'] as const).map(aba => {
                        const baseCount = notifFiltroResponsavel
                          ? notifDedup.filter(n => n.usuario_nome === notifFiltroResponsavel)
                          : notifDedup;
                        const counts = {
                          pendentes:   baseCount.filter(n => !n.confirmado).length,
                          confirmadas: baseCount.filter(n => n.confirmado).length,
                          todas:       baseCount.length,
                        };
                        const labels = { pendentes: 'Pendentes', confirmadas: 'Confirmadas', todas: 'Todas' };
                        const tabColors = {
                          pendentes:   notifFiltroAba === 'pendentes'   ? 'border-amber-500 text-amber-700 font-bold'   : 'border-transparent text-slate-500 hover:text-slate-700',
                          confirmadas: notifFiltroAba === 'confirmadas' ? 'border-emerald-500 text-emerald-700 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700',
                          todas:       notifFiltroAba === 'todas'       ? 'border-blue-500 text-blue-700 font-bold'     : 'border-transparent text-slate-500 hover:text-slate-700',
                        };
                        return (
                          <button
                            key={aba}
                            onClick={() => setNotifFiltroAba(aba)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm border-b-2 transition-colors -mb-px ${tabColors[aba]}`}
                          >
                            {labels[aba]}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                              aba === 'pendentes'   ? 'bg-amber-100 text-amber-700' :
                              aba === 'confirmadas' ? 'bg-emerald-100 text-emerald-700' :
                                                     'bg-slate-100 text-slate-600'
                            }`}>{counts[aba]}</span>
                          </button>
                        );
                      })}
                      {notifFiltroResponsavel && (
                        <div className="ml-auto mr-2 flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">Filtro: <strong className="text-slate-700">{notifFiltroResponsavel}</strong></span>
                          <button onClick={() => setNotifFiltroResponsavel(null)} className="text-[11px] text-blue-600 hover:underline px-1">✕</button>
                        </div>
                      )}
                    </div>

                    {/* Content grouped by date */}
                    <div className="flex-1 overflow-y-auto">
                      {gruposOrdenados.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 py-12">
                          <CheckCircle className="w-12 h-12 opacity-20" />
                          <p className="text-sm font-medium">
                            {notifFiltroAba === 'pendentes'   ? 'Nenhuma atribuição pendente — tudo confirmado!' :
                             notifFiltroAba === 'confirmadas' ? 'Nenhuma atribuição confirmada ainda' :
                                                               'Nenhuma atribuição registrada'}
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {gruposOrdenados.map(([dataLabel, itens]) => {
                            const totalDemDia = new Set(itens.flatMap(n => n.demandas || [])).size;
                            const pendDia = itens.filter(n => !n.confirmado).length;
                            const confDia = itens.filter(n => n.confirmado).length;
                            return (
                              <div key={dataLabel}>
                                <div className="flex items-center gap-4 px-6 py-2.5 bg-slate-50 border-b border-gray-200 sticky top-0 z-10">
                                  <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                                    {dataLabel}
                                  </span>
                                  <span className="text-xs text-slate-500">{itens.length} atribuição(ões) · {totalDemDia} dem.</span>
                                  <div className="flex items-center gap-1.5 ml-auto">
                                    {pendDia > 0 && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">⏳ {pendDia}</span>
                                    )}
                                    {confDia > 0 && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">✓ {confDia}</span>
                                    )}
                                  </div>
                                </div>

                                <div className="divide-y divide-gray-50">
                                  {itens.map(n => {
                                    const expanded = notifExpandedId === n.id;
                                    const hora = new Date(n.data_atribuicao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                    return (
                                      <div key={n.id} className={`transition-colors ${!n.confirmado ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-slate-50'}`}>
                                        <div
                                          className="flex items-center gap-3 px-6 py-3 cursor-pointer"
                                          onClick={() => setNotifExpandedId(expanded ? null : n.id)}
                                        >
                                          <span className="text-xs text-slate-400 font-mono w-12 flex-shrink-0">{hora}</span>
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${n.tipo === 'tecnico' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                                            {n.tipo === 'tecnico' ? 'Técnico' : 'Conf.'}
                                          </span>
                                          <span className="font-semibold text-slate-800 text-sm min-w-[120px]">{n.usuario_nome}</span>
                                          <span className="text-xs text-slate-500 flex-shrink-0">
                                            <span className="font-bold text-blue-600">{n.total_demandas}</span> dem.
                                          </span>
                                          <span className="text-xs text-slate-500 flex-shrink-0 hidden md:block">
                                            por <span className="font-medium text-slate-700">{n.admin_nome}</span>
                                          </span>
                                          <div className="flex-1" />
                                          {n.confirmado ? (
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                <CheckCircle className="w-3 h-3" /> Confirmado
                                              </span>
                                              {n.confirmado_em && (
                                                <span className="text-[10px] text-slate-400 hidden lg:block">
                                                  {new Date(n.confirmado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 flex-shrink-0">
                                              ⏳ Pendente
                                            </span>
                                          )}
                                          <span className="text-slate-300 ml-2 text-xs">{expanded ? '▲' : '▼'}</span>
                                        </div>

                                        {expanded && (
                                          <div className="px-6 pb-4 pt-0">
                                            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                                              {n.demandas && n.demandas.length > 0 && (
                                                <div>
                                                  {(() => {
                                                    const demandasUniques = Array.from(new Set(n.demandas || []));
                                                    return (
                                                      <>
                                                        <p className="text-xs font-bold text-slate-600 mb-2">Demandas atribuídas ({demandasUniques.length}):</p>
                                                        <div className="flex flex-wrap gap-1">
                                                          {demandasUniques.map((d, i) => (
                                                            <span key={i} className="text-[10px] bg-blue-50 border border-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-mono">{d}</span>
                                                          ))}
                                                        </div>
                                                      </>
                                                    );
                                                  })()}
                                                </div>
                                              )}
                                              {n.confirmado && (
                                                <div className="grid grid-cols-2 gap-3 text-xs">
                                                  <div>
                                                    <p className="text-slate-500 font-medium">Confirmado em:</p>
                                                    <p className="font-semibold text-emerald-700">
                                                      {n.confirmado_em ? new Date(n.confirmado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                                    </p>
                                                  </div>
                                                  <div>
                                                    <p className="text-slate-500 font-medium">Observação:</p>
                                                    <p className="text-slate-700">{n.observacao || '(sem observação)'}</p>
                                                  </div>
                                                </div>
                                              )}
                                              {!n.confirmado && (
                                                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                                                  <span>⏳</span>
                                                  <span>Aguardando confirmação de <strong>{n.usuario_nome}</strong></span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}

function DetailItem({ label, value, highlight, full, mono }: { label: string, value?: string | number | null, highlight?: boolean, full?: boolean, mono?: boolean }) {
  const isEmpty = !value || String(value).trim() === '' || String(value).trim() === '—';
  return (
    <div className={`rounded-xl px-4 py-3 flex flex-col gap-1 transition-colors ${
      highlight ? 'bg-[#1351B4]/8 border border-[#1351B4]/20' : 'bg-slate-50 border border-slate-100'
    } ${full ? 'col-span-full' : ''}`}>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{label}</span>
      <span className={`text-[13px] font-semibold leading-snug break-words ${
        isEmpty ? 'text-slate-300 italic' : highlight ? 'text-[#1351B4]' : 'text-slate-800'
      } ${mono ? 'font-mono' : ''}`}>
        {isEmpty ? 'Não informado' : String(value)}
      </span>
    </div>
  );
}

function Input({ label, className = '', disabled = false, ...props }: any) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-xs font-medium text-gray-500 ml-0.5">{label}</label>
      <input
        disabled={disabled}
        className={`w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:border-[#1351B4] focus:ring-4 focus:ring-[#1351B4]/10 outline-none transition-all ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
        {...props}
      />
    </div>
  );
}

function Select({ label, children, className = '', ...props }: any) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-xs font-medium text-gray-500 ml-0.5">{label}</label>
      <select
        className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:border-[#1351B4] focus:ring-4 focus:ring-[#1351B4]/10 outline-none transition-all appearance-none"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
