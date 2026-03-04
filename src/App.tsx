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
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { useAuth } from './AuthContext';
import { AdminPanel } from './AdminPanel';
import { UserManagementPanel } from './UserManagementPanel';

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
      <label className="text-xs font-bold text-slate-600 uppercase mb-2 flex items-center justify-between block">
        <span>{label}</span>
        <span className="text-xs font-normal text-slate-500">({options.length})</span>
      </label>

      {/* Campo principal com seleções */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all cursor-pointer bg-white min-h-10 flex flex-wrap gap-1 items-center"
      >
        {selectedValues.length === 0 ? (
          <span className="text-slate-400">Selecione...</span>
        ) : (
          selectedValues.map(val => (
            <span
              key={val}
              className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium"
            >
              {val}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelection(val);
                }}
                className="hover:bg-indigo-200 rounded-full p-0.5"
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
            className="ml-auto text-slate-400 hover:text-slate-600"
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
          className="absolute z-50 w-full mt-2 bg-white border border-slate-300 rounded-lg shadow-lg"
        >
          {/* Input de busca */}
          <div className="p-2 border-b border-slate-200 space-y-2">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              onClick={(e) => e.stopPropagation()}
            />
            {/* Opção Ocultar Campos Vazios */}
            {onHideEmptyChange && (
              <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 p-1 rounded">
                <input
                  type="checkbox"
                  checked={hideEmpty}
                  onChange={(e) => onHideEmptyChange(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-slate-600 font-medium">Ocultar vazios</span>
              </label>
            )}
          </div>

          {/* Lista de opções */}
          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-sm text-slate-500 text-center">
                Nenhuma opção encontrada
              </div>
            ) : (
              filteredOptions.map(option => (
                <label
                  key={option}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option)}
                    onChange={() => toggleSelection(option)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>{option}</span>
                </label>
              ))
            )}
          </div>

          {/* Botões de ação */}
          <div className="border-t border-slate-200 p-2 flex gap-2">
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
            >
              Fechar
            </button>
            {selectedValues.length > 0 && (
              <button
                onClick={() => {
                  onSelectionChange([]);
                  setSearchTerm('');
                }}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-all"
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
      <label className="text-xs font-bold text-slate-600 uppercase mb-2 flex items-center justify-between block">
        <span>{label}</span>
        <span className="text-xs font-normal text-slate-500">({options.length})</span>
      </label>

      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg cursor-pointer bg-white min-h-10 flex flex-wrap gap-1 items-center"
      >
        {selectedValues.length === 0 ? (
          <span className="text-slate-400">Selecione...</span>
        ) : (
          selectedValues.map(val => (
            <span
              key={val}
              className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium"
            >
              {formatDate(val)}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelection(val);
                }}
                className="hover:bg-indigo-200 rounded-full p-0.5"
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
            className="ml-auto text-slate-400 hover:text-slate-600"
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
          className="absolute z-50 w-full mt-2 bg-white border border-slate-300 rounded-lg shadow-lg"
        >
          <div className="p-2 border-b border-slate-200 space-y-2">
            <input
              type="text"
              placeholder="Buscar data (DD/MM/YYYY)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              onClick={(e) => e.stopPropagation()}
            />
            {/* Opção Ocultar Campos Vazios */}
            {onHideEmptyChange && (
              <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 p-1 rounded">
                <input
                  type="checkbox"
                  checked={hideEmpty}
                  onChange={(e) => onHideEmptyChange(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-slate-600 font-medium">Ocultar vazios</span>
              </label>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-sm text-slate-500 text-center">
                Nenhuma data encontrada
              </div>
            ) : (
              filteredOptions.map(option => (
                <label
                  key={option}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option)}
                    onChange={() => toggleSelection(option)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>{formatDate(option)}</span>
                </label>
              ))
            )}
          </div>

          <div className="border-t border-slate-200 p-2 flex gap-2">
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
            >
              Fechar
            </button>
            {selectedValues.length > 0 && (
              <button
                onClick={() => {
                  onSelectionChange([]);
                  setSearchTerm('');
                }}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-all"
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

interface Emenda {
  id?: number;
  detalhes?: string;
  natureza?: string;
  ano_refer?: string;
  codigo_num?: string;
  num_emenda?: string;
  parecer_ld?: string;
  situacao_e?: string;
  situacao_d?: string;
  data_ult_e?: string;
  data_ult_d?: string;
  num_indicacao?: string;
  parlamentar?: string;
  partido?: string;
  tipo_beneficiario?: string;
  beneficiario?: string;
  cnpj?: string;
  municipio?: string;
  objeto?: string;
  orgao_entidade?: string;
  regional?: string;
  num_convenio?: string;
  num_processo?: string;
  data_assinatura?: string;
  data_publicacao?: string;
  agencia?: string;
  conta?: string;
  valor?: number;
  valor_desembolsado?: number;
  portfolio?: string;
  qtd_dias?: number;
  vigencia?: string;
  data_prorrogacao?: string;
  dados_bancarios?: string;
  status?: string;
  data_pagamento?: string;
  num_codigo?: string;
  notas_empenho?: string;
  valor_total_empenhado?: number;
  notas_liquidacao?: string;
  valor_total_liquidado?: number;
  programa?: string;
  valor_total_pago?: number;
  ordem_bancaria?: string;
  data_paga?: string;
  valor_total_ordem_bancaria?: number;
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
  const [activeTab, setActiveTab] = useState<'emendas' | 'formalizacao' | 'admin'>('formalizacao');
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [emendas, setEmendas] = useState<Emenda[]>([]);
  const [formalizacoes, setFormalizacoes] = useState<Formalizacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFormalizacaoFormOpen, setIsFormalizacaoFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSupabaseGuideOpen, setIsSupabaseGuideOpen] = useState(false);
  const [editingEmenda, setEditingEmenda] = useState<Emenda | null>(null);
  const [editingFormalizacao, setEditingFormalizacao] = useState<Formalizacao | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmenda, setSelectedEmenda] = useState<Emenda | null>(null);
  const [selectedFormalizacao, setSelectedFormalizacao] = useState<Formalizacao | null>(null);
  const [importing, setImporting] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(0);
  const [itensPorPagina] = useState(500);
  const [visibleColumns, setVisibleColumns] = useState({
    seq: false,
    ano: true,
    parlamentar: true,
    partido: false,
    emenda: true,
    emendas_agregadoras: false,
    demanda: true,
    demandas_formalizacao: false,
    numero_convenio: false,
    classificacao_emenda_demanda: false,
    tipo_formalizacao: false,
    regional: true,
    municipio: true,
    conveniado: false,
    objeto: false,
    portfolio: false,
    valor: true,
    posicao_anterior: false,
    situacao_demandas_sempapel: true,
    area_estagio: true,
    recurso: true,
    tecnico: true,
    data_liberacao: true,
    area_estagio_situacao_demanda: true,
    situacao_analise_demanda: true,
    data_analise_demanda: true,
    motivo_retorno_diligencia: false,
    data_retorno_diligencia: true,
    conferencista: true,
    data_recebimento_demanda: true,
    data_retorno: true,
    observacao_motivo_retorno: false,
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
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
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

  // Estado para seleção múltipla de linhas
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  
  // Estado para modal de atribuição de técnico
  const [showAtribuirTecnicoModal, setShowAtribuirTecnicoModal] = useState(false);
  const [atribuicaoTecnico, setAtribuicaoTecnico] = useState<{id: number, nome: string} | null>(null);
  const [atribuindoTecnico, setAtribuindoTecnico] = useState(false);
  const [tecnicosDisponiveis, setTecnicosDisponiveis] = useState<any[]>([]);

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
  }, [filters, activeTab, token]);

  // Log de filtros para debug
  useEffect(() => {
    const activeFilters = Object.entries(filters).filter(([, v]) => v && v !== '');
    if (activeFilters.length > 0) {
      console.log('🔍 Filtros ativos:', Object.fromEntries(activeFilters));
      console.log('📊 Total formalizações:', formalizacoes.length);
    }
  }, [filters, formalizacoes.length]);

  // Debounce para buscar formalizações com filtros quando filtros mudam
  useEffect(() => {
    if (activeTab !== 'formalizacao') return;

    // Limpar timer anterior
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Definir novo timer com debounce de 500ms
    const timer = setTimeout(() => {
      console.log('⏱️ Debounce trigger - Buscando formalizações com filtros...');
      setPaginaAtual(0); // Reset para primeira página ao filtrar
      fetchFormalizacoesComFiltros(0);
    }, 500);

    setDebounceTimer(timer);

    // Cleanup
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [filters, searchTerm, activeTab, hideEmptyFields]);

  // Carrega dados quando muda para aba de formalizações (se ainda não tem dados)
  useEffect(() => {
    if (activeTab === 'formalizacao' && formalizacaoSearchResult.data.length === 0 && !formalizacaoSearchResult.loading) {
      console.log('📥 Aba de Formalização aberta, carregando primeira página...');
      fetchFormalizacoesComFiltros(0);
    }
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
  }, [filters, searchTerm]);

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
        area_estagio: true,
        recurso: false,
        tecnico: true,
        data_liberacao: true,
        area_estagio_situacao_demanda: false,
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
      console.log('👤 Colunas ajustadas para usuário comum');
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    if (activeTab === 'emendas') {
      await fetchEmendas();
    } else {
      await fetchFormalizacoes();
    }
    setLoading(false);
  };

  const fetchEmendas = async () => {
    try {
      const response = await fetch('/api/emendas', {
        headers: getHeaders()
      });
      const data = await response.json();
      if (Array.isArray(data)) setEmendas(data);
    } catch (error) {
      console.error('Erro ao buscar emendas:', error);
    }
  };

  const fetchFormalizacoes = async () => {
    try {
      const response = await fetch('/api/formalizacao?limit=37352', {
        headers: getHeaders()
      });
      const result = await response.json();
      
      // O endpoint retorna { data, total, page, limit }
      const data = Array.isArray(result) ? result : (result.data || []);
      
      if (Array.isArray(data) && data.length > 0) {
        console.log('✅ Formalizações carregadas:', data.length, 'registros');
        if (data.length > 0) {
          console.log('📅 Primeiro registro - ano:', data[0].ano, 'parlamentar:', data[0].parlamentar);
        }
        setFormalizacoes(data);
      } else {
        console.warn('⚠️ Nenhuma formalização carregada', result);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar formalizações:', error);
    }
  };

  // Função para buscar formalizações com filtros do servidor
  const fetchFormalizacoesComFiltros = async (page: number = 0, filtersParam?: any) => {
    try {
      setFormalizacaoSearchResult(prev => ({ ...prev, loading: true }));
      
      const filtersToUse = filtersParam || filters;
      const activeFilterCount = Object.values(filtersToUse).filter(v => v && v !== '').length;
      
      // Verificar se há filtros ativos
      const hasActiveFilters = activeFilterCount > 0;
      
      if (hasActiveFilters) {
        console.log(`🔍 Filtros ativos (${activeFilterCount}) - buscando TODOS os registros para filtrar...`);
      } else {
        console.log(`📄 Buscando página ${page} sem filtros...`);
      }
      
      // Se há filtros, buscar TODOS os registros; caso contrário, buscar apenas a página
      const endpoint = hasActiveFilters ? '/api/formalizacao' : `/api/formalizacao/page/${page}`;
      
      const response = await fetch(endpoint, {
        headers: getHeaders()
      });

      const result = await response.json();
      
      // Para requests sem filtros, resultado é pagInado
      // Para requests com filtros, resultado é um array global
      let allData = Array.isArray(result) ? result : (result.data || []);
      const countBefore = allData.length;

      // Debug: verificar estrutura dos dados
      if (hasActiveFilters && countBefore > 0) {
        const firstRecord = allData[0];
        console.log(`📊 DADOS BRUTOS DO PRIMEIRO REGISTRO:`, firstRecord);
        const hasParl = !!firstRecord.parlamentar;
        const hasConv = !!firstRecord.conveniado;
        const hasObj = !!firstRecord.objeto;
        console.log(`📊 Primeiro registro bruto: ano=${firstRecord.ano}, parlamentar=${hasParl}, conveniado=${hasConv}, objeto=${hasObj}`);
        const emptyFields = Object.entries(firstRecord).filter(([k, v]) => !v && k !== 'id').length;
        console.log(`   Campos vazios/null: ${emptyFields}/${Object.keys(firstRecord).length}`);
        
        // Verificar quantos registros têm campos NULL
        const recordsWithParl = allData.filter(r => r.parlamentar).length;
        const recordsWithConv = allData.filter(r => r.conveniado).length;
        const recordsWithObj = allData.filter(r => r.objeto).length;
        console.log(`📊 Dos ${allData.length} registros:`);
        console.log(`   - Com parlamentar: ${recordsWithParl} (${((recordsWithParl/allData.length)*100).toFixed(1)}%)`);
        console.log(`   - Com conveniado: ${recordsWithConv} (${((recordsWithConv/allData.length)*100).toFixed(1)}%)`);
        console.log(`   - Com objeto: ${recordsWithObj} (${((recordsWithObj/allData.length)*100).toFixed(1)}%)`);
      }

      // Função auxiliar para comparação
      const matchesAllFilters = (f: any) => {
        // Converter para string e comparar de forma robusta
        const safeCompare = (fieldValue: any, filterValue: string): boolean => {
          if (!fieldValue) return false;
          const field = String(fieldValue).toLowerCase().trim();
          const filter = filterValue.toLowerCase().trim();
          return field.includes(filter);
        };

        // Helper para verificar se o campo corresponde a uma lista de valores (OR logic)
        const matchesAnyFilter = (fieldValue: any, filterValues: string[]): boolean => {
          if (!filterValues || filterValues.length === 0) return true; // Se não há filtro, passa
          return filterValues.some(filterValue => safeCompare(fieldValue, filterValue));
        };

        // Ano - pode ter múltiplos anos selecionados
        if (Array.isArray(filtersToUse.ano) && filtersToUse.ano.length > 0) {
          const anoField = String(f.ano || '').trim();
          if (!filtersToUse.ano.includes(anoField)) return false;
        }

        // Demandas Formalização (número) - múltiplas seleções
        if (Array.isArray(filtersToUse.demandas_formalizacao) && filtersToUse.demandas_formalizacao.length > 0) {
          if (!matchesAnyFilter(f.demandas_formalizacao, filtersToUse.demandas_formalizacao)) return false;
        }

        // Outros filtros com múltiplas seleções
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

        // Busca por texto
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const matchSearch = 
            (f.parlamentar && f.parlamentar.toLowerCase().includes(searchLower)) ||
            (f.conveniado && f.conveniado.toLowerCase().includes(searchLower)) ||
            (f.objeto && f.objeto.toLowerCase().includes(searchLower));
          if (!matchSearch) return false;
        }

        // Filtros de data com múltiplas seleções
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

        return true;
      };

      // Aplicar filtros em JavaScript
      let filteredData = allData;
      filteredData = filteredData.filter(matchesAllFilters);
      
      // Aplicar filtros de "Ocultar Vazias"
      filteredData = filteredData.filter(f => {
        // Se hideEmptyFields diz para ocultar vazias em uma coluna, filtrar registros com valor vazio
        if (hideEmptyFields.ano && !f.ano) return false;
        if (hideEmptyFields.demandas_formalizacao && !f.demandas_formalizacao) return false;
        if (hideEmptyFields.area_estagio && !f.area_estagio) return false;
        if (hideEmptyFields.recurso && !f.recurso) return false;
        if (hideEmptyFields.tecnico && !f.tecnico) return false;
        if (hideEmptyFields.parlamentar && !f.parlamentar) return false;
        if (hideEmptyFields.partido && !f.partido) return false;
        if (hideEmptyFields.regional && !f.regional) return false;
        if (hideEmptyFields.municipio && !f.municipio) return false;
        if (hideEmptyFields.conveniado && !f.conveniado) return false;
        if (hideEmptyFields.objeto && !f.objeto) return false;
        if (hideEmptyFields.area_estagio_situacao_demanda && !f.area_estagio_situacao_demanda) return false;
        if (hideEmptyFields.situacao_analise_demanda && !f.situacao_analise_demanda) return false;
        if (hideEmptyFields.conferencista && !f.conferencista) return false;
        if (hideEmptyFields.falta_assinatura && !f.falta_assinatura) return false;
        if (hideEmptyFields.publicacao && !f.publicacao) return false;
        if (hideEmptyFields.vigencia && !f.vigencia) return false;
        if (hideEmptyFields.data_liberacao && !f.data_liberacao) return false;
        if (hideEmptyFields.data_analise_demanda && !f.data_analise_demanda) return false;
        if (hideEmptyFields.data_recebimento_demanda && !f.data_recebimento_demanda) return false;
        if (hideEmptyFields.data_retorno && !f.data_retorno) return false;
        if (hideEmptyFields.encaminhado_em && !f.encaminhado_em) return false;
        if (hideEmptyFields.concluida_em && !f.concluida_em) return false;
        return true;
      });
      
      // Debug logging
      if (activeFilterCount > 0) {
        console.log(`🔍 Filtros ativos: ${activeFilterCount}`);
        if (filtersToUse.ano) console.log(`  📅 Ano: ${filtersToUse.ano}`);
        console.log(`  ✅ ${countBefore} → ${filteredData.length} registros EXIBINDO TODOS`);
        if (filteredData.length === 0) {
          console.log('⚠️ Nenhum registro encontrado com esse filtro.');
        }
      } else {
        console.log(`📄 Página 0 (sem filtros): ${filteredData.length} registros`);
      }

      // Se há filtros, aplicar paginação local aos resultados filtrados
      // Se não há filtros, usar resultado já pagInado do servidor
      let pagedData, totalRecords, pageInfo;
      
      if (hasActiveFilters) {
        // Paginação local dos dados filtrados (TODOS, sem remover nenhum)
        const totalFiltered = filteredData.length;
        const startIdx = page * itensPorPagina;
        const endIdx = startIdx + itensPorPagina;
        pagedData = filteredData.slice(startIdx, endIdx);
        totalRecords = totalFiltered;
        pageInfo = {
          page: page,
          pageSize: itensPorPagina,
          hasMore: endIdx < totalFiltered
        };
        console.log(`   📖 Página ${page + 1}: ${pagedData.length}/${totalFiltered} registros filtrados`);
      } else {
        // Usar resultado já pagInado do servidor
        pagedData = Array.isArray(result) ? result : (result.data || []);
        totalRecords = result.total || pagedData.length;
        pageInfo = {
          page: page,
          pageSize: result.pageSize || itensPorPagina,
          hasMore: result.hasMore || false
        };
      }

      console.log(`✅ Resultado final: ${pagedData.length} registros para exibir`);
      console.log(`   Tipo de dados: ${Array.isArray(pagedData) ? 'ARRAY' : 'OUTRO'}`);
      console.log(`   Primeiros registros:`, pagedData.slice(0, 2));
      console.log(`   Total a exibir: ${totalRecords}`);
      
      const newState = {
        data: pagedData,
        total: totalRecords,
        page: pageInfo.page,
        limit: pageInfo.pageSize,
        hasMore: pageInfo.hasMore,
        loading: false
      };
      console.log(`   Estado a ser setado:`, newState);
      
      setFormalizacaoSearchResult(newState);
      
      setPaginaAtual(page);
    } catch (error) {
      console.error('Erro ao buscar formalizações:', error);
      setFormalizacaoSearchResult(prev => ({ ...prev, loading: false }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      encoding: "ISO-8859-1",
      transformHeader: (header) => header.trim(),
      complete: async (results) => {
        try {
          const data = results.data as any[];
          if (!data || data.length === 0) throw new Error('Arquivo vazio.');

          console.log(`📥 Iniciando importação de ${data.length} registros...`);

          const chunkSize = 500;
          let importedCount = 0;
          const endpoint = activeTab === 'emendas' ? '/api/emendas/bulk' : '/api/formalizacao/bulk';

          for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize);
            console.log(`   Enviando chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(data.length / chunkSize)}...`);
            
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: getHeaders(),
              body: JSON.stringify(chunk),
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.details || errorData.error || 'Falha no import');
            }
            
            const result = await response.json();
            const chunkCount = result.count || chunk.length;
            const duplicatesCount = result.duplicates || 0;
            importedCount += chunkCount;
            
            console.log(`   ✓ Chunk inserido: ${chunkCount} registros novos, ${duplicatesCount} duplicatas ignoradas`);
            
            // Delay pequeno entre chunks
            await new Promise(resolve => setTimeout(resolve, 200));
          }

          console.log(`✅ Import completado: ${importedCount}/${data.length} registros importados`);
          
          let successMessage = `✅ ${importedCount} registros importados com sucesso!`;
          if (importedCount === 0) {
            successMessage = `⚠️ Nenhum registro novo importado\n(Todos podem ser duplicatas)`;
          }
          
          alert(successMessage + `\n\nAtualizando dados...`);
          
          // ✅ Recarregar dados e limpar cache do servidor
          if (activeTab === 'formalizacao') {
            setFormalizacaoSearchResult({
              data: [],
              total: 0,
              page: 0,
              hasMore: false,
              loading: false
            });
            setTimeout(() => {
              console.log('🔄 Recarregando dados após import...');
              fetchFormalizacoesComFiltros(0);
            }, 500);
          } else {
            setEmendas([]);
            setTimeout(fetchEmendas, 500);
          }
          
          setIsImportOpen(false);
        } catch (error: any) {
          console.error('❌ Erro ao importar:', error);
          alert(`❌ Erro ao importar: ${error.message}`);
        } finally {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta emenda?')) return;
    try {
      await fetch(`/api/emendas/${id}`, { 
        method: 'DELETE',
        headers: getHeaders()
      });
      fetchEmendas();
      if (selectedEmenda?.id === id) setSelectedEmenda(null);
    } catch (error) {
      console.error('Erro ao excluir emenda:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = {};
    formData.forEach((value, key) => {
      if (key.includes('valor') || key === 'qtd_dias') {
        data[key] = value ? Number(value) : 0;
      } else {
        data[key] = value;
      }
    });

    try {
      const url = editingEmenda ? `/api/emendas/${editingEmenda.id}` : '/api/emendas';
      const method = editingEmenda ? 'PUT' : 'POST';
      await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      setIsFormOpen(false);
      setEditingEmenda(null);
      fetchEmendas();
    } catch (error) {
      console.error('Erro ao salvar emenda:', error);
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

        setSelectedRows(new Set());
        fetchFormalizacoes();
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

      fetchFormalizacoes();
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

  const handleSubmitFormalizacao = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = {};
    formData.forEach((value, key) => {
      if (key.includes('valor')) {
        data[key] = value ? Number(value) : 0;
      } else {
        data[key] = value;
      }
    });

    try {
      const url = editingFormalizacao ? `/api/formalizacao/${editingFormalizacao.id}` : '/api/formalizacao';
      const method = editingFormalizacao ? 'PUT' : 'POST';
      await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      setIsFormalizacaoFormOpen(false);
      setEditingFormalizacao(null);
      fetchFormalizacoes();
    } catch (error) {
      console.error('Erro ao salvar formalização:', error);
    }
  };

  const filteredEmendas = Array.isArray(emendas) ? emendas.filter(e => 
    e.parlamentar?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.beneficiario?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.objeto?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  // Para formalizações, usar os dados do servidor já filtrados
  const filteredFormalizacoes = activeTab === 'formalizacao' ? formalizacaoSearchResult.data : [];

  // Função para ordenar dados
  const sortData = (data: any[], column: string, order: string) => {
    const sorted = [...data];
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
      
      // Tratar valores nulos
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return order === 'asc' ? 1 : -1;
      if (bVal == null) return order === 'asc' ? -1 : 1;
      
      // Comparar valores
      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal, 'pt-BR');
      } else {
        comparison = String(aVal).localeCompare(String(bVal), 'pt-BR');
      }
      
      return order === 'asc' ? comparison : -comparison;
    });
    return sorted;
  };

  // Paginação com ordenação
  const sortedFormalizacoes = activeTab === 'formalizacao' ? sortData(formalizacaoSearchResult.data, sortColumn, sortOrder) : [];
  const inicioIndice = paginaAtual * itensPorPagina;
  const fimIndice = inicioIndice + itensPorPagina;
  const formalizacoesPaginadas = sortedFormalizacoes.slice(inicioIndice, fimIndice);
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <FileText className="text-white w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                Controle Formalização CGOF-GGCON
              </h1>
            </div>
            <div className="flex items-center gap-8">
              <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {user?.role !== 'usuario' && (
                  <button 
                    onClick={() => setActiveTab('emendas')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'emendas' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Emendas
                  </button>
                )}
                <button 
                  onClick={() => setActiveTab('formalizacao')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'formalizacao' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Formalização
                </button>
                {user?.role === 'admin' && (
                  <button 
                    onClick={() => setActiveTab('admin')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'admin' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Dashboard Formalização
                  </button>
                )}
              </nav>
              <div className="h-8 w-px bg-slate-200 hidden md:block" />
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Buscar demanda, técnico..." 
                  className="pl-10 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 rounded-full text-sm w-64 transition-all outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="h-8 w-px bg-slate-200 hidden md:block mx-1" />
              <button 
                onClick={() => setIsSupabaseGuideOpen(true)}
                className="hidden">
              </button>

              {/* Cache Status Indicator */}
              {cacheStatus && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                  cacheStatus.status === 'ready' ? 'bg-emerald-100 text-emerald-700' :
                  cacheStatus.status === 'loading' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}
                title={`Cache: ${cacheStatus.message}`}
                >
                  {cacheStatus.status === 'loading' && (
                    <>
                      <div className="animate-spin h-3 w-3 border-1.5 border-amber-700 border-t-transparent rounded-full"></div>
                      {cacheStatus.message}
                    </>
                  )}
                  {cacheStatus.status === 'ready' && (
                    <>
                      ✓ {cacheStatus.records?.toLocaleString('pt-BR')} registros ({cacheStatus.duration}ms)
                    </>
                  )}
                  {cacheStatus.status === 'error' && (
                    <>
                      ✗ {cacheStatus.message}
                    </>
                  )}
                </div>
              )}
              <button 
                onClick={() => setIsImportOpen(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-full transition-all"
              >
                <Upload className="w-4 h-4" />
                Importar CSV
              </button>
              
              {/* User dropdown */}
              <div className="relative group">
                <div className="flex items-center gap-3 pl-3 border-l border-slate-200 cursor-pointer hover:opacity-75 transition-opacity">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{user?.nome}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      {user?.role === 'admin' && 'Administrador'}
                      {user?.role === 'intermediario' && 'Intermediário'}
                      {user?.role === 'usuario' && 'Usuário'}
                    </p>
                  </div>
                  <button
                    onClick={() => logout()}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Sair"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Admin menu dropdown */}
                {isAdmin && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <button
                      onClick={() => {
                        setIsUserManagementOpen(true);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 first:rounded-t-lg border-b border-slate-100 font-medium"
                    >
                      <Users className="w-4 h-4" />
                      Gerenciar Usuários
                    </button>
                    <button
                      onClick={async () => {
                        const confirmed = confirm('⚠️ Forçar atualização do cache do banco?\n\nIsso vai recarregar todos os dados.');
                        if (!confirmed) return;
                        
                        try {
                          const response = await fetch('/api/cache/refresh', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            }
                          });
                          
                          if (response.ok) {
                            alert('✅ Cache atualizado com sucesso!');
                            window.location.reload();
                          } else {
                            alert('❌ Erro ao atualizar cache');
                          }
                        } catch (error) {
                          alert('❌ Erro ao conectar com o servidor');
                        }
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 first:rounded-t-lg"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Forçar Atualização BD
                    </button>
                  </div>
                )}
              </div>

              <button 
                onClick={() => {
                  setEditingEmenda(null);
                  setIsFormOpen(true);
                }}
                className="hidden">
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-6">
        {supabaseStatus && !supabaseStatus.supabase && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-8 flex items-start gap-4 shadow-sm">
            <div className="bg-amber-100 p-2 rounded-lg">
              <AlertCircle className="text-amber-600 w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">Supabase não configurado</h4>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                O sistema está operando em modo offline (SQLite). Para salvar os dados na nuvem, configure as Secrets 
                <code className="bg-amber-100 px-1 rounded mx-1 font-mono">SUPABASE_URL</code> e 
                <code className="bg-amber-100 px-1 rounded mx-1 font-mono">SUPABASE_ANON_KEY</code> no AI Studio.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {/* List Section - Full Width */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-500" />
                {activeTab === 'emendas' ? 'Emendas Recentes' : 'Formalizações Recentes'}
              </h2>
              <div className="flex items-center gap-2">
                {activeTab === 'formalizacao' && (
                  <>
                    {/* Botão Atribuir a Técnico - aparece quando há seleção */}
                    {selectedRows.size > 0 && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => setShowAtribuirTecnicoModal(true)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 bg-amber-100 text-amber-700 hover:bg-amber-200"
                      >
                        <User className="w-4 h-4" />
                        Atribuir a Técnico ({selectedRows.size})
                      </motion.button>
                    )}
                    <button
                      onClick={() => setIsFilterOpen(!isFilterOpen)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 ${
                        isFilterOpen ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Filter className="w-4 h-4" />
                      Filtros Avançados
                    </button>
                    <button
                      onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                      className={`relative px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 border ${
                        isColumnMenuOpen 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Settings className="w-4 h-4" />
                      Colunas
                      <span className={`ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                        isColumnMenuOpen ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {Object.values(visibleColumns).filter(Boolean).length}/{Object.keys(visibleColumns).length}
                      </span>
                      
                      {isColumnMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-2xl p-3 z-50 min-w-64 max-h-96 overflow-y-auto"
                             onClick={(e) => e.stopPropagation()}>
                          <p className="text-xs font-semibold text-slate-600 mb-2 uppercase sticky top-0 bg-white pb-2">Mostrar/Ocultar Colunas</p>
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
                              <label key={col.key} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded" onClick={(e) => e.stopPropagation()}>
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
                                  className="w-3 h-3 rounded"
                                />
                                <span className="text-xs text-slate-700">{col.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </button>
                  </>
                )}
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                  {activeTab === 'formalizacao' ? `${filteredFormalizacoes.length}/${formalizacoes.length}` : `${filteredEmendas.length}/${emendas.length}`} registros
                </span>
              </div>
            </div>

            {/* Filtros Avançados de Formalização - Multi-select com busca */}
            {activeTab === 'formalizacao' && isFilterOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-4 mb-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-700">Filtros Avançados</h3>
                  <button
                    onClick={() => setIsFilterOpen(false)}
                    className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-slate-500 hover:text-red-600"
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
                    onClick={() =>
                      setFilters({
                        ano: [],
                        demandas_formalizacao: [],
                        area_estagio: [],
                        recurso: [],
                        tecnico: [],
                        data_liberacao: [],
                        area_estagio_situacao_demanda: [],
                        situacao_analise_demanda: [],
                        data_analise_demanda: [],
                        conferencista: [],
                        data_recebimento_demanda: [],
                        data_retorno: [],
                        falta_assinatura: [],
                        publicacao: [],
                        vigencia: [],
                        encaminhado_em: [],
                        concluida_em: [],
                        parlamentar: [],
                        partido: [],
                        regional: [],
                        municipio: [],
                        conveniado: [],
                        objeto: [],
                      })
                    }
                    className="px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-100 rounded-lg transition-all"
                  >
                    Limpar Filtros
                  </button>
                </div>
              </motion.div>
            )}

            {/* Stats Summary */}
            {activeTab === 'emendas' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total em Emendas</p>
                  <p className="text-xl font-bold text-slate-900">
                    {formatCurrency(emendas.reduce((acc, curr) => acc + (curr.valor || 0), 0))}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Desembolsado</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {formatCurrency(emendas.reduce((acc, curr) => acc + (curr.valor_desembolsado || 0), 0))}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Saldo a Liberar</p>
                  <p className="text-xl font-bold text-indigo-600">
                    {formatCurrency(emendas.reduce((acc, curr) => acc + ((curr.valor || 0) - (curr.valor_desembolsado || 0)), 0))}
                  </p>
                </div>
              </div>
            ) : null}

            {activeTab === 'admin' ? (
              <AdminPanel />
            ) : loading || (activeTab === 'formalizacao' && formalizacaoSearchResult.loading) ? (
              <div className="flex flex-col justify-center items-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-b-indigo-600 mb-4"></div>
                <p className="text-slate-600 font-medium">Carregando {activeTab === 'emendas' ? 'emendas' : 'formalizações'}...</p>
                <p className="text-slate-400 text-sm mt-1">Por favor, aguarde.</p>
              </div>
            ) : (activeTab === 'emendas' ? filteredEmendas : filteredFormalizacoes).length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="text-slate-400 w-8 h-8" />
                </div>
                <h3 className="text-slate-900 font-medium">Nenhum registro encontrado</h3>
                <p className="text-slate-500 text-sm mt-1">Tente ajustar sua busca ou importe novos dados.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeTab === 'emendas' ? (
                  filteredEmendas.map((emenda, index) => (
                    <motion.div
                      layout
                      key={`emenda-${emenda.id || 'unknown'}-${index}`}
                      onClick={() => setSelectedEmenda(emenda)}
                      className={`group bg-white border rounded-lg p-3 cursor-pointer transition-all hover:shadow-lg hover:border-indigo-200 ${selectedEmenda?.id === emenda.id ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                            {emenda.parlamentar?.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-sm truncate">
                              {emenda.parlamentar}
                            </h3>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <span className="font-semibold text-indigo-500">{emenda.partido}</span>
                              <span>•</span>
                              <span>{emenda.ano_refer}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right whitespace-nowrap ml-2">
                          <p className="text-xs font-bold text-slate-900">{formatCurrency(emenda.valor)}</p>
                          <span className={`text-[9px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded ${
                            emenda.status === 'Pago' ? 'bg-emerald-100 text-emerald-700' : 
                            emenda.status === 'Em Processo' ? 'bg-amber-100 text-amber-700' : 
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {emenda.status || 'Pendente'}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="flex items-center gap-1 text-slate-600 min-w-0">
                          <User className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="truncate">{emenda.beneficiario}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-600">
                          <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="truncate">Vig: {emenda.vigencia || 'N/A'}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    {/* Header com Estatísticas da Página */}
                    <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-slate-200">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status da Página</p>
                          <p className="text-sm text-slate-700">
                            <span className="font-bold text-indigo-600">{formalizacoesPaginadas.length}</span>
                            {' '}
                            registro{formalizacoesPaginadas.length !== 1 ? 's' : ''} de 
                            {' '}
                            <span className="font-bold text-indigo-600">{formalizacaoSearchResult.total.toLocaleString('pt-BR')}</span>
                            {' '}
                            total
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div 
                      ref={tableContainerRef}
                      onMouseDown={handleTableMouseDown}
                      onMouseMove={handleTableMouseMove}
                      onMouseUp={handleTableMouseUp}
                      onMouseLeave={handleTableMouseLeave}
                      className={`overflow-x-auto bg-white border-b-2 border-slate-200 select-none user-select-none ${isDraggingScroll ? 'cursor-grabbing' : 'cursor-grab'}`}
                      style={{ WebkitUserSelect: 'none', userSelect: 'none', minHeight: '500px' }}
                    >
                      {(() => {
                        const columnDefinitions = [
                          { key: 'seq', label: 'Seq', render: (f: any) => '—' },
                          { key: 'ano', label: 'Ano', render: (f: any) => f.ano },
                          { key: 'parlamentar', label: 'Parlamentar', render: (f: any) => f.parlamentar },
                          { key: 'partido', label: 'Partido', render: (f: any) => f.partido },
                          { key: 'emenda', label: 'Emenda', render: (f: any) => f.emenda },
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
                          { key: 'assinatura', label: 'Assinatura', render: (f: any) => f.assinatura },
                          { key: 'publicacao', label: 'Publicação', render: (f: any) => f.publicacao },
                          { key: 'vigencia', label: 'Vigência', render: (f: any) => f.vigencia },
                          { key: 'encaminhado_em', label: 'Encaminhado em', render: (f: any) => f.encaminhado_em?.substring(0, 10) || '—' },
                          { key: 'concluida_em', label: 'Concluída em', render: (f: any) => f.concluida_em?.substring(0, 10) || '—' }
                        ];
                        
                        const visibleCols = columnDefinitions.filter(col => visibleColumns[col.key as keyof typeof visibleColumns]);
                        return (
                          <table className="min-w-fit text-sm">
                            <thead className="bg-slate-100 border-b-2 border-slate-300 sticky top-0">
                              <tr>
                                {/* Header do checkbox */}
                                <th className="px-3 py-2 w-12 bg-slate-100">
                                  <input
                                    type="checkbox"
                                    checked={selectedRows.size > 0 && selectedRows.size === formalizacoesPaginadas.length}
                                    onChange={() => {
                                      if (selectedRows.size > 0 && selectedRows.size === formalizacoesPaginadas.length) {
                                        setSelectedRows(new Set());
                                      } else {
                                        const newSelected = new Set(selectedRows);
                                        // Usar APENAS IDs válidos, NUNCA usar index como fallback
                                        formalizacoesPaginadas.forEach((f) => {
                                          if (f.id) {
                                            newSelected.add(String(f.id).trim());
                                          } else {
                                            console.warn('⚠️ Registro sem ID na página:', f);
                                          }
                                        });
                                        console.log(`📋 Selecionados ${newSelected.size} registros (total na página: ${formalizacoesPaginadas.length})`);
                                        setSelectedRows(newSelected);
                                      }
                                    }}
                                    className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer w-4 h-4"
                                    title="Selecionar tudo na página"
                                  />
                                </th>
                                {visibleCols.map(col => (
                                  <th 
                                    key={col.key}
                                    ref={(el) => {
                                      if (el) columnHeaderRefs.current[col.key] = el;
                                    }}
                                    onClick={() => {
                                      console.log(`📊 Header clicked: ${col.key}, Current sort: ${sortColumn}/${sortOrder}`);
                                      
                                      // Scroll horizontal até a coluna
                                      const headerEl = columnHeaderRefs.current[col.key];
                                      if (headerEl && tableContainerRef.current) {
                                        const containerLeft = tableContainerRef.current.scrollLeft;
                                        const containerWidth = tableContainerRef.current.clientWidth;
                                        const headerLeft = headerEl.offsetLeft;
                                        const headerWidth = headerEl.offsetWidth;
                                        
                                        // Calcular posição para colocar a coluna no centro
                                        const targetScroll = headerLeft - (containerWidth / 2) + (headerWidth / 2);
                                        
                                        console.log(`🔄 Scrolling to ${targetScroll}px (container width: ${containerWidth}px)`);
                                        
                                        tableContainerRef.current.scrollTo({
                                          left: targetScroll,
                                          behavior: 'smooth'
                                        });
                                      }
                                      
                                      // Atualizar ordenação
                                      if (sortColumn === col.key) {
                                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                      } else {
                                        setSortColumn(col.key);
                                        setSortOrder('asc');
                                      }
                                    }}
                                    className={`px-3 py-2 text-left font-bold text-slate-700 text-xs whitespace-nowrap cursor-pointer hover:bg-slate-200 transition-colors ${
                                      col.align === 'right' ? 'text-right' : ''
                                    } ${sortColumn === col.key ? 'bg-indigo-200' : ''}`}
                                    title={`Clique para ordenar por ${col.label}`}
                                  >
                                    <span className="flex items-center gap-1">
                                      {col.label}
                                      {sortColumn === col.key && (
                                        <span className="ml-1 text-indigo-600">
                                          {sortOrder === 'asc' ? '▲' : '▼'}
                                        </span>
                                      )}
                                    </span>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {formalizacoesPaginadas.length === 0 ? (
                                <tr>
                                  <td colSpan={visibleCols.length + 1} className="px-4 py-8 text-center text-slate-500 font-medium">
                                    {formalizacaoSearchResult.loading ? 'Carregando registros...' : 'Nenhum registro encontrado com os filtros selecionados'}
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
                                        ? 'bg-indigo-100 border-l-4 border-indigo-600' 
                                        : isRowSelected
                                        ? 'bg-yellow-50 border-l-4 border-yellow-400'
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
                                        className={`px-3 py-1.5 text-slate-700 truncate text-xs ${col.align === 'right' ? 'text-right font-semibold text-emerald-600' : ''}`}
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

                  {/* Paginação para Formalização */}
                  <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-between items-center flex-wrap gap-4">
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
                          // Usar o primeiro ID selecionado para abrir o modal (mas versão em lote)
                          // Vou criar um estado separado para lote
                          setShowDeleteFormalizacaoModal(true);
                          setFormalizacaoParaDeletar(null); // Null indica modo lote
                        }}
                        className="px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 shadow-md"
                      >
                        <Trash2 className="w-4 h-4" />
                        Deletar {selectedRows.size} Selecionad{selectedRows.size === 1 ? 'a' : 'as'}
                      </motion.button>
                    )}
                    <button
                      onClick={() => fetchFormalizacoesComFiltros(0)}
                      disabled={paginaAtual === 0 || formalizacaoSearchResult.loading}
                      className="px-3 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      title="Primeira página"
                    >
                      ⏮ Primeiro
                    </button>
                    <button
                      onClick={() => fetchFormalizacoesComFiltros(Math.max(0, paginaAtual - 1))}
                      disabled={paginaAtual === 0 || formalizacaoSearchResult.loading}
                      className="px-3 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      title="Página anterior"
                    >
                      ◀ Anterior
                    </button>
                    <div className="flex items-center gap-1 px-2">
                      {Array.from({ length: Math.min(5, totalPaginas) }).map((_, i) => {
                        const pagina = Math.max(0, Math.min(paginaAtual > 2 ? paginaAtual - 2 + i : i, totalPaginas - 1));
                        return (
                          <button
                            key={pagina}
                            onClick={() => fetchFormalizacoesComFiltros(pagina)}
                            disabled={formalizacaoSearchResult.loading}
                            className={`px-2.5 py-1.5 text-sm font-bold rounded-lg transition-all ${
                              paginaAtual === pagina
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {pagina + 1}
                          </button>
                        );
                      })}
                    </div>
                    <button
                        onClick={() => fetchFormalizacoesComFiltros(Math.min(totalPaginas - 1, paginaAtual + 1))}
                        disabled={paginaAtual >= totalPaginas - 1 || formalizacaoSearchResult.loading}
                        className="px-3 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        title="Próxima página"
                      >
                        Próximo ▶
                      </button>
                      <button
                        onClick={() => fetchFormalizacoesComFiltros(totalPaginas - 1)}
                        disabled={paginaAtual >= totalPaginas - 1 || formalizacaoSearchResult.loading}
                        className="px-3 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        title="Última página"
                      >
                        ⏭
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Detail Modal Overlay */}
          <AnimatePresence>
            {(activeTab === 'emendas' && selectedEmenda) || (activeTab === 'formalizacao' && selectedFormalizacao) ? (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => activeTab === 'emendas' ? setSelectedEmenda(null) : setSelectedFormalizacao(null)}
                  className="fixed inset-0 bg-black/40 z-40"
                />
                
                {/* Detail Panel Modal */}
                <motion.div
                  initial={{ x: '100%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '100%', opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="fixed right-0 top-0 bottom-0 z-50 w-full lg:w-1/2 bg-white shadow-2xl overflow-y-auto"
                >
                  {activeTab === 'emendas' && selectedEmenda ? (
                    <div className="flex flex-col h-full">
                      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start flex-shrink-0">
                        <div className="flex-1">
                          <h2 className="text-lg font-bold text-slate-900 leading-tight mb-1">
                            {selectedEmenda.parlamentar}
                          </h2>
                          <p className="text-xs text-slate-500">{selectedEmenda.partido} • {selectedEmenda.municipio}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0 ml-2">
                          <button 
                            onClick={() => {
                              setEditingEmenda(selectedEmenda);
                              setIsFormOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(selectedEmenda.id!)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setSelectedEmenda(null)}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="overflow-y-auto flex-1 p-6 space-y-6">
                    <section>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Informações Básicas</h4>
                      <div className="space-y-3">
                        <DetailItem label="Objeto" value={selectedEmenda.objeto} />
                        <DetailItem label="Beneficiário" value={selectedEmenda.beneficiario} />
                        <DetailItem label="CNPJ" value={selectedEmenda.cnpj} />
                        <DetailItem label="Ano Referência" value={selectedEmenda.ano_refer} />
                        <DetailItem label="Nº Emenda" value={selectedEmenda.num_emenda} />
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Valores e Status</h4>
                      <div className="bg-indigo-50 rounded-2xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-indigo-600 font-medium">Valor Total</span>
                          <span className="text-lg font-bold text-indigo-900">{formatCurrency(selectedEmenda.valor)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Desembolsado</span>
                          <span className="text-sm font-semibold text-slate-700">{formatCurrency(selectedEmenda.valor_desembolsado)}</span>
                        </div>
                        <div className="pt-2 border-t border-indigo-100 flex justify-between items-center">
                          <span className="text-xs text-slate-500">Status Atual</span>
                          <span className="text-xs font-bold text-indigo-600">{selectedEmenda.status}</span>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Formalização</h4>
                      <div className="space-y-3">
                        <DetailItem label="Nº Convênio" value={selectedEmenda.num_convenio} />
                        <DetailItem label="Nº Processo" value={selectedEmenda.num_processo} />
                        <DetailItem label="Vigência" value={selectedEmenda.vigencia} />
                        <DetailItem label="Assinatura" value={selectedEmenda.data_assinatura} />
                        <DetailItem label="Publicação" value={selectedEmenda.data_publicacao} />
                      </div>
                    </section>
                      </div>
                    </div>
                  ) : activeTab === 'formalizacao' && selectedFormalizacao ? (
                    <div className="flex flex-col h-full">
                      <div className="p-4 border-b border-slate-100 bg-emerald-50/50 flex justify-between items-start flex-shrink-0">
                        <div className="flex-1">
                          <h2 className="text-lg font-bold text-slate-900 leading-tight mb-1">
                            {selectedFormalizacao.parlamentar}
                          </h2>
                          <p className="text-xs text-slate-500">{selectedFormalizacao.partido} • {selectedFormalizacao.municipio}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0 ml-2">
                          <button 
                            onClick={() => {
                              setEditingFormalizacao(selectedFormalizacao);
                              setIsFormalizacaoFormOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteFormalizacao(selectedFormalizacao.id!)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setSelectedFormalizacao(null)}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="overflow-y-auto flex-1 p-6 space-y-6">
                    <section>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Identificação e Objeto</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <DetailItem label="Ano" value={selectedFormalizacao.ano} />
                        <DetailItem label="Parlamentar" value={selectedFormalizacao.parlamentar} />
                        <DetailItem label="Partido" value={selectedFormalizacao.partido} />
                        <DetailItem label="Emenda" value={selectedFormalizacao.emenda} />
                        <DetailItem label="Emendas Agregadoras" value={selectedFormalizacao.emendas_agregadoras} />
                        <DetailItem label="Demanda" value={selectedFormalizacao.demanda} />
                        <DetailItem label="Demandas Formalização" value={selectedFormalizacao.demandas_formalizacao} />
                        <DetailItem label="Portfólio" value={selectedFormalizacao.portfolio} />
                      </div>
                      <div className="mt-3">
                        <DetailItem label="Objeto" value={selectedFormalizacao.objeto} />
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Localização e Convênio</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <DetailItem label="Regional" value={selectedFormalizacao.regional} />
                        <DetailItem label="Município" value={selectedFormalizacao.municipio} />
                        <DetailItem label="Conveniado" value={selectedFormalizacao.conveniado} />
                        <DetailItem label="Nº Convênio" value={selectedFormalizacao.num_convenio} />
                        <DetailItem label="Classificação" value={selectedFormalizacao.classificacao} />
                        <DetailItem label="Tipo de Formalização" value={selectedFormalizacao.tipo_formalizacao} />
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Financeiro</h4>
                      <div className="bg-emerald-50 rounded-2xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-emerald-600 font-medium">Valor Total</span>
                          <span className="text-lg font-bold text-emerald-900">{formatCurrency(selectedFormalizacao.valor)}</span>
                        </div>
                        <DetailItem label="Recurso" value={selectedFormalizacao.recurso} />
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Estágio e Situação</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <DetailItem label="Posição Anterior" value={selectedFormalizacao.posicao_anterior} />
                        <DetailItem label="Situação SemPapel" value={selectedFormalizacao.situacao_demandas_sempapel} />
                        <DetailItem label="Área - estágio" value={selectedFormalizacao.area_estagio} />
                        <DetailItem label="Técnico" value={selectedFormalizacao.tecnico} />
                        <DetailItem label="Data da Liberação" value={selectedFormalizacao.data_liberacao} />
                        <DetailItem label="Área - Estágio Situação" value={selectedFormalizacao.area_estagio_situacao_demanda} />
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Análise e Diligência</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <DetailItem label="Situação Análise" value={selectedFormalizacao.situacao_analise_demanda} />
                        <DetailItem label="Data Análise" value={selectedFormalizacao.data_analise_demanda} />
                        <DetailItem label="Motivo Retorno Diligência" value={selectedFormalizacao.motivo_retorno_diligencia} />
                        <DetailItem label="Data Retorno Diligência" value={selectedFormalizacao.data_retorno_diligencia} />
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Tramitação e Assinatura</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <DetailItem label="Conferencista" value={selectedFormalizacao.conferencista} />
                        <DetailItem label="Data Recebimento" value={selectedFormalizacao.data_recebimento_demanda} />
                        <DetailItem label="Data do Retorno" value={selectedFormalizacao.data_retorno} />
                        <DetailItem label="Data Lib. Assinatura Conf." value={selectedFormalizacao.data_liberacao_assinatura_conferencista} />
                        <DetailItem label="Data Lib. Assinatura" value={selectedFormalizacao.data_liberacao_assinatura} />
                        <DetailItem label="Falta Assinatura" value={selectedFormalizacao.falta_assinatura} />
                        <DetailItem label="Assinatura" value={selectedFormalizacao.assinatura} />
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Prazos e Conclusão</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <DetailItem label="Publicação" value={selectedFormalizacao.publicacao} />
                        <DetailItem label="Vigência" value={selectedFormalizacao.vigencia} />
                        <DetailItem label="Encaminhado em" value={selectedFormalizacao.encaminhado_em} />
                        <DetailItem label="Concluída em" value={selectedFormalizacao.concluida_em} />
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Observações</h4>
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {selectedFormalizacao.observacao_motivo_retorno || 'Nenhuma observação registrada.'}
                      </p>
                    </section>
                      </div>
                    </div>
                  ) : null}
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
                  <DbIcon className="w-6 h-6 text-indigo-600" />
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
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-2">
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

      {/* Import Modal */}
      <AnimatePresence>
        {isImportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsImportOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-emerald-50 p-3 rounded-2xl">
                  <Upload className="w-6 h-6 text-emerald-600" />
                </div>
                <button onClick={() => setIsImportOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Importar Dados</h2>
              <p className="text-slate-500 text-sm mb-8">Selecione um arquivo CSV para carregar as emendas em massa.</p>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group"
              >
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                {importing ? (
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
                    <p className="text-sm font-medium text-slate-600">Processando arquivo...</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="text-slate-400 w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-900">Clique para selecionar</p>
                    <p className="text-xs text-slate-500 mt-1">Apenas arquivos .csv</p>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {editingEmenda ? 'Editar Emenda' : 'Nova Emenda Parlamentar'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Preencha os campos abaixo para registrar a emenda no sistema.</p>
                </div>
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Basic Info */}
                  <div className="md:col-span-3">
                    <h3 className="text-sm font-bold text-indigo-600 mb-4 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Informações do Parlamentar e Beneficiário
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input label="Parlamentar" name="parlamentar" defaultValue={editingEmenda?.parlamentar} required />
                      <Input label="Partido" name="partido" defaultValue={editingEmenda?.partido} />
                      <Input label="Ano Referência" name="ano_refer" defaultValue={editingEmenda?.ano_refer} />
                      <Input label="Beneficiário" name="beneficiario" defaultValue={editingEmenda?.beneficiario} />
                      <Input label="CNPJ" name="cnpj" defaultValue={editingEmenda?.cnpj} />
                      <Input label="Município" name="municipio" defaultValue={editingEmenda?.municipio} />
                    </div>
                  </div>

                  {/* Amendment Details */}
                  <div className="md:col-span-3">
                    <h3 className="text-sm font-bold text-indigo-600 mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Detalhes da Emenda
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input label="Nº Emenda" name="num_emenda" defaultValue={editingEmenda?.num_emenda} />
                      <Input label="Código/Nº" name="codigo_num" defaultValue={editingEmenda?.codigo_num} />
                      <Input label="Objeto" name="objeto" defaultValue={editingEmenda?.objeto} className="md:col-span-2" />
                      <Input label="Natureza" name="natureza" defaultValue={editingEmenda?.natureza} />
                      <Input label="Regional" name="regional" defaultValue={editingEmenda?.regional} />
                      <Input label="Órgão Entidade" name="orgao_entidade" defaultValue={editingEmenda?.orgao_entidade} />
                    </div>
                  </div>

                  {/* Values */}
                  <div className="md:col-span-3">
                    <h3 className="text-sm font-bold text-indigo-600 mb-4 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Valores e Financeiro
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input label="Valor Total" name="valor" type="number" step="0.01" defaultValue={editingEmenda?.valor} />
                      <Input label="Valor Desembolsado" name="valor_desembolsado" type="number" step="0.01" defaultValue={editingEmenda?.valor_desembolsado} />
                      <Select label="Status" name="status" defaultValue={editingEmenda?.status}>
                        <option value="Pendente">Pendente</option>
                        <option value="Em Processo">Em Processo</option>
                        <option value="Formalizado">Formalizado</option>
                        <option value="Pago">Pago</option>
                        <option value="Cancelado">Cancelado</option>
                      </Select>
                    </div>
                  </div>

                  {/* Formalization */}
                  <div className="md:col-span-3">
                    <h3 className="text-sm font-bold text-indigo-600 mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Formalização e Convênio
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input label="Nº Convênio" name="num_convenio" defaultValue={editingEmenda?.num_convenio} />
                      <Input label="Nº Processo" name="num_processo" defaultValue={editingEmenda?.num_processo} />
                      <Input label="Vigência" name="vigencia" type="date" defaultValue={editingEmenda?.vigencia} />
                      <Input label="Data Assinatura" name="data_assinatura" type="date" defaultValue={editingEmenda?.data_assinatura} />
                      <Input label="Data Publicação" name="data_publicacao" type="date" defaultValue={editingEmenda?.data_publicacao} />
                      <Input label="Qtd. Dias" name="qtd_dias" type="number" defaultValue={editingEmenda?.qtd_dias} />
                    </div>
                  </div>

                  {/* Banking */}
                  <div className="md:col-span-3">
                    <h3 className="text-sm font-bold text-indigo-600 mb-4 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Dados Bancários
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input label="Agência" name="agencia" defaultValue={editingEmenda?.agencia} />
                      <Input label="Conta" name="conta" defaultValue={editingEmenda?.conta} />
                      <Input label="Dados Bancários" name="dados_bancarios" defaultValue={editingEmenda?.dados_bancarios} className="md:col-span-3" />
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
                  >
                    {editingEmenda ? 'Atualizar Registro' : 'Salvar Emenda'}
                  </button>
                </div>
              </form>
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
              className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {editingFormalizacao ? 'Editar Demanda' : 'Nova Demanda'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Preencha os campos abaixo para atualizar as informações da demanda.</p>
                </div>
                <button 
                  onClick={() => setIsFormalizacaoFormOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleSubmitFormalizacao} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Estágio e Recurso Técnico */}
                  <div className="md:col-span-3">
                    <h3 className="text-sm font-bold text-emerald-600 mb-4 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Estágio e Recurso Técnico
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input label="Área - Estágio" name="area_estagio" defaultValue={editingFormalizacao?.area_estagio} disabled={user?.role === 'usuario' ? false : false} />
                      <Input label="Recurso" name="recurso" defaultValue={editingFormalizacao?.recurso} disabled={user?.role === 'usuario'} />
                      <Input label="Técnico" name="tecnico" defaultValue={editingFormalizacao?.tecnico} disabled={user?.role === 'usuario'} />
                      <Input label="Data da Liberação" name="data_liberacao" type="date" defaultValue={editingFormalizacao?.data_liberacao} disabled={user?.role === 'usuario'} />
                      <Input label="Área - Estágio Situação" name="area_estagio_situacao_demanda" defaultValue={editingFormalizacao?.area_estagio_situacao_demanda} disabled={user?.role === 'usuario'} />
                    </div>
                  </div>

                  {/* Análise e Diligência */}
                  <div className="md:col-span-3">
                    <h3 className="text-sm font-bold text-emerald-600 mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Situação da Demanda - Análise
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input label="Situação da Demanda" name="situacao_analise_demanda" defaultValue={editingFormalizacao?.situacao_analise_demanda} disabled={user?.role === 'usuario' ? false : false} />
                      <Input label="Data - Análise Demanda" name="data_analise_demanda" type="date" defaultValue={editingFormalizacao?.data_analise_demanda} disabled={user?.role === 'usuario' ? false : false} />
                      <Input label="Motivo do Retorno da Diligência" name="motivo_retorno_diligencia" defaultValue={editingFormalizacao?.motivo_retorno_diligencia} disabled={user?.role === 'usuario' ? false : false} />
                      <Input label="Data do Retorno da Diligência" name="data_retorno_diligencia" type="date" defaultValue={editingFormalizacao?.data_retorno_diligencia} disabled={user?.role === 'usuario' ? false : false} />
                    </div>
                  </div>

                  {/* Tramitação e Assinatura */}
                  <div className="md:col-span-3">
                    <h3 className="text-sm font-bold text-emerald-600 mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Tramitação e Assinatura
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input label="Conferencista" name="conferencista" defaultValue={editingFormalizacao?.conferencista} disabled={user?.role === 'usuario'} />
                      <Input label="Data Recebimento Demanda" name="data_recebimento_demanda" type="date" defaultValue={editingFormalizacao?.data_recebimento_demanda} disabled={user?.role === 'usuario'} />
                      <Input label="Data do Retorno" name="data_retorno" type="date" defaultValue={editingFormalizacao?.data_retorno} disabled={user?.role === 'usuario' ? false : false} />
                      <Input label="Obs. - Motivo do Retorno" name="observacao_motivo_retorno" defaultValue={editingFormalizacao?.observacao_motivo_retorno} className="md:col-span-3" disabled={user?.role === 'usuario' ? false : false} />
                      <Input label="Data Lib. Assinatura - Conferencista" name="data_liberacao_assinatura_conferencista" type="date" defaultValue={editingFormalizacao?.data_liberacao_assinatura_conferencista} disabled={user?.role === 'usuario' ? false : false} />
                      <Input label="Data Lib. de Assinatura" name="data_liberacao_assinatura" type="date" defaultValue={editingFormalizacao?.data_liberacao_assinatura} disabled={user?.role === 'usuario'} />
                      <Input label="Falta Assinatura" name="falta_assinatura" defaultValue={editingFormalizacao?.falta_assinatura} disabled={user?.role === 'usuario'} />
                      <Input label="Assinatura" name="assinatura" type="date" defaultValue={editingFormalizacao?.assinatura} disabled={user?.role === 'usuario'} />
                    </div>
                  </div>

                  {/* Prazos e Conclusão */}
                  <div className="md:col-span-3">
                    <h3 className="text-sm font-bold text-emerald-600 mb-4 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Prazos e Conclusão
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input label="Publicação" name="publicacao" type="date" defaultValue={editingFormalizacao?.publicacao} disabled={user?.role === 'usuario'} />
                      <Input label="Vigência" name="vigencia" defaultValue={editingFormalizacao?.vigencia} disabled={user?.role === 'usuario'} />
                      <Input label="Encaminhado em" name="encaminhado_em" type="date" defaultValue={editingFormalizacao?.encaminhado_em} disabled={user?.role === 'usuario'} />
                      <Input label="Concluída em" name="concluida_em" type="date" defaultValue={editingFormalizacao?.concluida_em} disabled={user?.role === 'usuario'} />
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsFormalizacaoFormOpen(false)}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95"
                  >
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
                        setFormalizacaoSearchResult((prev: any) => ({
                          ...prev,
                          data: prev.data.map((f: any) => {
                            const updated = result.updatedRecords.find((r: any) => r.id === f.id);
                            return updated ? { ...f, ...updated } : f;
                          })
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
    </div>
  );
}

function DetailItem({ label, value }: { label: string, value?: string | number }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
      <span className="text-sm text-slate-700 font-medium">{value || '—'}</span>
    </div>
  );
}

function Input({ label, className = '', disabled = false, ...props }: any) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-xs font-bold text-slate-500 ml-1">{label}</label>
      <input 
        disabled={disabled}
        className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
        {...props}
      />
    </div>
  );
}

function Select({ label, children, className = '', ...props }: any) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-xs font-bold text-slate-500 ml-1">{label}</label>
      <select 
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
