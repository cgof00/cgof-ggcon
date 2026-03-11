/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useAuth } from './AuthContext';
import { AdminPanel } from './AdminPanel';
import { UserManagementPanel } from './UserManagementPanel';
// EmendasDataTable removido - sistema usa somente Formalização
import logo1Img from './img/logo1.png';

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
    if (NUMERIC_COLUMNS.has(dbColumn)) mapped[dbColumn] = parseBRNumber(val);
    else if (INTEGER_COLUMNS.has(dbColumn)) mapped[dbColumn] = /^\d+$/.test(val.trim()) ? parseInt(val.trim(), 10) : 0;
    else mapped[dbColumn] = val;
  }
  if (!mapped.codigo_num || String(mapped.codigo_num).trim() === '') return null;
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
              filteredOptions.map(option => (
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
              ))
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
              filteredOptions.map(option => (
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
              ))
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
  posicao_anterior?: string;
  situacao_demandas_sempapel?: string;
  area_estagio?: string;
  recurso?: string;
  tecnico?: string;
  data_liberacao?: string;
  area_estagio_situacao_demanda?: string;
  situacao_analise_demanda?: string;
  data_analise_demanda?: string;
  motivo_retorno_diligencia?: string;
  data_retorno_diligencia?: string;
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
}

export default function App() {
  const { user, token, logout, isAdmin, isIntermediario, isUsuario } = useAuth();
  const [activeTab, setActiveTab] = useState<'formalizacao' | 'admin'>('formalizacao');
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [adminAlertas, setAdminAlertas] = useState<{id: number, tipo: string, descricao: string, data: string}[]>([]);
  const [showAlertasDropdown, setShowAlertasDropdown] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState<{ active: boolean; loaded: number; total: number; startTime: number } | null>(null);
  // emendas removido do frontend - dados apenas no Supabase
  const [formalizacoes, setFormalizacoes] = useState<Formalizacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormalizacaoFormOpen, setIsFormalizacaoFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'parsing' | 'uploading' | 'syncing' | 'done' | 'error'>('idle');
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');
  const [isSupabaseGuideOpen, setIsSupabaseGuideOpen] = useState(false);
  const [editingFormalizacao, setEditingFormalizacao] = useState<Formalizacao | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFormalizacao, setSelectedFormalizacao] = useState<Formalizacao | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
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
    posicao_anterior: true,
    situacao_demandas_sempapel: true,
    area_estagio: true,
    recurso: true,
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
    concluida_em: true
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
  const allDataCacheRef = useRef<Formalizacao[]>([]); // Cache global de todos dados
  const cacheTimestampRef = useRef<number>(0); // Timestamp do cache para invalidação
  const CACHE_VALIDITY_MS = 5 * 60 * 1000; // Cache válido por 5 minutos

  // Estado de ordenação e scroll de colunas
  const [sortColumn, setSortColumn] = useState<string>('ano');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const columnHeaderRefs = useRef<{ [key: string]: HTMLTableCellElement | null }>({});

  // Filtros de Formalização
  // 🎯 Estado dos filtros - campos dropdown usam arrays para múltiplas seleções
  const [filters, setFilters] = useState({
    ano: [] as string[],
    demandas_formalizacao: [] as string[], // Filtro por número de demanda
    area_estagio: [] as string[],
    recurso: [] as string[],
    tecnico: [] as string[],
    data_liberacao: [] as string[], // Multi-select de datas
    area_estagio_situacao_demanda: [] as string[],
    situacao_analise_demanda: [] as string[],
    data_analise_demanda: [] as string[], // Multi-select de datas
    conferencista: [] as string[],
    data_recebimento_demanda: [] as string[], // Multi-select de datas
    data_retorno: [] as string[], // Multi-select de datas
    falta_assinatura: [] as string[],
    publicacao: [] as string[],
    vigencia: [] as string[],
    encaminhado_em: [] as string[], // Multi-select de datas
    concluida_em: [] as string[], // Multi-select de datas
    parlamentar: [] as string[],
    partido: [] as string[],
    regional: [] as string[],
    municipio: [] as string[],
    conveniado: [] as string[],
    objeto: [] as string[],
  });

  // Estado para opções dos filtros fixos
  const [filterOptions, setFilterOptions] = useState<any>({});

  // Estado para rastrear qual filtro tem "Ocultar Vazios" ativado
  const [hideEmptyFields, setHideEmptyFields] = useState<{ [key: string]: boolean }>({});
  // Estado para rastrear qual filtro tem "Mostrar Somente Vazias" ativado
  const [showOnlyEmptyFields, setShowOnlyEmptyFields] = useState<{ [key: string]: boolean }>({});
  // Estado para ocultar demandas concluídas (padrão true para usuário comum)
  const [hideConcluidas, setHideConcluidas] = useState(false);
  // Estado para larguras de colunas (redimensionamento estilo Excel)
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const resizingColRef = useRef<string | null>(null);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(0);

  // Estado do filtro de cabeçalho Excel-like
  const [headerFilterOpen, setHeaderFilterOpen] = useState<string | null>(null);
  const [headerFilterSearch, setHeaderFilterSearch] = useState('');
  const [columnTextFilters, setColumnTextFilters] = useState<{ [key: string]: string }>({});
  // Filtros multi-select para colunas sem filterOptions do servidor
  const [headerFilters, setHeaderFilters] = useState<Record<string, string[]>>({});
  const headerFilterRef = useRef<HTMLDivElement>(null);

  // Fechar filtro de cabeçalho ao clicar fora
  useEffect(() => {
    if (!headerFilterOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (headerFilterRef.current && !headerFilterRef.current.contains(event.target as Node)) {
        setHeaderFilterOpen(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    encaminhado_em: 'encaminhado_em', concluida_em: 'concluida_em'
  };

  // Helper: obter opções de filtro para uma coluna (CASCATA - filtra dados pelos OUTROS filtros ativos)
  const getColumnFilterOptions = (colKey: string): string[] => {
    const cache = allDataCacheRef.current || [];
    if (cache.length === 0) return [];

    // Aplicar TODOS os outros filtros ativos (exceto o da coluna atual) para cascata
    const dataField = columnToDataField[colKey] || colKey;
    const currentFilterKey = columnToFilterKey[colKey];

    const filteredData = cache.filter((f: any) => {
      // Verificar filtros do state 'filters' (exceto o da coluna atual)
      for (const [fk, fv] of Object.entries(filters)) {
        if (fk === currentFilterKey) continue; // pular o filtro da coluna atual
        if (!Array.isArray(fv) || fv.length === 0) continue;
        const fieldVal = String(f[fk] || '').toLowerCase().trim();
        if (!fv.some((v: string) => fieldVal.includes(v.toLowerCase().trim()))) return false;
      }
      // Verificar headerFilters (exceto o da coluna atual)
      for (const [hk, hv] of Object.entries(headerFilters)) {
        if (hk === colKey) continue;
        if (!hv || hv.length === 0) continue;
        const hField = columnToDataField[hk] || hk;
        const fieldVal = String(f[hField] || '').trim();
        if (!hv.some(sv => fieldVal.toLowerCase().includes(sv.toLowerCase()))) return false;
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
        const match = ['parlamentar','conveniado','objeto','demanda','demandas_formalizacao','tecnico','emenda','regional','municipio','num_convenio','area_estagio','area_estagio_situacao_demanda','conferencista']
          .some(k => (f[k] && String(f[k]).toLowerCase().includes(s)));
        if (!match) return false;
      }
      return true;
    });

    const unique = new Set<string>();
    for (let i = 0; i < filteredData.length; i++) {
      const val = filteredData[i][dataField];
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
    demandas_formalizacao: 'demandas_formalizacao', numero_convenio: 'num_convenio',
    classificacao_emenda_demanda: 'classificacao', tipo_formalizacao: 'tipo_formalizacao',
    regional: 'regional', municipio: 'municipio', conveniado: 'conveniado', objeto: 'objeto',
    portfolio: 'portfolio', valor: 'valor', posicao_anterior: 'posicao_anterior',
    situacao_demandas_sempapel: 'situacao_demandas_sempapel', area_estagio: 'area_estagio',
    recurso: 'recurso', tecnico: 'tecnico', data_liberacao: 'data_liberacao',
    area_estagio_situacao_demanda: 'area_estagio_situacao_demanda',
    situacao_analise_demanda: 'situacao_analise_demanda', data_analise_demanda: 'data_analise_demanda',
    motivo_retorno_diligencia: 'motivo_retorno_diligencia',
    data_retorno_diligencia: 'data_retorno_diligencia', conferencista: 'conferencista',
    data_recebimento_demanda: 'data_recebimento_demanda', data_retorno: 'data_retorno',
    observacao_motivo_retorno: 'observacao_motivo_retorno',
    data_liberacao_assinatura_conferencista: 'data_liberacao_assinatura_conferencista',
    data_liberacao_assinatura: 'data_liberacao_assinatura', falta_assinatura: 'falta_assinatura',
    assinatura: 'assinatura', publicacao: 'publicacao', vigencia: 'vigencia',
    encaminhado_em: 'encaminhado_em', concluida_em: 'concluida_em'
  };

  // Estado para seleção múltipla de linhas
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  
  // Estado para modal de atribuição de técnico
  const [showAtribuirTecnicoModal, setShowAtribuirTecnicoModal] = useState(false);
  const [atribuicaoTecnico, setAtribuicaoTecnico] = useState<{id: number, nome: string} | null>(null);
  const [atribuindoTecnico, setAtribuindoTecnico] = useState(false);
  const [tecnicosDisponiveis, setTecnicosDisponiveis] = useState<any[]>([]);

  // Estado para modal de atribuição de conferencista
  const [showAtribuirConferencistaModal, setShowAtribuirConferencistaModal] = useState(false);
  const [atribuicaoConferencista, setAtribuicaoConferencista] = useState<{id: number, nome: string} | null>(null);
  const [atribuindoConferencista, setAtribuindoConferencista] = useState(false);

  // Estado para modal de deletar formalizacao com senha
  const [showDeleteFormalizacaoModal, setShowDeleteFormalizacaoModal] = useState(false);
  const [formalizacaoParaDeletar, setFormalizacaoParaDeletar] = useState<any>(null);
  const [senhaParaDeletarFormalizacao, setSenhaParaDeletarFormalizacao] = useState('');

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
          setFilterOptions(data);
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
    if (!formalizacoes || formalizacoes.length === 0) return; // Só aplica se tem cache
    
    console.log('⚡ FILTROS MUDARAM - Aplicando instantaneamente (sem debounce)');
    setPaginaAtual(0);
    
    // Aplicar filtros IMEDIATAMENTE do cache em memória
    fetchFormalizacoesComFiltros(0);
  }, [filters, searchTerm, activeTab, hideEmptyFields, headerFilters]);

  // ⚡ NOVO: Carregar TUDO o cache quando aba de formalizações abre
  // Isto roda UMA ÚNICA VEZ quando activeTab muda para 'formalizacao'
  useEffect(() => {
    if (activeTab !== 'formalizacao') return;
    
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
  }, [filters, searchTerm, columnTextFilters, headerFilters]);

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
        posicao_anterior: false,
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
        concluida_em: true
      });
      setHideConcluidas(true); // Usuário comum: ocultar concluídas por padrão
      console.log('👤 Colunas ajustadas para usuário comum');
    } else if (user.role === 'admin') {
      // Administradores veem apenas colunas específicas
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
        posicao_anterior: false,
        situacao_demandas_sempapel: false,
        area_estagio: false,
        recurso: false,
        tecnico: true,
        data_liberacao: true,
        area_estagio_situacao_demanda: false,
        situacao_analise_demanda: false,
        data_analise_demanda: false,
        motivo_retorno_diligencia: false,
        data_retorno_diligencia: false,
        conferencista: true,
        data_recebimento_demanda: true,
        data_retorno: false,
        observacao_motivo_retorno: false,
        data_liberacao_assinatura_conferencista: false,
        data_liberacao_assinatura: false,
        falta_assinatura: true,
        assinatura: true,
        publicacao: true,
        vigencia: true,
        encaminhado_em: true,
        concluida_em: true
      });
      console.log('🔑 Colunas ajustadas para administrador');
    }
  }, [user]);

  // 🔔 Alertas para admin: demandas analisadas E conferidas
  // Persist seen IDs in localStorage so alerts survive page reloads
  const alertasVistosRef = useRef<Set<number>>(new Set<number>());
  const alertasInitRef = useRef(false);
  if (!alertasInitRef.current) {
    alertasInitRef.current = true;
    try {
      const saved = localStorage.getItem('alertas_vistos_ids');
      if (saved) { (JSON.parse(saved) as number[]).forEach(id => alertasVistosRef.current.add(id)); }
    } catch {}
  }
  const saveAlertasVistos = (ids: Set<number>) => {
    try { localStorage.setItem('alertas_vistos_ids', JSON.stringify([...ids])); } catch {}
  };
  useEffect(() => {
    if (!isAdmin || formalizacoes.length === 0) return;
    // Alertas: demandas com data_analise_demanda OU data_liberacao_assinatura_conferencista
    const comDatas = formalizacoes.filter(
      (f: Formalizacao) => f.data_analise_demanda || f.data_liberacao_assinatura_conferencista
    );
    const seenIds = alertasVistosRef.current;
    const novas = comDatas.filter((f: Formalizacao) => !seenIds.has(f.id));
    if (novas.length > 0) {
      setAdminAlertas(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const reallyNew = novas.filter(f => !existingIds.has(f.id));
        if (reallyNew.length === 0) return prev;
        return [...prev, ...reallyNew.map((f: Formalizacao) => {
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
        })];
      });
    }
  }, [formalizacoes, isAdmin]);

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
          const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { raw: false, defval: '' });
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

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isExcel = ['xls', 'xlsx', 'xml'].includes(ext);

    // Função que processa as rows já parseadas
    const processRows = async (rows: Record<string, string>[]) => {
      const mapped = rows.map(mapCsvRowToEmendas).filter((r): r is Record<string, any> => r !== null);
      const deduped = new Map<string, Record<string, any>>();
      for (const rec of mapped) deduped.set(String(rec.codigo_num), rec);
      const records = Array.from(deduped.values());
      if (records.length === 0) { setImportStatus('error'); setImportError('Nenhum registro válido encontrado no arquivo.'); return; }
      const totalBatches = Math.ceil(records.length / BATCH_SIZE);
      setImportTotal(records.length); setImportStatus('uploading');
      setImportMessage(`Enviando ${records.length} registros em ${totalBatches} lotes...`);
      let uploaded = 0;
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const bn = Math.floor(i / BATCH_SIZE) + 1;
        setImportMessage(`Lote ${bn}/${totalBatches} (${Math.min(i + BATCH_SIZE, records.length)}/${records.length})...`);
        try {
          const resp = await fetch('/api/admin/import-emendas', {
            method: 'POST', headers: { 'Authorization': `Bearer ${tk}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ records: batch }),
          });
          if (!resp.ok) { const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' })); setImportStatus('error'); setImportError(`Erro no lote ${bn}: ${err.error || resp.statusText}`); return; }
          uploaded += batch.length;
          setImportProgress(Math.round((uploaded / records.length) * 90));
        } catch (e: any) { setImportStatus('error'); setImportError(`Erro de rede no lote ${bn}: ${e.message}`); return; }
      }
      setImportStatus('syncing'); setImportProgress(92);
      setImportMessage('Sincronizando emendas com formalizações...');
      try {
        const syncResp = await fetch('/api/admin/sync-emendas', {
          method: 'POST', headers: { 'Authorization': `Bearer ${tk}`, 'Content-Type': 'application/json' },
        });
        if (!syncResp.ok) { const err = await syncResp.json().catch(() => ({ error: 'Erro desconhecido' })); setImportStatus('error'); setImportError(`Erro na sincronização: ${err.error || syncResp.statusText}`); return; }
        setImportProgress(100); setImportStatus('done');
        setImportMessage(`Importação concluída! ${records.length} emendas importadas e sincronizadas.`);
      } catch (e: any) { setImportStatus('error'); setImportError(`Erro de rede: ${e.message}`); }
    };

    if (isExcel) {
      try {
        setImportMessage(`Lendo arquivo ${ext.toUpperCase()}...`);
        const rows = await parseExcelFile(file);
        await processRows(rows);
      } catch (e: any) {
        setImportStatus('error'); setImportError(e.message);
      }
    } else {
      // CSV com PapaParse
      Papa.parse(file, {
        header: true, delimiter: ';', skipEmptyLines: true, encoding: 'UTF-8',
        complete: async (results) => {
          await processRows(results.data as Record<string, string>[]);
        },
        error: (err) => { setImportStatus('error'); setImportError(`Erro ao ler CSV: ${err.message}`); }
      });
    }
  };

  // Função para buscar formalizações com filtros do servidor
  // ⚡ TOTAL CACHE: Carrega TUDO (não há limite de batches)
  const fetchFormalizacoesComFiltros = async (page: number = 0, filtersParam?: any) => {
    try {
      setFormalizacaoSearchResult(prev => ({ ...prev, loading: true }));
      
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
        console.log(`🔄 Cache ${cacheExpirado ? 'EXPIRADO' : 'VAZIO'} - Carregando registros em paralelo...`);
        
        const batchSize = 1000;
        const PARALLEL_WAVES = 6; // 6 requests simultâneas
        const startTime = Date.now();
        let dataFetched: any[] = [];
        let totalEstimate = 38000; // estimativa inicial
        setRefreshProgress({ active: true, loaded: 0, total: totalEstimate, startTime });
        
        // Fase 1: primeira request para descobrir se há dados
        const firstResp = await fetch(`/api/formalizacao?limit=${batchSize}&offset=0`, { headers: getHeaders() });
        const firstBatch = firstResp.ok ? await firstResp.json() : [];
        if (!Array.isArray(firstBatch) || firstBatch.length === 0) {
          allData = [];
          setRefreshProgress(null);
        } else {
          dataFetched = [...firstBatch];
          setRefreshProgress(p => p ? { ...p, loaded: dataFetched.length } : null);
          
          if (firstBatch.length === batchSize) {
            // Fase 2: carregar restante em ondas paralelas
            let nextOffset = batchSize;
            let keepGoing = true;
            
            while (keepGoing) {
              const offsets = Array.from({ length: PARALLEL_WAVES }, (_, i) => nextOffset + i * batchSize);
              const promises = offsets.map(off =>
                fetch(`/api/formalizacao?limit=${batchSize}&offset=${off}`, { headers: getHeaders() })
                  .then(r => r.ok ? r.json() : [])
                  .then(d => ({ offset: off, data: Array.isArray(d) ? d : [] }))
                  .catch(() => ({ offset: off, data: [] as any[] }))
              );
              const results = await Promise.all(promises);
              results.sort((a, b) => a.offset - b.offset);
              
              for (const r of results) {
                if (r.data.length === 0) { keepGoing = false; break; }
                dataFetched = dataFetched.concat(r.data);
                if (r.data.length < batchSize) { keepGoing = false; break; }
              }
              
              setRefreshProgress(p => p ? { ...p, loaded: dataFetched.length, total: Math.max(p.total, dataFetched.length + batchSize) } : null);
              nextOffset += PARALLEL_WAVES * batchSize;
            }
          }
          
          allData = dataFetched;
        }
        
        const elapsed = Date.now() - startTime;
        console.log(`🎉 CARREGADOS ${allData.length} registros em ${elapsed}ms (paralelo)`);
        setRefreshProgress(p => p ? { ...p, loaded: allData.length, total: allData.length } : null);
        setTimeout(() => setRefreshProgress(null), 2000);
        
        // 💾 Atualizar cache global
        allDataCacheRef.current = allData;
        cacheTimestampRef.current = now;
        setFormalizacoes(allData);
        
        // 💾 Persistir em localStorage
        try {
          localStorage.setItem('formalizacoes_cache', JSON.stringify(allData));
          localStorage.setItem('formalizacoes_cache_time', String(now));
          console.log(`💾 Cache salvo em localStorage (${allData.length} registros)`);
        } catch (e) {
          console.warn(`⚠️ Erro ao salvar cache em localStorage:`, e);
        }
      } else {
        console.log(`⚡ Cache COMPLETO em memória: ${allData.length} registros`);
      }

      const hasActiveFilters = activeFilterCount > 0;
      
      if (hasActiveFilters) {
        console.log(`🔥 Aplicando ${activeFilterCount} filtro(s) CLIENTE-SIDE aos ${allData.length} registros...`);
      } else {
        console.log(`📄 Sem filtros: exibindo página ${page} de ${allData.length} registros`);
      }

      // Função auxiliar para comparação
      const matchesAllFilters = (f: any) => {
        const safeCompare = (fieldValue: any, filterValue: string): boolean => {
          if (!fieldValue) return false;
          const field = String(fieldValue).toLowerCase().trim();
          const filter = filterValue.toLowerCase().trim();
          return field.includes(filter);
        };

        const matchesAnyFilter = (fieldValue: any, filterValues: string[]): boolean => {
          if (!filterValues || filterValues.length === 0) return true;
          return filterValues.some(filterValue => safeCompare(fieldValue, filterValue));
        };

        // Verificar todos os filtros ativos
        if (Array.isArray(filtersToUse.ano) && filtersToUse.ano.length > 0) {
          const anoField = String(f.ano || '').trim();
          if (!filtersToUse.ano.includes(anoField)) return false;
        }

        if (Array.isArray(filtersToUse.demandas_formalizacao) && filtersToUse.demandas_formalizacao.length > 0) {
          if (!matchesAnyFilter(f.demandas_formalizacao, filtersToUse.demandas_formalizacao)) return false;
        }

        if (Array.isArray(filtersToUse.area_estagio) && filtersToUse.area_estagio.length > 0) {
          if (!matchesAnyFilter(f.area_estagio, filtersToUse.area_estagio)) return false;
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

        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const matchSearch = 
            (f.parlamentar && f.parlamentar.toLowerCase().includes(searchLower)) ||
            (f.conveniado && f.conveniado.toLowerCase().includes(searchLower)) ||
            (f.objeto && f.objeto.toLowerCase().includes(searchLower)) ||
            (f.demanda && String(f.demanda).toLowerCase().includes(searchLower)) ||
            (f.demandas_formalizacao && String(f.demandas_formalizacao).toLowerCase().includes(searchLower)) ||
            (f.tecnico && f.tecnico.toLowerCase().includes(searchLower)) ||
            (f.emenda && String(f.emenda).toLowerCase().includes(searchLower)) ||
            (f.regional && f.regional.toLowerCase().includes(searchLower)) ||
            (f.municipio && f.municipio.toLowerCase().includes(searchLower)) ||
            (f.num_convenio && String(f.num_convenio).toLowerCase().includes(searchLower)) ||
            (f.area_estagio && f.area_estagio.toLowerCase().includes(searchLower)) ||
            (f.area_estagio_situacao_demanda && f.area_estagio_situacao_demanda.toLowerCase().includes(searchLower)) ||
            (f.conferencista && f.conferencista.toLowerCase().includes(searchLower));
          if (!matchSearch) return false;
        }

        if (Array.isArray(filtersToUse.data_liberacao) && filtersToUse.data_liberacao.length > 0) {
          if (!matchesAnyFilter(f.data_liberacao, filtersToUse.data_liberacao)) return false;
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
        for (const [colKey, textValue] of Object.entries(columnTextFilters)) {
          if (!textValue || textValue.trim() === '') continue;
          const dataField = columnToDataField[colKey] || colKey;
          const fieldValue = String(f[dataField] || '').toLowerCase();
          if (!fieldValue.includes(textValue.toLowerCase().trim())) return false;
        }

        // Filtros multi-select de cabeçalho (colunas extras)
        for (const [colKey, selectedValues] of Object.entries(headerFilters)) {
          if (!selectedValues || selectedValues.length === 0) continue;
          const dataField = columnToDataField[colKey] || colKey;
          const fieldValue = String(f[dataField] || '').trim();
          if (!selectedValues.some(sv => fieldValue.toLowerCase().includes(sv.toLowerCase()))) return false;
        }

        return true;
      };

      // Aplicar filtros em modo cache
      let filteredData = allData.filter(matchesAllFilters);

      // 👤 Usuários comuns veem apenas demandas atribuídas a eles (técnico ou conferencista)
      if (isUsuario && user?.nome) {
        const nomeUsuario = user.nome.toLowerCase().trim();
        filteredData = filteredData.filter(f => {
          const tecnico = String(f.tecnico || '').toLowerCase().trim();
          const conferencista = String(f.conferencista || '').toLowerCase().trim();
          return tecnico === nomeUsuario || conferencista === nomeUsuario;
        });
      }
      
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

      // Aplicar "Ocultar Concluídas" para usuário comum
      if (hideConcluidas) {
        filteredData = filteredData.filter(f => {
          const concluida = String(f.concluida_em || '').trim();
          const publicacao = String(f.publicacao || '').trim();
          return (concluida === '' || concluida === '—') && (publicacao === '' || publicacao === '—');
        });
      }

      // Ordenação dos resultados filtrados ANTES de paginar
      const sortedData = sortData(filteredData, sortColumn, sortOrder);

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

      setFormalizacaoSearchResult(newState);
      setPaginaAtual(page);
    } catch (error) {
      console.error('❌ Erro ao filtrar formalizações:', error);
      setFormalizacaoSearchResult(prev => ({ ...prev, loading: false }));
    }
  };

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
      regional: [], municipio: [], conveniado: [], objeto: [],
    });
    setHeaderFilters({});
    setColumnTextFilters({});
    setSearchTerm('');
    setHideEmptyFields({});
    setShowOnlyEmptyFields({});
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

  // Auto-refresh periódico silencioso (a cada 5 minutos, preserva filtros)
  useEffect(() => {
    if (activeTab !== 'formalizacao') return;
    const interval = setInterval(() => {
      console.log('⏰ Auto-refresh periódico silencioso...');
      cacheTimestampRef.current = 0; // Invalida cache para forçar re-fetch na próxima aplicação de filtros
    }, CACHE_VALIDITY_MS);
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleSubmitFormalizacao = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = {};
    // Collect falta_assinatura checkboxes as comma-separated string
    const faltaAssinatura = formData.getAll('falta_assinatura');
    if (faltaAssinatura.length > 0) {
      data['falta_assinatura'] = faltaAssinatura.join(', ');
    } else {
      data['falta_assinatura'] = '';
    }
    formData.forEach((value, key) => {
      if (key === 'falta_assinatura') return; // already handled
      if (key.includes('valor')) {
        data[key] = value ? Number(value) : 0;
      } else {
        data[key] = value;
      }
    });

    try {
      const url = editingFormalizacao ? `/api/formalizacao/${editingFormalizacao.id}` : '/api/formalizacao';
      const method = editingFormalizacao ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Erro ao salvar:', response.status, errText);
        return;
      }

      // Atualização otimista: atualizar cache local imediatamente
      if (editingFormalizacao) {
        const serverData = await response.json().catch(() => null);
        const mergedData = serverData || { ...editingFormalizacao, ...data };
        const updateInList = (list: any[]) =>
          list.map((f: any) => f.id === editingFormalizacao.id ? { ...f, ...mergedData } : f);

        if (allDataCacheRef.current.length > 0) {
          allDataCacheRef.current = updateInList(allDataCacheRef.current);
        }
        setFormalizacoes(prev => updateInList(prev));
        setFormalizacaoSearchResult(prev => ({
          ...prev,
          data: updateInList(prev.data)
        }));
        if (selectedFormalizacao?.id === editingFormalizacao.id) {
          setSelectedFormalizacao(mergedData);
        }
      }

      setIsFormalizacaoFormOpen(false);
      setEditingFormalizacao(null);

      // Force background DB refresh to sync everything
      silentRefreshData();
    } catch (error) {
      console.error('Erro ao salvar formalização:', error);
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
        'numero_convenio': 'num_convenio',
        'classificacao_emenda_demanda': 'classificacao',
        'tipo_formalizacao': 'tipo_formalizacao',
        'regional': 'regional',
        'municipio': 'municipio',
        'conveniado': 'conveniado',
        'objeto': 'objeto',
        'portfolio': 'portfolio',
        'valor': 'valor',
        'posicao_anterior': 'posicao_anterior',
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
    <div className="min-h-screen bg-white text-black font-sans">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#1351B4] to-[#0C326F] sticky top-0 z-30 shadow-xl">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Left: Logo + Title + Nav Toolbar */}
            <div className="flex items-center gap-4">
              <img 
                src={logo1Img} 
                alt="Logo" 
                className="h-16 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="hidden md:flex flex-col">
                <h1 className="text-base font-bold text-white leading-tight">Controle de Formalização</h1>
                <span className="text-[11px] text-white/50">Gestão de Emendas e Convênios</span>
              </div>
              <div className="h-8 w-px bg-white/20 hidden md:block" />
              <nav className="hidden md:flex items-center gap-1 bg-white/10 p-0.5 rounded-lg">
                <button 
                  onClick={() => setActiveTab('formalizacao')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${activeTab === 'formalizacao' ? 'bg-white text-[#1351B4] shadow-sm' : 'text-white/90 hover:bg-white/20'}`}
                >
                  Formalização
                </button>
                {user?.role === 'admin' && (
                  <button 
                    onClick={() => setActiveTab('admin')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'admin' ? 'bg-white text-[#1351B4] shadow-sm' : 'text-white/90 hover:bg-white/20'}`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Dashboard
                  </button>
                )}
              </nav>
            </div>
            {/* Center Spacer */}
            <div className="flex-1" />

            {/* Center: Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              <input 
                type="text" 
                placeholder="Buscar demanda, técnico..." 
                className="pl-10 pr-4 py-1.5 bg-white/15 border border-white/30 text-white placeholder:text-white/50 focus:bg-white/25 focus:border-white/50 rounded-full text-xs w-72 transition-all outline-none backdrop-blur-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Right: Tools + User */}
            <div className="flex items-center gap-3">
              
              {/* 🔔 Admin Alert Bell */}
              {isAdmin && adminAlertas.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowAlertasDropdown(!showAlertasDropdown);
                      // Mark current alerts as seen when opening dropdown
                      if (!showAlertasDropdown && adminAlertas.length > 0) {
                        adminAlertas.forEach(a => alertasVistosRef.current.add(a.id));
                        saveAlertasVistos(alertasVistosRef.current);
                      }
                    }}
                    className="relative p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                    title="Alertas de demandas"
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-pulse">
                      {adminAlertas.length}
                    </span>
                  </button>
                  {showAlertasDropdown && (
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-sm font-bold text-[#1351B4]">Alertas</span>
                        <button
                          onClick={() => {
                            adminAlertas.forEach(a => alertasVistosRef.current.add(a.id));
                            saveAlertasVistos(alertasVistosRef.current);
                            setAdminAlertas([]);
                            setShowAlertasDropdown(false);
                          }}
                          className="text-[10px] text-gray-400 hover:text-red-500 font-semibold"
                        >
                          Limpar tudo
                        </button>
                      </div>
                      {adminAlertas.map(a => (
                        <div key={a.id} className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{a.tipo}</span>
                          </div>
                          <p className="text-xs text-gray-600">{a.descricao}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* User dropdown */}
              <div className="relative group">
                <div className="flex items-center gap-2 pl-2 border-l border-white/30 cursor-pointer hover:opacity-75 transition-opacity">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-white">{user?.nome}</p>
                    <p className="text-[10px] text-white/60 flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5" />
                      {user?.role === 'admin' && 'Administrador'}
                      {user?.role === 'intermediario' && 'Intermediário'}
                      {user?.role === 'usuario' && 'Usuário'}
                    </p>
                  </div>
                  <button
                    onClick={() => logout()}
                    className="p-2 rounded-lg transition-colors text-white/80 hover:text-white hover:bg-white/20"
                    title="Sair"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Admin menu dropdown */}
                {isAdmin && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <button
                      onClick={() => {
                        setIsUserManagementOpen(true);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#1351B4] hover:bg-gray-50 flex items-center gap-2 first:rounded-t-xl border-b border-gray-100 font-bold"
                    >
                      <Users className="w-4 h-4" />
                      Gerenciar Usuários
                    </button>
                    <button
                      onClick={() => silentRefreshData()}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#1351B4] hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 font-bold transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Forçar Atualização BD
                    </button>
                    <button
                      onClick={() => setIsImportOpen(true)}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#1351B4] hover:bg-gray-50 flex items-center gap-2 last:rounded-b-xl font-bold transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Importar CSV Emendas
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-6">
        {supabaseStatus && !supabaseStatus.supabase && (
          <div className="bg-white border border-blue-200 p-4 rounded-2xl mb-8 flex items-start gap-4 shadow-sm">
            <div className="bg-blue-100 p-2 rounded-lg">
              <AlertCircle className="text-blue-700 w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-900">Supabase não configurado</h4>
              <p className="text-xs text-red-800 mt-1 leading-relaxed">
                O sistema está operando em modo offline (SQLite). Para salvar os dados na nuvem, configure as Secrets 
                <code className="bg-blue-100 px-1 rounded mx-1 font-mono">SUPABASE_URL</code> e 
                <code className="bg-blue-100 px-1 rounded mx-1 font-mono">SUPABASE_ANON_KEY</code> no AI Studio.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {/* List Section - Full Width */}
          <div className="w-full">
            <div className="flex items-center justify-end gap-2 mb-2">
                {activeTab === 'formalizacao' && (
                  <>
                    {/* Botão Atribuir a Técnico - aparece quando há seleção */}
                    {selectedRows.size > 0 && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => setShowAtribuirTecnicoModal(true)}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 bg-yellow-200 text-yellow-900 hover:bg-yellow-300 border border-yellow-600"
                      >
                        <User className="w-4 h-4" />
                        Atribuir a Técnico ({selectedRows.size})
                      </motion.button>
                    )}
                    {/* Botão Atribuir a Conferencista - aparece quando há seleção */}
                    {selectedRows.size > 0 && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => setShowAtribuirConferencistaModal(true)}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 bg-green-200 text-green-900 hover:bg-green-300 border border-green-600"
                      >
                        <User className="w-4 h-4" />
                        Atribuir a Conferencista ({selectedRows.size})
                      </motion.button>
                    )}
                    {/* Botão Limpar Todos os Filtros */}
                    <button
                      onClick={() => clearAllFilters()}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 bg-white text-red-600 border border-red-300 hover:bg-red-50 hover:border-red-500"
                      title="Limpar todos os filtros"
                    >
                      <X className="w-4 h-4" />
                      Limpar Filtros
                    </button>
                    <button
                      onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                      className={`relative px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                        isColumnMenuOpen ? 'bg-[#1351B4] text-white border-2 border-[#1351B4]' : 'bg-white text-gray-700 border border-gray-300 hover:border-[#1351B4] hover:text-[#1351B4]'
                      }`}
                    >
                      <Settings className="w-4 h-4" />
                      Colunas
                      <span className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded ${
                        isColumnMenuOpen ? 'bg-white text-[#1351B4]' : 'bg-[#1351B4] text-white'
                      }`}>
                        {Object.values(visibleColumns).filter(Boolean).length}/{Object.keys(visibleColumns).length}
                      </span>
                      
                      {isColumnMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl p-3 z-50 min-w-64 max-h-96 overflow-y-auto"
                             onClick={(e) => e.stopPropagation()}>
                          <p className="text-xs font-bold mb-2 uppercase sticky top-0 bg-white pb-2 text-[#1351B4]">Mostrar/Ocultar Colunas</p>
                          <div className="space-y-2">
                            {[
                              { key: 'seq', label: 'Seq' },
                              { key: 'ano', label: 'Ano' },
                              { key: 'parlamentar', label: 'Parlamentar' },
                              { key: 'partido', label: 'Partido' },
                              { key: 'emenda', label: 'Emenda' },
                              { key: 'emendas_agregadoras', label: 'Emendas Agregadoras' },
                              { key: 'demanda', label: 'Demanda' },
                              { key: 'demandas_formalizacao', label: 'Demandas Formalização' },
                              { key: 'numero_convenio', label: 'Nº Convênio' },
                              { key: 'classificacao_emenda_demanda', label: 'Classificação' },
                              { key: 'tipo_formalizacao', label: 'Tipo Formalização' },
                              { key: 'regional', label: 'Regional' },
                              { key: 'municipio', label: 'Município' },
                              { key: 'conveniado', label: 'Conveniado' },
                              { key: 'objeto', label: 'Objeto' },
                              { key: 'portfolio', label: 'Portfólio' },
                              { key: 'valor', label: 'Valor' },
                              { key: 'posicao_anterior', label: 'Posição Anterior' },
                              { key: 'situacao_demandas_sempapel', label: 'Situação SemPapel' },
                              { key: 'area_estagio', label: 'Área - Estágio' },
                              { key: 'recurso', label: 'Recurso' },
                              { key: 'tecnico', label: 'Técnico' },
                              { key: 'data_liberacao', label: 'Data Liberação' },
                              { key: 'area_estagio_situacao_demanda', label: 'Área - Situação' },
                              { key: 'situacao_analise_demanda', label: 'Situação Análise' },
                              { key: 'data_analise_demanda', label: 'Data Análise' },
                              { key: 'motivo_retorno_diligencia', label: 'Motivo Retorno' },
                              { key: 'data_retorno_diligencia', label: 'Data Retorno Dilig.' },
                              { key: 'conferencista', label: 'Conferencista' },
                              { key: 'data_recebimento_demanda', label: 'Data Recebimento' },
                              { key: 'data_retorno', label: 'Data Retorno' },
                              { key: 'observacao_motivo_retorno', label: 'Observações' },
                              { key: 'data_liberacao_assinatura_conferencista', label: 'Data Lib. Assit. Conf.' },
                              { key: 'data_liberacao_assinatura', label: 'Data Lib. Assinatura' },
                              { key: 'falta_assinatura', label: 'Falta Assinatura' },
                              { key: 'assinatura', label: 'Assinatura' },
                              { key: 'publicacao', label: 'Publicação' },
                              { key: 'vigencia', label: 'Vigência' },
                              { key: 'encaminhado_em', label: 'Encaminhado em' },
                              { key: 'concluida_em', label: 'Concluída em' }
                            ].map(col => (
                              <label key={col.key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={visibleColumns[col.key as keyof typeof visibleColumns]}
                                  onChange={(e) => {
                                    console.log(`🔄 Coluna ${col.key}: ${e.target.checked}`);
                                    setVisibleColumns({
                                      ...visibleColumns,
                                      [col.key]: e.target.checked
                                    });
                                  }}
                                  className="w-3 h-3 rounded border-gray-400 accent-[#1351B4] cursor-pointer"
                                />
                                <span className="text-xs text-gray-700">{col.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </button>
                  </>
                )}
            </div>

            {/* Filtros Avançados de Formalização - Multi-select com busca */}
            {activeTab === 'formalizacao' && isFilterOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-gray-900">Filtros Avançados</h3>
                  <button
                    onClick={() => setIsFilterOpen(false)}
                    className="p-1.5 rounded-lg transition-colors text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Fechar filtros"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Ano - Multi-Select */}
                  <MultiSelectFilter
                    label="Ano"
                    options={filterOptions.ano || []}
                    selectedValues={filters.ano}
                    onSelectionChange={(values) => setFilters({ ...filters, ano: values })}
                    searchPlaceholder="Buscar ano..."
                    hideEmpty={hideEmptyFields.ano || false}
                    onHideEmptyChange={(hide) => setHideEmptyFields({ ...hideEmptyFields, ano: hide })}
                  />

                  {/* Nº Demanda - Multi-Select */}
                  <MultiSelectFilter
                    label="Nº Demanda"
                    options={filterOptions.demandas_formalizacao || []}
                    selectedValues={filters.demandas_formalizacao}
                    onSelectionChange={(values) => setFilters({ ...filters, demandas_formalizacao: values })}
                    searchPlaceholder="Buscar demanda..."
                    hideEmpty={hideEmptyFields.demandas_formalizacao || false}
                    onHideEmptyChange={(hide) => setHideEmptyFields({ ...hideEmptyFields, demandas_formalizacao: hide })}
                  />

                  {/* Área - Estágio - Multi-Select */}
                  <MultiSelectFilter
                    label="Área - Estágio"
                    options={filterOptions.area_estagio || []}
                    selectedValues={filters.area_estagio}
                    onSelectionChange={(values) => setFilters({ ...filters, area_estagio: values })}
                    searchPlaceholder="Buscar área..."
                    hideEmpty={hideEmptyFields.area_estagio || false}
                    onHideEmptyChange={(hide) => setHideEmptyFields({ ...hideEmptyFields, area_estagio: hide })}
                  />

                  {/* Recurso - Multi-Select */}
                  <MultiSelectFilter
                    label="Recurso"
                    options={filterOptions.recurso || []}
                    selectedValues={filters.recurso}
                    onSelectionChange={(values) => setFilters({ ...filters, recurso: values })}
                    searchPlaceholder="Buscar recurso..."
                    hideEmpty={hideEmptyFields.recurso || false}
                    onHideEmptyChange={(hide) => setHideEmptyFields({ ...hideEmptyFields, recurso: hide })}
                  />

                  {/* Técnico - Multi-Select */}
                  <MultiSelectFilter
                    label="Técnico"
                    options={filterOptions.tecnico || []}
                    selectedValues={filters.tecnico}
                    onSelectionChange={(values) => setFilters({ ...filters, tecnico: values })}
                    searchPlaceholder="Buscar técnico..."
                    hideEmpty={hideEmptyFields.tecnico || false}
                    onHideEmptyChange={(hide) => setHideEmptyFields({ ...hideEmptyFields, tecnico: hide })}
                  />

                  {/* Parlamentar - Multi-Select */}
                  <MultiSelectFilter
                    label="Parlamentar"
                    options={filterOptions.parlamentar || []}
                    selectedValues={filters.parlamentar}
                    onSelectionChange={(values) => setFilters({ ...filters, parlamentar: values })}
                    searchPlaceholder="Buscar parlamentar..."
                    hideEmpty={hideEmptyFields.parlamentar || false}
                    onHideEmptyChange={(hide) => setHideEmptyFields({ ...hideEmptyFields, parlamentar: hide })}
                  />

                  {/* Partido - Multi-Select */}
                  <MultiSelectFilter
                    label="Partido"
                    options={filterOptions.partido || []}
                    selectedValues={filters.partido}
                    onSelectionChange={(values) => setFilters({ ...filters, partido: values })}
                    searchPlaceholder="Buscar partido..."
                    hideEmpty={hideEmptyFields.partido || false}
                    onHideEmptyChange={(hide) => setHideEmptyFields({ ...hideEmptyFields, partido: hide })}
                  />

                  {/* Regional - Multi-Select */}
                  <MultiSelectFilter
                    label="Regional"
                    options={filterOptions.regional || []}
                    selectedValues={filters.regional}
                    onSelectionChange={(values) => setFilters({ ...filters, regional: values })}
                    searchPlaceholder="Buscar regional..."
                    hideEmpty={hideEmptyFields.regional || false}
                    onHideEmptyChange={(hide) => setHideEmptyFields({ ...hideEmptyFields, regional: hide })}
                  />

                  {/* Município - Multi-Select */}
                  <MultiSelectFilter
                    label="Município"
                    options={filterOptions.municipio || []}
                    selectedValues={filters.municipio}
                    onSelectionChange={(values) => setFilters({ ...filters, municipio: values })}
                    searchPlaceholder="Buscar município..."
                    hideEmpty={hideEmptyFields.municipio || false}
                    onHideEmptyChange={(hide) => setHideEmptyFields({ ...hideEmptyFields, municipio: hide })}
                  />

                  {/* Conveniado - Multi-Select */}
                  <MultiSelectFilter
                    label="Conveniado"
                    options={filterOptions.conveniado || []}
                    selectedValues={filters.conveniado}
                    onSelectionChange={(values) => setFilters({ ...filters, conveniado: values })}
                    searchPlaceholder="Buscar conveniado..."
                    hideEmpty={hideEmptyFields.conveniado || false}
                    onHideEmptyChange={(hide) => setHideEmptyFields({ ...hideEmptyFields, conveniado: hide })}
                  />

                  {/* Objeto - Multi-Select */}
                  <MultiSelectFilter
                    label="Objeto"
                    options={filterOptions.objeto || []}
                    selectedValues={filters.objeto}
                    onSelectionChange={(values) => setFilters({ ...filters, objeto: values })}
                    searchPlaceholder="Buscar objeto..."
                    hideEmpty={hideEmptyFields.objeto || false}
                    onHideEmptyChange={(hide) => setHideEmptyFields({ ...hideEmptyFields, objeto: hide })}
                  />

                  {/* Situação Demanda - Multi-Select */}
                  <MultiSelectFilter
                    label="Situação Demanda"
                    options={filterOptions.situacao_analise_demanda || []}
                    selectedValues={filters.situacao_analise_demanda}
                    onSelectionChange={(values) => setFilters({ ...filters, situacao_analise_demanda: values })}
                    searchPlaceholder="Buscar situação..."
                    hideEmpty={hideEmptyFields.situacao_analise_demanda || false}
                    onHideEmptyChange={(hide) => setHideEmptyFields({ ...hideEmptyFields, situacao_analise_demanda: hide })}
                  />

                  {/* Conferencista - Multi-Select */}
                  <MultiSelectFilter
                    label="Conferencista"
                    options={filterOptions.conferencista || []}
                    selectedValues={filters.conferencista}
                    onSelectionChange={(values) => setFilters({ ...filters, conferencista: values })}
                    searchPlaceholder="Buscar conferencista..."
                    hideEmpty={hideEmptyFields.conferencista || false}
                    onHideEmptyChange={(hide) => setHideEmptyFields({ ...hideEmptyFields, conferencista: hide })}
                  />

                  {/* Situação Área/Estágio - Multi-Select */}
                  <MultiSelectFilter
                    label="Situação Área/Estágio"
                    options={filterOptions.area_estagio_situacao_demanda || []}
                    selectedValues={filters.area_estagio_situacao_demanda}
                    onSelectionChange={(values) => setFilters({ ...filters, area_estagio_situacao_demanda: values })}
                    searchPlaceholder="Buscar situação..."
                    hideEmpty={hideEmptyFields.area_estagio_situacao_demanda || false}
                    onHideEmptyChange={(hide) => setHideEmptyFields({ ...hideEmptyFields, area_estagio_situacao_demanda: hide })}
                  />

                  {/* Falta Assinatura - Multi-Select */}
                  <MultiSelectFilter
                    label="Falta Assinatura"
                    options={filterOptions.falta_assinatura || []}
                    selectedValues={filters.falta_assinatura}
                    onSelectionChange={(values) => setFilters({ ...filters, falta_assinatura: values })}
                    searchPlaceholder="Buscar assinatura..."
                    hideEmpty={hideEmptyFields.falta_assinatura || false}
                    onHideEmptyChange={(hide) => setHideEmptyFields({ ...hideEmptyFields, falta_assinatura: hide })}
                  />

                  {/* Publicação - Multi-Select */}
                  <MultiSelectFilter
                    label="Publicação"
                    options={filterOptions.publicacao || []}
                    selectedValues={filters.publicacao}
                    onSelectionChange={(values) => setFilters({ ...filters, publicacao: values })}
                    searchPlaceholder="Buscar publicação..."
                    hideEmpty={hideEmptyFields.publicacao || false}
                    onHideEmptyChange={(hide) => setHideEmptyFields({ ...hideEmptyFields, publicacao: hide })}
                  />

                  {/* Vigência - Multi-Select */}
                  <MultiSelectFilter
                    label="Vigência"
                    options={filterOptions.vigencia || []}
                    selectedValues={filters.vigencia}
                    onSelectionChange={(values) => setFilters({ ...filters, vigencia: values })}
                    searchPlaceholder="Buscar vigência..."
                    hideEmpty={hideEmptyFields.vigencia || false}
                    onHideEmptyChange={(hide) => setHideEmptyFields({ ...hideEmptyFields, vigencia: hide })}
                  />

                  {/* Data da Liberação */}
                  <MultiSelectDateFilter
                    label="Data Liberação"
                    options={filterOptions.data_liberacao || []}
                    selectedValues={filters.data_liberacao}
                    onSelectionChange={(values) => setFilters({...filters, data_liberacao: values})}
                    hideEmpty={hideEmptyFields.data_liberacao || false}
                    onHideEmptyChange={(hide) => setHideEmptyFields({ ...hideEmptyFields, data_liberacao: hide })}
                  />

                  {/* Data Análise */}
                  <MultiSelectDateFilter
                    label="Data Análise"
                    options={filterOptions.data_analise_demanda || []}
                    selectedValues={filters.data_analise_demanda}
                    onSelectionChange={(values) => setFilters({...filters, data_analise_demanda: values})}
                    hideEmpty={hideEmptyFields.data_analise_demanda || false}
                    onHideEmptyChange={(hide) => setHideEmptyFields({ ...hideEmptyFields, data_analise_demanda: hide })}
                  />

                  {/* Data Recebimento */}
                  <MultiSelectDateFilter
                    label="Data Recebimento"
                    options={filterOptions.data_recebimento_demanda || []}
                    selectedValues={filters.data_recebimento_demanda}
                    onSelectionChange={(values) => setFilters({...filters, data_recebimento_demanda: values})}
                    hideEmpty={hideEmptyFields.data_recebimento_demanda || false}
                    onHideEmptyChange={(hide) => setHideEmptyFields({ ...hideEmptyFields, data_recebimento_demanda: hide })}
                  />

                  {/* Data Retorno */}
                  <MultiSelectDateFilter
                    label="Data Retorno"
                    options={filterOptions.data_retorno || []}
                    selectedValues={filters.data_retorno}
                    onSelectionChange={(values) => setFilters({...filters, data_retorno: values})}
                    hideEmpty={hideEmptyFields.data_retorno || false}
                    onHideEmptyChange={(hide) => setHideEmptyFields({ ...hideEmptyFields, data_retorno: hide })}
                  />

                  {/* Encaminhado Em */}
                  <MultiSelectDateFilter
                    label="Encaminhado"
                    options={filterOptions.encaminhado_em || []}
                    selectedValues={filters.encaminhado_em}
                    onSelectionChange={(values) => setFilters({...filters, encaminhado_em: values})}
                    hideEmpty={hideEmptyFields.encaminhado_em || false}
                    onHideEmptyChange={(hide) => setHideEmptyFields({ ...hideEmptyFields, encaminhado_em: hide })}
                  />

                  {/* Concluída Em */}
                  <MultiSelectDateFilter
                    label="Concluída"
                    options={filterOptions.concluida_em || []}
                    selectedValues={filters.concluida_em}
                    onSelectionChange={(values) => setFilters({...filters, concluida_em: values})}
                    hideEmpty={hideEmptyFields.concluida_em || false}
                    onHideEmptyChange={(hide) => setHideEmptyFields({ ...hideEmptyFields, concluida_em: hide })}
                  />
                </div>

                {/* Botão Limpar Filtros */}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => clearAllFilters()}
                    className="px-4 py-2 text-sm font-bold text-white rounded-lg transition-all border border-[#1351B4] bg-[#1351B4] hover:bg-[#0C326F]"
                  >
                    Limpar Filtros
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'admin' ? (
              <AdminPanel />
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
              <div className="space-y-2">
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    {/* Compact Pagination Bar */}
                    {activeTab === 'formalizacao' && totalPaginas > 1 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex-wrap">
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
                                key={`page-top-${pagina}`}
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
                          Pág. {paginaAtual + 1}/{totalPaginas} · {formalizacaoSearchResult.total.toLocaleString('pt-BR')} registros
                        </span>
                      </div>
                    )}
                    
                    {/* Toggle Ocultar Concluídas */}
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 border-b border-gray-200">
                      <label className="flex items-center gap-1.5 text-[11px] cursor-pointer hover:bg-gray-100 px-2 py-0.5 rounded">
                        <input
                          type="checkbox"
                          checked={hideConcluidas}
                          onChange={(e) => {
                            setHideConcluidas(e.target.checked);
                            fetchFormalizacoesComFiltros(0);
                          }}
                          className="rounded cursor-pointer accent-[#1351B4] w-3 h-3"
                        />
                        <span className="text-gray-600 font-medium">Ocultar Concluídas/Publicadas</span>
                      </label>
                      {Object.keys(columnWidths).length > 0 && (
                        <button
                          onClick={() => setColumnWidths({})}
                          className="text-[10px] text-[#1351B4] hover:underline ml-auto"
                        >
                          Resetar larguras
                        </button>
                      )}
                    </div>

                    <div 
                      ref={tableContainerRef}
                      onMouseDown={handleTableMouseDown}
                      onMouseMove={handleTableMouseMove}
                      onMouseUp={handleTableMouseUp}
                      onMouseLeave={handleTableMouseLeave}
                      className={`overflow-x-auto bg-white select-none user-select-none ${isDraggingScroll ? 'cursor-grabbing' : 'cursor-grab'}`}
                      style={{ WebkitUserSelect: 'none', userSelect: 'none', minHeight: '400px' }}
                    >
                      {(() => {
                        const columnDefinitions = [
                          { key: 'seq', label: 'Seq', render: (f: any) => '—' },
                          { key: 'ano', label: 'Ano', render: (f: any) => f.ano },
                          { key: 'parlamentar', label: 'Parlamentar', render: (f: any) => f.parlamentar },
                          { key: 'partido', label: 'Partido', render: (f: any) => f.partido },
                          { key: 'emenda', label: 'Emenda', render: (f: any) => formatEmendaNumber(f.emenda) },
                          { key: 'emendas_agregadoras', label: 'Emendas Agregadoras', render: (f: any) => f.emendas_agregadoras },
                          { key: 'demanda', label: 'Demanda', render: (f: any) => f.demanda },
                          { key: 'demandas_formalizacao', label: 'Demandas Formalização', render: (f: any) => f.demandas_formalizacao },
                          { key: 'numero_convenio', label: 'Nº Convênio', render: (f: any) => f.num_convenio },
                          { key: 'classificacao_emenda_demanda', label: 'Classificação', render: (f: any) => f.classificacao },
                          { key: 'tipo_formalizacao', label: 'Tipo Formalização', render: (f: any) => f.tipo_formalizacao },
                          { key: 'regional', label: 'Regional', render: (f: any) => f.regional },
                          { key: 'municipio', label: 'Município', render: (f: any) => f.municipio },
                          { key: 'conveniado', label: 'Conveniado', render: (f: any) => f.conveniado },
                          { key: 'objeto', label: 'Objeto', render: (f: any) => f.objeto },
                          { key: 'portfolio', label: 'Portfólio', render: (f: any) => f.portfolio },
                          { key: 'valor', label: 'Valor', render: (f: any) => formatCurrency(f.valor), align: 'right' },
                          { key: 'posicao_anterior', label: 'Posição Anterior', render: (f: any) => f.posicao_anterior },
                          { key: 'situacao_demandas_sempapel', label: 'Situação SemPapel', render: (f: any) => f.situacao_demandas_sempapel },
                          { key: 'area_estagio', label: 'Área - Estágio', render: (f: any) => f.area_estagio },
                          { key: 'recurso', label: 'Recurso', render: (f: any) => f.recurso },
                          { key: 'tecnico', label: 'Técnico', render: (f: any) => f.tecnico || '—' },
                          { key: 'data_liberacao', label: 'Data Liberação', render: (f: any) => formatDateForDisplay(f.data_liberacao || '—') },
                          { key: 'area_estagio_situacao_demanda', label: 'Área - Situação', render: (f: any) => f.area_estagio_situacao_demanda },
                          { key: 'situacao_analise_demanda', label: 'Situação Análise', render: (f: any) => f.situacao_analise_demanda },
                          { key: 'data_analise_demanda', label: 'Data Análise', render: (f: any) => formatDateForDisplay(f.data_analise_demanda || '—') },
                          { key: 'motivo_retorno_diligencia', label: 'Motivo Retorno', render: (f: any) => f.motivo_retorno_diligencia },
                          { key: 'data_retorno_diligencia', label: 'Data Retorno Dilig.', render: (f: any) => formatDateForDisplay(f.data_retorno_diligencia || '—') },
                          { key: 'conferencista', label: 'Conferencista', render: (f: any) => f.conferencista },
                          { key: 'data_recebimento_demanda', label: 'Data Recebimento', render: (f: any) => formatDateForDisplay(f.data_recebimento_demanda || '—') },
                          { key: 'data_retorno', label: 'Data Retorno', render: (f: any) => formatDateForDisplay(f.data_retorno || '—') },
                          { key: 'observacao_motivo_retorno', label: 'Observações', render: (f: any) => f.observacao_motivo_retorno },
                          { key: 'data_liberacao_assinatura_conferencista', label: 'Data Lib. Assit. Conf.', render: (f: any) => formatDateForDisplay(f.data_liberacao_assinatura_conferencista || '—') },
                          { key: 'data_liberacao_assinatura', label: 'Data Lib. Assinatura', render: (f: any) => formatDateForDisplay(f.data_liberacao_assinatura || '—') },
                          { key: 'falta_assinatura', label: 'Falta Assinatura', render: (f: any) => f.falta_assinatura },
                          { key: 'assinatura', label: 'Assinatura', render: (f: any) => formatDateForDisplay(f.assinatura || '—') },
                          { key: 'publicacao', label: 'Publicação', render: (f: any) => formatDateForDisplay(f.publicacao || '—') },
                          { key: 'vigencia', label: 'Vigência', render: (f: any) => formatDateForDisplay(f.vigencia || '—') },
                          { key: 'encaminhado_em', label: 'Encaminhado em', render: (f: any) => formatDateForDisplay(f.encaminhado_em || '—') },
                          { key: 'concluida_em', label: 'Concluída em', render: (f: any) => formatDateForDisplay(f.concluida_em || '—') }
                        ];
                        
                        const visibleCols = columnDefinitions.filter(col => visibleColumns[col.key as keyof typeof visibleColumns]);
                        return (
                          <table className="min-w-fit text-sm">
                            <thead className="bg-[#1351B4] sticky top-0 z-20">
                              <tr>
                                {/* Header do checkbox */}
                                <th className="px-3 py-1.5 w-12 bg-[#1351B4] align-middle">
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
                                {visibleCols.map(col => {
                                  const selectedVals = getColumnFilterValues(col.key);
                                  const hasActive = selectedVals.length > 0;
                                  const isOpen = headerFilterOpen === col.key;
                                  
                                  return (
                                    <th 
                                      key={col.key}
                                      ref={(el) => { if (el) columnHeaderRefs.current[col.key] = el; }}
                                      className={`px-2 py-1.5 text-left text-white text-xs whitespace-nowrap cursor-pointer transition-colors hover:bg-[#0C326F] relative ${
                                        col.align === 'right' ? 'text-right' : ''
                                      } ${sortColumn === col.key ? 'bg-[#0C326F]' : ''}`}
                                      style={{ minWidth: 70, width: columnWidths[col.key] || undefined }}
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
                                      {isOpen && (
                                        <div
                                          ref={headerFilterRef}
                                          className="absolute top-full left-0 z-[100] mt-1 w-60 bg-white rounded-lg shadow-2xl border border-gray-200"
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
                                              const options = getColumnFilterOptions(col.key);
                                              const searchVal = headerFilterSearch.toLowerCase();
                                              const filtered = options.filter(opt => {
                                                if (searchVal && !opt.toLowerCase().includes(searchVal)) return false;
                                                if (hideEmptyFields[col.key] && (!opt || opt.trim() === '' || opt === '—')) return false;
                                                return true;
                                              });
                                              if (filtered.length === 0) {
                                                return <div className="p-2 text-[10px] text-gray-400 text-center">Nenhuma opção</div>;
                                              }
                                              return filtered.slice(0, 300).map(opt => (
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
                                                  <span className="truncate">{opt || '(vazio)'}</span>
                                                </label>
                                              ));
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
                                      )}
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
                                      setSelectedFormalizacao(f);
                                    }}
                                    className={`cursor-pointer transition-all ${
                                      selectedFormalizacao?.id === f.id 
                                        ? 'bg-indigo-200 border-l-4 border-indigo-600' 
                                        : isRowSelected
                                        ? 'bg-amber-100 border-l-4 border-amber-500'
                                        : (f.publicacao && String(f.publicacao).trim() !== '' && String(f.publicacao).trim() !== '—') || (f.concluida_em && String(f.concluida_em).trim() !== '' && String(f.concluida_em).trim() !== '—')
                                        ? 'bg-emerald-50 border-l-4 border-emerald-500 hover:bg-emerald-100'
                                        : 'hover:bg-blue-50'
                                    }`}
                                  >
                                    {/* Checkbox para seleção */}
                                    <td className="px-3 py-1.5 w-12">
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
                                    {visibleCols.map(col => (
                                      <td 
                                        key={`${f.id}-${col.key}`}
                                        className={`px-3 py-1.5 truncate text-xs ${
                                          col.align === 'right' ? 'text-right font-semibold text-emerald-700' : 'text-slate-800'
                                        }`}
                                        style={{ backgroundColor: 'inherit', width: columnWidths[col.key] || undefined, maxWidth: columnWidths[col.key] || undefined }}
                                        title={String(col.render(f))}
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

          {/* Detail Modal Overlay */}
          <AnimatePresence>
            {activeTab === 'formalizacao' && selectedFormalizacao ? (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedFormalizacao(null)}
                  className="fixed inset-0 bg-black/40 z-40"
                />
                
                {/* Detail Panel Modal */}
                <motion.div
                  initial={{ x: '100%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '100%', opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="fixed right-0 top-0 bottom-0 z-50 w-full lg:w-1/2 bg-white shadow-2xl overflow-y-auto border-l border-slate-200"
                >
                    <div className="flex flex-col h-full bg-white">
                      {/* Header */}
                      <div className="bg-gradient-to-br from-[#1351B4] via-[#0F3D8C] to-[#0C326F] px-6 py-5 flex-shrink-0">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-1">Parlamentar</p>
                            <h2 className="text-xl font-extrabold text-white leading-tight tracking-tight">
                              {selectedFormalizacao.parlamentar || '—'}
                            </h2>
                            <div className="flex items-center gap-2 mt-2">
                              {selectedFormalizacao.partido && (
                                <span className="text-[10px] font-bold bg-white/15 text-white/90 px-2.5 py-1 rounded-full">{selectedFormalizacao.partido}</span>
                              )}
                              {selectedFormalizacao.municipio && (
                                <span className="text-[10px] font-medium text-white/60">{selectedFormalizacao.municipio}</span>
                              )}
                              {selectedFormalizacao.ano && (
                                <span className="text-[10px] font-bold bg-white/10 text-white/70 px-2 py-0.5 rounded">{selectedFormalizacao.ano}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0 ml-3">
                            <button 
                              onClick={() => {
                                setEditingFormalizacao(selectedFormalizacao);
                                setIsFormalizacaoFormOpen(true);
                              }}
                              className="p-2.5 text-white/70 hover:text-white hover:bg-white/15 rounded-xl transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteFormalizacao(selectedFormalizacao.id!)}
                              className="p-2.5 text-white/40 hover:text-red-300 hover:bg-white/10 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setSelectedFormalizacao(null)}
                              className="p-2.5 text-white/70 hover:text-white hover:bg-white/15 rounded-xl transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">

                    {/* Identificação e Objeto */}
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-5 rounded-full bg-[#1351B4]"></div>
                        <h4 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Identificação e Objeto</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <DetailItem label="Emenda" value={selectedFormalizacao.emenda} highlight />
                        <DetailItem label="Demanda" value={selectedFormalizacao.demanda} highlight />
                        <DetailItem label="Emendas Agregadoras" value={selectedFormalizacao.emendas_agregadoras} />
                        <DetailItem label="Demandas Formalização" value={selectedFormalizacao.demandas_formalizacao} />
                        <DetailItem label="Portfólio" value={selectedFormalizacao.portfolio} />
                        <DetailItem label="Classificação" value={selectedFormalizacao.classificacao} />
                      </div>
                      <div className="rounded-lg bg-gray-50/80 px-3.5 py-2.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Objeto</span>
                        <p className="text-[13px] font-semibold text-slate-800 mt-1 leading-relaxed">{selectedFormalizacao.objeto || '—'}</p>
                      </div>
                    </section>

                    {/* Localização e Convênio */}
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-5 rounded-full bg-teal-500"></div>
                        <h4 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Localização e Convênio</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <DetailItem label="Regional" value={selectedFormalizacao.regional} />
                        <DetailItem label="Município" value={selectedFormalizacao.municipio} />
                        <DetailItem label="Conveniado" value={selectedFormalizacao.conveniado} />
                        <DetailItem label="Nº Convênio" value={selectedFormalizacao.num_convenio} />
                        <DetailItem label="Tipo de Formalização" value={selectedFormalizacao.tipo_formalizacao} />
                      </div>
                    </section>

                    {/* Financeiro */}
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-5 rounded-full bg-emerald-500"></div>
                        <h4 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Financeiro</h4>
                      </div>
                      <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide">Valor Total</span>
                          <span className="text-xl font-extrabold text-emerald-800 tracking-tight">{formatCurrency(selectedFormalizacao.valor)}</span>
                        </div>
                        <div className="mt-3">
                          <DetailItem label="Recurso" value={selectedFormalizacao.recurso} />
                        </div>
                      </div>
                    </section>

                    {/* Estágio e Situação */}
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-5 rounded-full bg-amber-500"></div>
                        <h4 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Estágio e Situação</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <DetailItem label="Posição Anterior" value={selectedFormalizacao.posicao_anterior} />
                        <DetailItem label="Situação SemPapel" value={selectedFormalizacao.situacao_demandas_sempapel} />
                        <DetailItem label="Área - Estágio" value={selectedFormalizacao.area_estagio} />
                        <DetailItem label="Técnico" value={selectedFormalizacao.tecnico} highlight />
                        <DetailItem label="Data da Liberação" value={formatDateForDisplay(selectedFormalizacao.data_liberacao || '')} />
                        <DetailItem label="Área - Estágio Situação" value={selectedFormalizacao.area_estagio_situacao_demanda} />
                      </div>
                    </section>

                    {/* Análise e Diligência */}
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-5 rounded-full bg-violet-500"></div>
                        <h4 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Análise e Diligência</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <DetailItem label="Situação Análise" value={selectedFormalizacao.situacao_analise_demanda} />
                        <DetailItem label="Data Análise" value={formatDateForDisplay(selectedFormalizacao.data_analise_demanda || '')} />
                        <DetailItem label="Motivo Retorno Diligência" value={selectedFormalizacao.motivo_retorno_diligencia} />
                        <DetailItem label="Data Retorno Diligência" value={formatDateForDisplay(selectedFormalizacao.data_retorno_diligencia || '')} />
                      </div>
                    </section>

                    {/* Tramitação e Assinatura */}
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-5 rounded-full bg-rose-500"></div>
                        <h4 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Tramitação e Assinatura</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <DetailItem label="Conferencista" value={selectedFormalizacao.conferencista} highlight />
                        <DetailItem label="Data Recebimento" value={formatDateForDisplay(selectedFormalizacao.data_recebimento_demanda || '')} />
                        <DetailItem label="Data do Retorno" value={formatDateForDisplay(selectedFormalizacao.data_retorno || '')} />
                        <DetailItem label="Data Lib. Assinatura Conf." value={formatDateForDisplay(selectedFormalizacao.data_liberacao_assinatura_conferencista || '')} />
                        <DetailItem label="Data Lib. Assinatura" value={formatDateForDisplay(selectedFormalizacao.data_liberacao_assinatura || '')} />
                        <DetailItem label="Falta Assinatura" value={selectedFormalizacao.falta_assinatura} />
                        <DetailItem label="Assinatura" value={formatDateForDisplay(selectedFormalizacao.assinatura || '')} />
                      </div>
                    </section>

                    {/* Prazos e Conclusão */}
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-5 rounded-full bg-sky-500"></div>
                        <h4 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Prazos e Conclusão</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <DetailItem label="Publicação" value={formatDateForDisplay(selectedFormalizacao.publicacao || '')} />
                        <DetailItem label="Vigência" value={formatDateForDisplay(selectedFormalizacao.vigencia || '')} />
                        <DetailItem label="Encaminhado em" value={formatDateForDisplay(selectedFormalizacao.encaminhado_em || '')} />
                        <DetailItem label="Concluída em" value={formatDateForDisplay(selectedFormalizacao.concluida_em || '')} />
                      </div>
                    </section>

                    {/* Observações */}
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-5 rounded-full bg-slate-400"></div>
                        <h4 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Observações</h4>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <p className="text-[13px] text-slate-600 leading-relaxed">
                          {selectedFormalizacao.observacao_motivo_retorno || 'Nenhuma observação registrada.'}
                        </p>
                      </div>
                    </section>
                      </div>
                    </div>
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>
        </div>
      </main>

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
              <p className="text-sm text-slate-500 mb-4">Selecione o arquivo de emendas (<strong>CSV</strong>, <strong>XLS</strong>, <strong>XLSX</strong> ou <strong>XML</strong>). O sistema importará e sincronizará automaticamente.</p>

              <input ref={fileInputRef} type="file" accept=".csv,.xls,.xlsx,.xml" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportCSV(f); e.target.value = ''; }} />

              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => fileInputRef.current?.click()} disabled={importStatus === 'uploading' || importStatus === 'syncing' || importStatus === 'parsing'} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-400 text-white text-sm font-semibold rounded-lg px-5 py-2.5 transition-colors">
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
                <div className="flex items-center gap-5 text-xs text-slate-500">
                  <span className={`flex items-center gap-1 ${importStatus === 'parsing' ? 'text-violet-600 font-semibold' : importProgress > 0 ? 'text-green-600' : ''}`}>
                    {importProgress > 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5 animate-spin" />} Leitura
                  </span>
                  <span className={`flex items-center gap-1 ${importStatus === 'uploading' ? 'text-violet-600 font-semibold' : importProgress >= 90 ? 'text-green-600' : ''}`}>
                    {importProgress >= 90 ? <CheckCircle2 className="w-3.5 h-3.5" /> : importStatus === 'uploading' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />} Upload
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

      {/* Formalization Form Modal */}
      <AnimatePresence>
        {isFormalizacaoFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormalizacaoFormOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-gray-50 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-4 flex justify-between items-center bg-gradient-to-r from-[#1351B4] to-[#0C326F]">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingFormalizacao ? 'Editar Demanda' : 'Nova Demanda'}
                  </h2>
                  <p className="text-[11px] text-white/60 mt-0.5">Preencha os campos para atualizar as informações.</p>
                </div>
                <button 
                  onClick={() => setIsFormalizacaoFormOpen(false)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-white/80" />
                </button>
              </div>

              <form onSubmit={handleSubmitFormalizacao} className="flex-1 overflow-y-auto p-6 space-y-5">

                {/* Informações da Emenda (read-only) */}
                {editingFormalizacao && (
                  <div className="bg-[#1351B4]/5 border border-[#1351B4]/15 rounded-xl px-5 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <span className="text-[10px] font-semibold text-[#1351B4]/60 uppercase tracking-wider">Nome do Parlamentar</span>
                        <p className="text-sm font-semibold text-gray-800 mt-0.5">{editingFormalizacao.parlamentar || '—'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-[#1351B4]/60 uppercase tracking-wider">Emenda</span>
                        <p className="text-sm font-semibold text-gray-800 mt-0.5">{editingFormalizacao.emenda || '—'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-[#1351B4]/60 uppercase tracking-wider">Demanda</span>
                        <p className="text-sm font-semibold text-gray-800 mt-0.5">{editingFormalizacao.demanda || editingFormalizacao.demandas_formalizacao || '—'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 1️⃣ Atribuição da Demanda */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3 bg-[#1351B4]/5 border-b border-[#1351B4]/10 flex items-center gap-2">
                    <div className="bg-[#1351B4] text-white rounded-md w-6 h-6 flex items-center justify-center text-[11px] font-bold">1</div>
                    <h3 className="text-xs font-bold text-[#1351B4] uppercase tracking-wide flex items-center gap-2">
                      <ClipboardList className="w-3.5 h-3.5" />
                      Atribuição da Demanda
                    </h3>
                  </div>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-gray-500 ml-0.5">Técnico</label>
                      <select
                        name="tecnico"
                        defaultValue={editingFormalizacao?.tecnico || ''}
                        disabled={user?.role === 'usuario'}
                        className={`w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/10 outline-none transition-all appearance-none ${user?.role === 'usuario' ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
                      >
                        <option value="">-- Selecione o Técnico --</option>
                        {tecnicosDisponiveis.map((t: any) => (
                          <option key={t.id} value={t.nome}>{t.nome} ({t.email})</option>
                        ))}
                      </select>
                    </div>
                    <Input label="Data da Liberação" name="data_liberacao" type="date" defaultValue={editingFormalizacao?.data_liberacao} disabled={user?.role === 'usuario'} />
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-gray-500 ml-0.5">Área – Estágio da Situação da Demanda</label>
                      <select
                        name="area_estagio_situacao_demanda"
                        defaultValue={editingFormalizacao?.area_estagio_situacao_demanda || ''}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/10 outline-none transition-all appearance-none"
                      >
                        <option value="">-- Selecione --</option>
                        <option value="DEMANDA COM O TÉCNICO">DEMANDA COM O TÉCNICO</option>
                        <option value="EM ANÁLISE DA DOCUMENTAÇÃO">EM ANÁLISE DA DOCUMENTAÇÃO</option>
                        <option value="EM ANÁLISE DO PLANO DE TRABALHO">EM ANÁLISE DO PLANO DE TRABALHO</option>
                        <option value="AGUARDANDO DOCUMENTAÇÃO">AGUARDANDO DOCUMENTAÇÃO</option>
                        <option value="DEMANDA EM DILIGÊNCIA">DEMANDA EM DILIGÊNCIA</option>
                        <option value="DEMANDA EM DILIGÊNCIA DOCUMENTO - DRS">DEMANDA EM DILIGÊNCIA DOCUMENTO - DRS</option>
                        <option value="DEMANDA EM DILIGÊNCIA PLANO DE TRABALHO - CRS">DEMANDA EM DILIGÊNCIA PLANO DE TRABALHO - CRS</option>
                        <option value="COMITÊ GESTOR">COMITÊ GESTOR</option>
                        <option value="OUTRAS PENDÊNCIAS">OUTRAS PENDÊNCIAS</option>
                        <option value="EM FORMALIZAÇÃO">EM FORMALIZAÇÃO</option>
                        <option value="EM CONFERÊNCIA">EM CONFERÊNCIA</option>
                        <option value="CONFERÊNCIA COM PENDÊNCIA">CONFERÊNCIA COM PENDÊNCIA</option>
                        <option value="EM ASSINATURA">EM ASSINATURA</option>
                        <option value="EMPENHO CANCELADO">EMPENHO CANCELADO</option>
                        <option value="LAUDAS">LAUDAS</option>
                        <option value="PUBLICAÇÃO NO DOE">PUBLICAÇÃO NO DOE</option>
                        <option value="PROCESSO SIAFEM">PROCESSO SIAFEM</option>
                      </select>
                    </div>
                    <Input label="Data Recebimento Demanda" name="data_recebimento_demanda" type="date" defaultValue={editingFormalizacao?.data_recebimento_demanda} disabled={user?.role === 'usuario'} />
                    <Input label="Área - Estágio" name="area_estagio" defaultValue={editingFormalizacao?.area_estagio} />
                    <Input label="Recurso" name="recurso" defaultValue={editingFormalizacao?.recurso} disabled={user?.role === 'usuario'} />
                  </div>
                </div>

                {/* 2️⃣ Análise da Demanda */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3 bg-[#1351B4]/5 border-b border-[#1351B4]/10 flex items-center gap-2">
                    <div className="bg-[#1351B4] text-white rounded-md w-6 h-6 flex items-center justify-center text-[11px] font-bold">2</div>
                    <h3 className="text-xs font-bold text-[#1351B4] uppercase tracking-wide flex items-center gap-2">
                      <FileSearch className="w-3.5 h-3.5" />
                      Análise da Demanda
                    </h3>
                  </div>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                    <Input label="Situação - Análise Demanda" name="situacao_analise_demanda" defaultValue={editingFormalizacao?.situacao_analise_demanda} />
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-gray-500 ml-0.5">Data - Análise Demanda</label>
                      {isAdmin ? (
                        <Input label="" name="data_analise_demanda" type="date" defaultValue={editingFormalizacao?.data_analise_demanda} />
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
                                const now = new Date();
                                const dataHoje = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                                const hiddenInput = document.getElementById('data_analise_demanda_hidden') as HTMLInputElement;
                                const displaySpan = document.getElementById('data_analise_demanda_display');
                                if (hiddenInput) hiddenInput.value = dataHoje;
                                if (displaySpan) displaySpan.textContent = formatDateForDisplay(dataHoje);
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                              Demanda Analisada
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3️⃣ Diligência */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3 bg-[#1351B4]/5 border-b border-[#1351B4]/10 flex items-center gap-2">
                    <div className="bg-[#1351B4] text-white rounded-md w-6 h-6 flex items-center justify-center text-[11px] font-bold">3</div>
                    <h3 className="text-xs font-bold text-[#1351B4] uppercase tracking-wide flex items-center gap-2">
                      <Send className="w-3.5 h-3.5" />
                      Diligência
                    </h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                      <Input label="Motivo do Retorno da Diligência" name="motivo_retorno_diligencia" defaultValue={editingFormalizacao?.motivo_retorno_diligencia} />
                      <Input label="Data do Retorno da Diligência" name="data_retorno_diligencia" type="date" defaultValue={editingFormalizacao?.data_retorno_diligencia} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                      <Input label="Data do Retorno" name="data_retorno" type="date" defaultValue={editingFormalizacao?.data_retorno} />
                    </div>
                    <Input label="Observação - Motivo do Retorno" name="observacao_motivo_retorno" defaultValue={editingFormalizacao?.observacao_motivo_retorno} className="col-span-full" />
                  </div>
                </div>

                {/* 4️⃣ Conferência */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3 bg-[#1351B4]/5 border-b border-[#1351B4]/10 flex items-center gap-2">
                    <div className="bg-[#1351B4] text-white rounded-md w-6 h-6 flex items-center justify-center text-[11px] font-bold">4</div>
                    <h3 className="text-xs font-bold text-[#1351B4] uppercase tracking-wide flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5" />
                      Conferência
                    </h3>
                  </div>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-gray-500 ml-0.5">Conferencista</label>
                      <select
                        name="conferencista"
                        defaultValue={editingFormalizacao?.conferencista || ''}
                        disabled={user?.role === 'usuario'}
                        className={`w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/10 outline-none transition-all appearance-none ${user?.role === 'usuario' ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
                      >
                        <option value="">-- Selecione o Conferencista --</option>
                        {tecnicosDisponiveis.map((t: any) => (
                          <option key={t.id} value={t.nome}>{t.nome} ({t.email})</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-gray-500 ml-0.5">Data Liberação - Conferencista</label>
                      {isAdmin ? (
                        <Input label="" name="data_liberacao_assinatura_conferencista" type="date" defaultValue={editingFormalizacao?.data_liberacao_assinatura_conferencista} />
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
                                const now = new Date();
                                const dataHoje = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                                const hiddenInput = document.getElementById('data_liberacao_conferencista_hidden') as HTMLInputElement;
                                const displaySpan = document.getElementById('data_liberacao_conferencista_display');
                                if (hiddenInput) hiddenInput.value = dataHoje;
                                if (displaySpan) displaySpan.textContent = formatDateForDisplay(dataHoje);
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
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

                {/* 5️⃣ Assinaturas */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3 bg-[#1351B4]/5 border-b border-[#1351B4]/10 flex items-center gap-2">
                    <div className="bg-[#1351B4] text-white rounded-md w-6 h-6 flex items-center justify-center text-[11px] font-bold">5</div>
                    <h3 className="text-xs font-bold text-[#1351B4] uppercase tracking-wide flex items-center gap-2">
                      <PenLine className="w-3.5 h-3.5" />
                      Assinaturas
                    </h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                      <Input label="Data Liberação de Assinatura" name="data_liberacao_assinatura" type="date" defaultValue={editingFormalizacao?.data_liberacao_assinatura} disabled={user?.role === 'usuario'} />
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-gray-500 ml-0.5">Falta Assinatura</label>
                        <div className={`bg-white border border-gray-200 rounded-lg p-3 space-y-2 ${user?.role === 'usuario' ? 'opacity-50 pointer-events-none bg-gray-50' : ''}`}>
                          {[
                            'GESTOR ADMINISTRATIVO DRS',
                            'GESTOR TÉCNICO DRS',
                            'DIRETOR DRS',
                            'COORDENADOR CRS',
                            'DIRETOR GGCON',
                            'ORDENADOR DE DESPESAS',
                            'SECRETÁRIO',
                            'GESTOR – CONVÊNIO / DEMANDANTE',
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
                                  className="w-4 h-4 rounded border-gray-300 text-[#1351B4] focus:ring-[#1351B4]/30 accent-[#1351B4]"
                                />
                                <span className="text-xs text-gray-700 group-hover:text-gray-900">{opcao}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                      <Input label="Assinatura" name="assinatura" type="date" defaultValue={editingFormalizacao?.assinatura} disabled={user?.role === 'usuario'} />
                    </div>
                  </div>
                </div>

                {/* 6️⃣ Publicação e Finalização */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3 bg-[#1351B4]/5 border-b border-[#1351B4]/10 flex items-center gap-2">
                    <div className="bg-[#1351B4] text-white rounded-md w-6 h-6 flex items-center justify-center text-[11px] font-bold">6</div>
                    <h3 className="text-xs font-bold text-[#1351B4] uppercase tracking-wide flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5" />
                      Publicação e Finalização
                    </h3>
                  </div>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4">
                    <Input label="Publicação" name="publicacao" type="date" defaultValue={editingFormalizacao?.publicacao} disabled={user?.role === 'usuario'} />
                    <Input label="Vigência" name="vigencia" type="date" defaultValue={editingFormalizacao?.vigencia} disabled={user?.role === 'usuario'} />
                    <Input label="Encaminhado em" name="encaminhado_em" type="date" defaultValue={editingFormalizacao?.encaminhado_em} disabled={user?.role === 'usuario'} />
                    <Input label="Concluída em" name="concluida_em" type="date" defaultValue={editingFormalizacao?.concluida_em} disabled={user?.role === 'usuario'} />
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex justify-end gap-3 pt-2 pb-1">
                  <button 
                    type="button"
                    onClick={() => setIsFormalizacaoFormOpen(false)}
                    className="px-5 py-2.5 rounded-lg text-xs font-semibold text-slate-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#1351B4] hover:bg-[#0C326F] shadow-md transition-all active:scale-95 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {editingFormalizacao ? 'Atualizar Registro' : 'Salvar Demanda'}
                  </button>
                </div>
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
                onClick={() => setShowAtribuirTecnicoModal(false)}
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
                      <div className="bg-amber-100 p-2 rounded-lg">
                        <User className="text-amber-600 w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">Atribuir a Técnico</h3>
                    </div>
                    <button
                      onClick={() => setShowAtribuirTecnicoModal(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-amber-900 font-medium">
                      {selectedRows.size} registro(s) selecionado(s)
                    </p>
                  </div>

                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!atribuicaoTecnico || !atribuicaoTecnico.id) {
                      alert('Selecione um técnico');
                      return;
                    }

                    // Converter IDs e validar
                    const idsToUpdate = Array.from(selectedRows).map(id => {
                      const numId = parseInt(id, 10);
                      if (isNaN(numId) || numId <= 0) {
                        console.error('❌ ID inválido:', id);
                        return null;
                      }
                      return numId;
                    }).filter(id => id !== null) as number[];

                    if (idsToUpdate.length === 0) {
                      alert('❌ Nenhum ID válido selecionado');
                      return;
                    }

                    if (idsToUpdate.length !== selectedRows.size) {
                      alert(`⚠️ ${selectedRows.size - idsToUpdate.length} registro(s) com ID inválido foram ignorados`);
                    }

                    // Data corrigida: usar UTC para evitar timezone
                    const now = new Date();
                    const dataLiberacao = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
                    
                    setAtribuindoTecnico(true);
                    try {
                      const response = await fetch('/api/formalizacao/atribuir-tecnico', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          ids: idsToUpdate,
                          usuario_id: atribuicaoTecnico.id,
                          data_liberacao: dataLiberacao
                        })
                      });
                      
                      if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || `Erro HTTP ${response.status}: ${response.statusText}`);
                      }

                      const result = await response.json();
                      
                      if (!result.success && result.updated === 0) {
                        alert(`⚠️ ATENÇÃO: Nenhum registro foi atualizado!\n\nVerifique se:\n1. Os IDs selecionados são válidos\n2. Há permsão para editar\n\nDetalhes: ${result.message || 'Desconhecido'}`);
                        return;
                      }
                      
                      // Atualizar dados localmente em vez de refetch (rápido!)
                      if (result.updatedRecords && result.updatedRecords.length > 0) {
                        const updateMap = new Map(result.updatedRecords.map((r: any) => [r.id, r]));
                        const updater = (list: any[]) => list.map((f: any) => {
                          const u = updateMap.get(f.id);
                          return u ? { ...f, ...u } : f;
                        });
                        if (allDataCacheRef.current.length > 0) {
                          allDataCacheRef.current = updater(allDataCacheRef.current);
                        }
                        setFormalizacoes(prev => updater(prev));
                        setFormalizacaoSearchResult((prev: any) => ({
                          ...prev,
                          data: updater(prev.data)
                        }));
                      }
                      
                      setSelectedRows(new Set());
                      setAtribuicaoTecnico(null);
                      setShowAtribuirTecnicoModal(false);
                      alert(`✅ Sucesso! Técnico ${atribuicaoTecnico.nome} atribuído para ${result.updated} registro(s)!`);
                    } catch (error: any) {
                      alert(`❌ Erro ao atribuir técnico:\n\n${error.message}`);
                    } finally {
                      setAtribuindoTecnico(false);
                    }
                  }} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 ml-1 block mb-2">
                        Selecione o Técnico
                      </label>
                      <select
                        value={atribuicaoTecnico?.id || ''}
                        onChange={(e) => {
                          const id = parseInt(e.target.value);
                          const tecnico = tecnicosDisponiveis.find(t => t.id === id);
                          setAtribuicaoTecnico(tecnico || null);
                        }}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                        disabled={atribuindoTecnico}
                      >
                        <option value="">-- Selecione --</option>
                        {tecnicosDisponiveis.map(tecnico => (
                          <option key={tecnico.id} value={tecnico.id}>
                            {tecnico.nome} ({tecnico.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
                      <p>A data de liberação será preenchida automaticamente com a data de hoje.</p>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        type="button"
                        onClick={() => setShowAtribuirTecnicoModal(false)}
                        className="flex-1 px-4 py-2.5 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                        disabled={atribuindoTecnico}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (selectedRows.size === 0) {
                            alert('❌ Nenhum registro selecionado');
                            return;
                          }

                          const idsToUpdate = Array.from(selectedRows).map(id => parseInt(String(id))).filter(id => !isNaN(id));
                          
                          setAtribuindoTecnico(true);
                          try {
                            const response = await fetch('/api/formalizacao/remover-tecnico', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                              },
                              body: JSON.stringify({ ids: idsToUpdate })
                            });
                            
                            if (!response.ok) {
                              const error = await response.json();
                              throw new Error(error.error || 'Erro ao remover atribuição');
                            }

                            const result = await response.json();
                            setSelectedRows(new Set());
                            setAtribuicaoTecnico(null);
                            setShowAtribuirTecnicoModal(false);
                            fetchFormalizacoesComFiltros(0);
                            alert(`✅ Atribuição removida de ${result.updated} registro(s)!`);
                          } catch (error: any) {
                            alert(`❌ Erro ao remover atribuição:\n\n${error.message}`);
                          } finally {
                            setAtribuindoTecnico(false);
                          }
                        }}
                        className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        disabled={atribuindoTecnico || selectedRows.size === 0}
                      >
                        {atribuindoTecnico ? (
                          <>
                            <div className="animate-spin">⏳</div>
                            Processando...
                          </>
                        ) : (
                          'Remover'
                        )}
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-amber-500 hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        disabled={atribuindoTecnico || !atribuicaoTecnico}
                      >
                        {atribuindoTecnico ? (
                          <>
                            <div className="animate-spin">⏳</div>
                            Atribuindo...
                          </>
                        ) : (
                          'Atribuir'
                        )}
                      </button>
                    </div>
                  </form>
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
              onClick={() => setShowAtribuirConferencistaModal(false)}
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
                    <div className="bg-green-100 p-2 rounded-lg">
                      <User className="text-green-600 w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Atribuir a Conferencista</h3>
                  </div>
                  <button
                    onClick={() => setShowAtribuirConferencistaModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-green-900 font-medium">
                    {selectedRows.size} registro(s) selecionado(s)
                  </p>
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!atribuicaoConferencista || !atribuicaoConferencista.id) {
                    alert('Selecione um conferencista');
                    return;
                  }

                  const idsToUpdate = Array.from(selectedRows).map(id => {
                    const numId = parseInt(id, 10);
                    if (isNaN(numId) || numId <= 0) {
                      console.error('❌ ID inválido:', id);
                      return null;
                    }
                    return numId;
                  }).filter(id => id !== null) as number[];

                  if (idsToUpdate.length === 0) {
                    alert('❌ Nenhum ID válido selecionado');
                    return;
                  }

                  if (idsToUpdate.length !== selectedRows.size) {
                    alert(`⚠️ ${selectedRows.size - idsToUpdate.length} registro(s) com ID inválido foram ignorados`);
                  }

                  const now = new Date();
                  const dataRecebimento = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
                  
                  setAtribuindoConferencista(true);
                  try {
                    const response = await fetch('/api/formalizacao/atribuir-conferencista', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        ids: idsToUpdate,
                        usuario_id: atribuicaoConferencista.id,
                        data_recebimento_demanda: dataRecebimento
                      })
                    });
                    
                    if (!response.ok) {
                      const error = await response.json();
                      throw new Error(error.error || `Erro HTTP ${response.status}: ${response.statusText}`);
                    }

                    const result = await response.json();
                    
                    if (!result.success && result.updated === 0) {
                      alert(`⚠️ ATENÇÃO: Nenhum registro foi atualizado!\n\nVerifique se:\n1. Os IDs selecionados são válidos\n2. Há permissão para editar\n\nDetalhes: ${result.message || 'Desconhecido'}`);
                      return;
                    }
                    
                    if (result.updatedRecords && result.updatedRecords.length > 0) {
                      const updateMap = new Map(result.updatedRecords.map((r: any) => [r.id, r]));
                      const updater = (list: any[]) => list.map((f: any) => {
                        const u = updateMap.get(f.id);
                        return u ? { ...f, ...u } : f;
                      });
                      if (allDataCacheRef.current.length > 0) {
                        allDataCacheRef.current = updater(allDataCacheRef.current);
                      }
                      setFormalizacoes(prev => updater(prev));
                      setFormalizacaoSearchResult((prev: any) => ({
                        ...prev,
                        data: updater(prev.data)
                      }));
                    }
                    
                    setSelectedRows(new Set());
                    setAtribuicaoConferencista(null);
                    setShowAtribuirConferencistaModal(false);
                    alert(`✅ Sucesso! Conferencista ${atribuicaoConferencista.nome} atribuído para ${result.updated} registro(s)!`);
                  } catch (error: any) {
                    alert(`❌ Erro ao atribuir conferencista:\n\n${error.message}`);
                  } finally {
                    setAtribuindoConferencista(false);
                  }
                }} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 ml-1 block mb-2">
                      Selecione o Conferencista
                    </label>
                    <select
                      value={atribuicaoConferencista?.id || ''}
                      onChange={(e) => {
                        const id = parseInt(e.target.value);
                        const conferencista = tecnicosDisponiveis.find(t => t.id === id);
                        setAtribuicaoConferencista(conferencista || null);
                      }}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all"
                      disabled={atribuindoConferencista}
                    >
                      <option value="">-- Selecione --</option>
                      {tecnicosDisponiveis.map(tecnico => (
                        <option key={tecnico.id} value={tecnico.id}>
                          {tecnico.nome} ({tecnico.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
                    <p>A data de recebimento da demanda será preenchida automaticamente com a data de hoje.</p>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowAtribuirConferencistaModal(false)}
                      className="flex-1 px-4 py-2.5 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                      disabled={atribuindoConferencista}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (selectedRows.size === 0) {
                          alert('❌ Nenhum registro selecionado');
                          return;
                        }

                        const idsToUpdate = Array.from(selectedRows).map(id => parseInt(String(id))).filter(id => !isNaN(id));
                        
                        setAtribuindoConferencista(true);
                        try {
                          const response = await fetch('/api/formalizacao/remover-conferencista', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ ids: idsToUpdate })
                          });
                          
                          if (!response.ok) {
                            const error = await response.json();
                            throw new Error(error.error || 'Erro ao remover atribuição');
                          }

                          const result = await response.json();
                          setSelectedRows(new Set());
                          setAtribuicaoConferencista(null);
                          setShowAtribuirConferencistaModal(false);
                          fetchFormalizacoesComFiltros(0);
                          alert(`✅ Atribuição de conferencista removida de ${result.updated} registro(s)!`);
                        } catch (error: any) {
                          alert(`❌ Erro ao remover atribuição:\n\n${error.message}`);
                        } finally {
                          setAtribuindoConferencista(false);
                        }
                      }}
                      className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      disabled={atribuindoConferencista || selectedRows.size === 0}
                    >
                      {atribuindoConferencista ? (
                        <>
                          <div className="animate-spin">⏳</div>
                          Processando...
                        </>
                      ) : (
                        'Remover'
                      )}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-green-500 hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      disabled={atribuindoConferencista || !atribuicaoConferencista}
                    >
                      {atribuindoConferencista ? (
                        <>
                          <div className="animate-spin">⏳</div>
                          Atribuindo...
                        </>
                      ) : (
                        'Atribuir'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
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
    </div>
  );
}

function DetailItem({ label, value, highlight, icon }: { label: string, value?: string | number, highlight?: boolean, icon?: React.ReactNode }) {
  return (
    <div className={`rounded-lg px-3.5 py-2.5 transition-colors ${highlight ? 'bg-[#1351B4]/5 border border-[#1351B4]/10' : 'bg-gray-50/80'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className="text-[#1351B4]/50">{icon}</span>}
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">{label}</span>
      </div>
      <span className={`text-[13px] font-semibold leading-snug ${value ? 'text-slate-800' : 'text-slate-300'}`}>{value || '—'}</span>
    </div>
  );
}

function Input({ label, className = '', disabled = false, ...props }: any) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-[11px] font-semibold text-gray-500 ml-0.5">{label}</label>
      <input 
        disabled={disabled}
        className={`w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/10 outline-none transition-all ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
        {...props}
      />
    </div>
  );
}

function Select({ label, children, className = '', ...props }: any) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-[11px] font-semibold text-gray-500 ml-0.5">{label}</label>
      <select 
        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-[#1351B4] focus:ring-2 focus:ring-[#1351B4]/10 outline-none transition-all appearance-none"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
