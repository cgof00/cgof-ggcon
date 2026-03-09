/**
 * EmendasDataTable.tsx
 * Componente de tabela especializado para Emendas
 * Estilo distinto (teal/emerald) para diferenciar de Formalização (azul)
 */

import React, { useState, useRef, useEffect } from 'react';
import { Filter } from 'lucide-react';

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
  [key: string]: any;
}

interface ColumnDef {
  key: string;
  label: string;
  render: (row: Emenda) => React.ReactNode;
  align?: 'left' | 'right';
}

interface EmendasDataTableProps {
  data: Emenda[];
  loading?: boolean;
  visibleColumns: Record<string, boolean>;
  sortColumn: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (column: string, order: 'asc' | 'desc') => void;
  onRowClick?: (row: Emenda) => void;
  selectedEmenda?: Emenda | null;
  formatCurrency: (value?: number) => string;
  formatDate: (dateStr: string) => string;
}

export function EmendasDataTable({
  data,
  loading = false,
  visibleColumns,
  sortColumn,
  sortOrder,
  onSortChange,
  onRowClick,
  selectedEmenda,
  formatCurrency,
  formatDate,
}: EmendasDataTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const columnHeaderRefs = useRef<Record<string, HTMLTableCellElement | null>>({});
  const headerFilterRef = useRef<HTMLDivElement>(null);

  // Drag scroll
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0, hasMoved: false });

  // Header filter state
  const [headerFilterOpen, setHeaderFilterOpen] = useState<string | null>(null);
  const [headerFilterSearch, setHeaderFilterSearch] = useState('');
  const [headerFilters, setHeaderFilters] = useState<Record<string, string[]>>({});
  const [hideEmpty, setHideEmpty] = useState<Record<string, boolean>>({});

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

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = tableContainerRef.current;
    if (!container) return;
    dragState.current = { isDown: true, startX: e.pageX, scrollLeft: container.scrollLeft, hasMoved: false };
    setIsDragging(true);
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragState.current.isDown) return;
    const container = tableContainerRef.current;
    if (!container) return;
    const walk = e.pageX - dragState.current.startX;
    if (Math.abs(walk) > 3) {
      dragState.current.hasMoved = true;
      container.scrollLeft = dragState.current.scrollLeft - walk;
    }
  };
  const handleMouseUp = () => { dragState.current.isDown = false; setIsDragging(false); };

  const columnDefinitions: ColumnDef[] = [
    { key: 'ano_refer', label: 'Ano', render: (e) => e.ano_refer || '—' },
    { key: 'codigo_num', label: 'Código/Nº Emenda', render: (e) => e.codigo_num || '—' },
    { key: 'num_emenda', label: 'Nº Emenda Agregadora', render: (e) => e.num_emenda || '—' },
    { key: 'natureza', label: 'Natureza', render: (e) => e.natureza || '—' },
    { key: 'parlamentar', label: 'Parlamentar', render: (e) => e.parlamentar || '—' },
    { key: 'partido', label: 'Partido', render: (e) => e.partido || '—' },
    { key: 'beneficiario', label: 'Beneficiário', render: (e) => e.beneficiario || '—' },
    { key: 'cnpj', label: 'CNPJ', render: (e) => e.cnpj || '—' },
    { key: 'tipo_beneficiario', label: 'Tipo Beneficiário', render: (e) => e.tipo_beneficiario || '—' },
    { key: 'municipio', label: 'Município', render: (e) => e.municipio || '—' },
    { key: 'regional', label: 'Regional', render: (e) => e.regional || '—' },
    { key: 'objeto', label: 'Objeto', render: (e) => e.objeto ? (e.objeto.length > 60 ? e.objeto.substring(0, 60) + '...' : e.objeto) : '—' },
    { key: 'valor', label: 'Valor', render: (e) => formatCurrency(e.valor), align: 'right' },
    { key: 'valor_desembolsado', label: 'Valor Demanda', render: (e) => formatCurrency(e.valor_desembolsado), align: 'right' },
    { key: 'num_convenio', label: 'Nº Convênio', render: (e) => e.num_convenio || '—' },
    { key: 'num_processo', label: 'Nº Processo', render: (e) => e.num_processo || '—' },
    { key: 'situacao_e', label: 'Situação Emenda', render: (e) => e.situacao_e || '—' },
    { key: 'situacao_d', label: 'Situação Demanda', render: (e) => e.situacao_d || '—' },
    { key: 'status', label: 'Status Pagamento', render: (e) => e.status || '—' },
    { key: 'parecer_ld', label: 'Parecer LDO', render: (e) => e.parecer_ld || '—' },
    { key: 'orgao_entidade', label: 'Órgão/Entidade', render: (e) => e.orgao_entidade || '—' },
    { key: 'portfolio', label: 'Portfólio', render: (e) => e.portfolio || '—' },
    { key: 'vigencia', label: 'Vigência', render: (e) => formatDate(e.vigencia || '') },
    { key: 'data_assinatura', label: 'Assinatura', render: (e) => formatDate(e.data_assinatura || '') },
    { key: 'data_publicacao', label: 'Publicação', render: (e) => formatDate(e.data_publicacao || '') },
    { key: 'data_pagamento', label: 'Data Pagamento', render: (e) => formatDate(e.data_pagamento || '') },
    { key: 'agencia', label: 'Agência', render: (e) => e.agencia || '—' },
    { key: 'conta', label: 'Conta', render: (e) => e.conta || '—' },
    { key: 'dados_bancarios', label: 'Dados Bancários', render: (e) => e.dados_bancarios || '—' },
    { key: 'qtd_dias', label: 'Qtd. Dias', render: (e) => e.qtd_dias != null ? String(e.qtd_dias) : '—' },
    { key: 'detalhes', label: 'Detalhes Demanda', render: (e) => e.detalhes ? (e.detalhes.length > 60 ? e.detalhes.substring(0, 60) + '...' : e.detalhes) : '—' },
    { key: 'notas_empenho', label: 'Notas Empenho', render: (e) => e.notas_empenho || '—' },
    { key: 'valor_total_empenhado', label: 'Total Empenho', render: (e) => formatCurrency(e.valor_total_empenhado), align: 'right' },
    { key: 'notas_liquidacao', label: 'Notas Liquidação', render: (e) => e.notas_liquidacao || '—' },
    { key: 'valor_total_liquidado', label: 'Total Liquidado', render: (e) => formatCurrency(e.valor_total_liquidado), align: 'right' },
    { key: 'programa', label: 'Programa Desembolso', render: (e) => e.programa || '—' },
    { key: 'valor_total_pago', label: 'Total Pago', render: (e) => formatCurrency(e.valor_total_pago), align: 'right' },
    { key: 'ordem_bancaria', label: 'Ordem Bancária', render: (e) => e.ordem_bancaria || '—' },
    { key: 'data_paga', label: 'Data Ordem Bancária', render: (e) => formatDate(e.data_paga || '') },
    { key: 'valor_total_ordem_bancaria', label: 'Total Ordem Bancária', render: (e) => formatCurrency(e.valor_total_ordem_bancaria), align: 'right' },
  ];

  const visibleCols = columnDefinitions.filter(col => visibleColumns[col.key]);

  // Get filter options for a column from current data
  const getFilterOptions = (colKey: string): string[] => {
    const unique = new Set<string>();
    for (const row of data) {
      const val = row[colKey];
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        unique.add(String(val).trim());
      }
    }
    return Array.from(unique).sort();
  };

  // Apply header filters to data
  const filteredData = data.filter(row => {
    for (const colKey of Object.keys(headerFilters)) {
      const selectedVals = headerFilters[colKey];
      if (!selectedVals || selectedVals.length === 0) continue;
      const val = row[colKey];
      const strVal = val !== null && val !== undefined ? String(val).trim() : '';
      if (!selectedVals.includes(strVal)) return false;
    }
    return true;
  });

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    }
    const strA = String(aVal).toLowerCase();
    const strB = String(bVal).toLowerCase();
    return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center p-12">
        <p className="text-gray-500 text-sm">Nenhuma emenda encontrada</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Count bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 border-b border-teal-200">
        <span className="text-[10px] text-teal-700 font-bold">
          {sortedData.length.toLocaleString('pt-BR')} registro{sortedData.length !== 1 ? 's' : ''}
          {Object.keys(headerFilters).some(k => headerFilters[k].length > 0) && ` (filtrado de ${data.length.toLocaleString('pt-BR')})`}
        </span>
        {Object.keys(headerFilters).some(k => headerFilters[k].length > 0) && (
          <button
            onClick={() => setHeaderFilters({})}
            className="text-[10px] text-teal-700 font-bold underline hover:text-teal-900"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div
        ref={tableContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`overflow-x-auto bg-white select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ WebkitUserSelect: 'none', userSelect: 'none', minHeight: '400px', maxHeight: '600px', overflowY: 'auto' }}
      >
        <table className="min-w-fit text-sm">
          {/* Header - Teal/emerald theme */}
          <thead className="bg-teal-700 sticky top-0 z-20">
            <tr>
              {visibleCols.map(col => {
                const selectedVals = headerFilters[col.key] || [];
                const hasActive = selectedVals.length > 0;
                const isOpen = headerFilterOpen === col.key;

                return (
                  <th
                    key={col.key}
                    ref={(el) => { if (el) columnHeaderRefs.current[col.key] = el; }}
                    className={`px-2 py-1.5 text-left text-white text-xs whitespace-nowrap cursor-pointer transition-colors hover:bg-teal-800 relative ${
                      col.align === 'right' ? 'text-right' : ''
                    } ${sortColumn === col.key ? 'bg-teal-800' : ''}`}
                    style={{ minWidth: 70 }}
                  >
                    {/* Label + Sort */}
                    <div
                      className="flex items-center gap-1 font-bold mb-1"
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
                          onSortChange(col.key, sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          onSortChange(col.key, 'asc');
                        }
                      }}
                      title={`Ordenar por ${col.label}`}
                    >
                      {col.label}
                      {sortColumn === col.key && (
                        <span className="text-amber-300 text-[10px]">
                          {sortOrder === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                    {/* Filter button */}
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
                      className={`w-full px-1 py-0.5 text-[9px] rounded flex items-center justify-center gap-0.5 transition-all ${
                        hasActive
                          ? 'bg-amber-400 text-gray-800 font-bold'
                          : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white'
                      }`}
                      title={`Filtrar ${col.label}`}
                    >
                      <Filter className="w-2.5 h-2.5 flex-shrink-0" />
                      {hasActive ? <span>{selectedVals.length}</span> : <span className="text-[8px]">▼</span>}
                    </button>
                    {/* Dropdown filter */}
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
                            className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:border-teal-600 focus:ring-1 focus:ring-teal-600/20 outline-none text-gray-900 bg-white"
                            autoFocus
                          />
                          <label className="flex items-center gap-1.5 text-[10px] cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                            <input
                              type="checkbox"
                              checked={hideEmpty[col.key] || false}
                              onChange={(e) => setHideEmpty(prev => ({ ...prev, [col.key]: e.target.checked }))}
                              className="rounded cursor-pointer accent-teal-600 w-3 h-3"
                            />
                            <span className="text-gray-600">Ocultar vazios</span>
                          </label>
                        </div>
                        <div className="max-h-56 overflow-y-auto">
                          {(() => {
                            const options = getFilterOptions(col.key);
                            const searchVal = headerFilterSearch.toLowerCase();
                            const filtered = options.filter(opt => {
                              if (searchVal && !opt.toLowerCase().includes(searchVal)) return false;
                              if (hideEmpty[col.key] && (!opt || opt.trim() === '' || opt === '—')) return false;
                              return true;
                            });
                            if (filtered.length === 0) {
                              return <div className="p-2 text-[10px] text-gray-400 text-center">Nenhuma opção</div>;
                            }
                            return filtered.slice(0, 300).map(opt => (
                              <label key={opt} className="flex items-center gap-1.5 px-2 py-1 hover:bg-teal-50 cursor-pointer text-[11px] text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={selectedVals.includes(opt)}
                                  onChange={() => {
                                    const newValues = selectedVals.includes(opt)
                                      ? selectedVals.filter(v => v !== opt)
                                      : [...selectedVals, opt];
                                    setHeaderFilters(prev => ({ ...prev, [col.key]: newValues }));
                                  }}
                                  className="rounded cursor-pointer accent-teal-600 w-3 h-3 flex-shrink-0"
                                />
                                <span className="truncate">{opt || '(vazio)'}</span>
                              </label>
                            ));
                          })()}
                        </div>
                        <div className="border-t border-gray-100 px-2 py-1.5 flex gap-1">
                          <button
                            onClick={() => {
                              setHeaderFilters(prev => ({ ...prev, [col.key]: [] }));
                              setHideEmpty(prev => ({ ...prev, [col.key]: false }));
                            }}
                            className="flex-1 px-2 py-1 text-[10px] text-teal-700 hover:bg-teal-50 rounded font-medium"
                          >
                            Limpar
                          </button>
                          <button
                            onClick={() => { setHeaderFilterOpen(null); setHeaderFilterSearch(''); }}
                            className="flex-1 px-2 py-1 text-[10px] text-white bg-teal-700 rounded hover:bg-teal-800 font-medium"
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

          {/* Body */}
          <tbody className="divide-y divide-slate-200">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={visibleCols.length} className="px-4 py-8 text-center">
                  <span className="text-slate-500 font-medium">Nenhum registro encontrado com os filtros selecionados</span>
                </td>
              </tr>
            ) : (
              sortedData.map((emenda, index) => {
                const rowKey = `${emenda.id || index}`;
                return (
                  <tr
                    key={`emenda-row-${rowKey}`}
                    onClick={() => {
                      if (dragState.current.hasMoved) {
                        dragState.current.hasMoved = false;
                        return;
                      }
                      onRowClick?.(emenda);
                    }}
                    className={`cursor-pointer transition-all ${
                      selectedEmenda?.id === emenda.id
                        ? 'bg-teal-100 border-l-4 border-teal-600'
                        : 'hover:bg-teal-50'
                    }`}
                  >
                    {visibleCols.map(col => (
                      <td
                        key={`${rowKey}-${col.key}`}
                        className={`px-3 py-1.5 text-slate-700 truncate text-xs ${col.align === 'right' ? 'text-right font-semibold text-emerald-600' : ''}`}
                        title={String(emenda[col.key] ?? '')}
                      >
                        {col.render(emenda)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
