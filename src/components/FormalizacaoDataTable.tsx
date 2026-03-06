/**
 * FormalizacaoDataTable.tsx
 * Componente de tabela especializado para Formalizações
 * Com suporte a muitas colunas e filtros
 */

import React, { useState, useRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Formalizacao {
  id?: number;
  seq?: string;
  ano?: string;
  parlamentar?: string;
  partido?: string;
  emenda?: string;
  demandas_formalizacao?: string;
  regional?: string;
  municipio?: string;
  conveniado?: string;
  objeto?: string;
  valor?: number;
  area_estagio?: string;
  recurso?: string;
  tecnico?: string;
  data_liberacao?: string;
  situacao_demandas_sempapel?: string;
  area_estagio_situacao_demanda?: string;
  situacao_analise_demanda?: string;
  data_analise_demanda?: string;
  conferencista?: string;
  data_recebimento_demanda?: string;
  data_retorno?: string;
  data_liberacao_assinatura_conferencista?: string;
  data_liberacao_assinatura?: string;
  falta_assinatura?: string;
  assinatura?: string;
  publicacao?: string;
  vigencia?: string;
  encaminhado_em?: string;
  concluida_em?: string;
  [key: string]: any;
}

interface FormalizacaoDataTableProps {
  data: Formalizacao[];
  loading?: boolean;
  emptyMessage?: string;
  sortColumn?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string, order: 'asc' | 'desc') => void;
  visibleColumns?: Record<string, boolean>;
  onRowSelect?: (rowId: string, selected: boolean) => void;
  selectedRows?: Set<string>;
  onRowClick?: (row: Formalizacao) => void;
  isDragging?: boolean;
  tableContainerRef?: React.RefObject<HTMLDivElement>;
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseMove?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseUp?: () => void;
  onMouseLeave?: () => void;
}

const COLUMN_LABELS: Record<string, string> = {
  seq: 'Seq',
  ano: 'Ano',
  parlamentar: 'Parlamentar',
  partido: 'Partido',
  emenda: 'Emenda',
  demandas_formalizacao: 'Demanda',
  regional: 'Regional',
  municipio: 'Município',
  conveniado: 'Conveniado',
  objeto: 'Objeto',
  valor: 'Valor',
  area_estagio: 'Área - Estágio',
  recurso: 'Recurso',
  tecnico: 'Técnico',
  data_liberacao: 'Data Liberação',
  situacao_demandas_sempapel: 'Situação',
  area_estagio_situacao_demanda: 'Área - Situação',
  situacao_analise_demanda: 'Situação Análise',
  data_analise_demanda: 'Data Análise',
  conferencista: 'Conferencista',
  data_recebimento_demanda: 'Data Recebimento',
  data_retorno: 'Data Retorno',
  data_liberacao_assinatura_conferencista: 'Data Lib. Assinatura Conf.',
  data_liberacao_assinatura: 'Data Lib. Assinatura',
  falta_assinatura: 'Falta Assinatura',
  assinatura: 'Assinatura',
  publicacao: 'Publicação',
  vigencia: 'Vigência',
  encaminhado_em: 'Encaminhado em',
  concluida_em: 'Concluída em',
};

const COLUMN_WIDTHS: Record<string, string> = {
  seq: '60px',
  ano: '80px',
  parlamentar: '150px',
  partido: '120px',
  emenda: '100px',
  demandas_formalizacao: '120px',
  regional: '120px',
  municipio: '130px',
  conveniado: '150px',
  objeto: '180px',
  valor: '130px',
  area_estagio: '130px',
  recurso: '100px',
  tecnico: '120px',
};

export function FormalizacaoDataTable({
  data,
  loading = false,
  emptyMessage = 'Nenhum registro encontrado',
  sortColumn,
  sortOrder = 'asc',
  onSort,
  visibleColumns = {},
  onRowSelect,
  selectedRows = new Set(),
  onRowClick,
  isDragging = false,
  tableContainerRef,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
}: FormalizacaoDataTableProps) {
  const formatDate = (date?: string) => {
    if (!date || date === '—') return '—';
    if (date.includes('-')) {
      const [y, m, d] = date.split('-');
      return `${d}/${m}/${y}`;
    }
    return date;
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '—';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const renderValue = (key: string, value: any) => {
    if (value === null || value === undefined) return '—';
    if (value === '') return '—';

    // Formatar valores específicos
    if (key === 'valor') return formatCurrency(value);
    if (key.includes('data_')) return formatDate(String(value));
    
    return String(value).length > 50 ? String(value).substring(0, 50) + '...' : String(value);
  };

  const handleSort = (column: string) => {
    if (!onSort) return;
    const newOrder = sortColumn === column && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(column, newOrder);
  };

  // Filtrar colunas visíveis
  const visibleColumnKeys = Object.entries(visibleColumns)
    .filter(([, visible]) => visible)
    .map(([key]) => key)
    .filter(key => key !== 'seq');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center p-12">
        <p className="text-secondary text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      ref={tableContainerRef}
      className={`overflow-x-auto border border-primary rounded-lg shadow-md ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      style={{ maxHeight: '600px', overflowY: 'auto' }}
    >
      <table className="w-full border-collapse">
        {/* Header */}
        <thead className="sticky top-0 z-10 bg-surface-secondary border-b-2 border-primary">
          <tr>
            {visibleColumns.seq && (
              <th className="w-12 p-3 text-left z-20 bg-surface-secondary">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-primary cursor-pointer"
                  checked={selectedRows.size > 0 && selectedRows.size === data.length}
                  onChange={(e) => {
                    if (!onRowSelect) return;
                    if (e.target.checked) {
                      data.forEach((row, idx) => {
                        onRowSelect(String(row.id || idx), true);
                      });
                    } else {
                      selectedRows.forEach((rowId) => {
                        onRowSelect(rowId, false);
                      });
                    }
                  }}
                />
              </th>
            )}
            {visibleColumnKeys.map((colKey) => {
              const isSorted = sortColumn === colKey;
              return (
                <th
                  key={colKey}
                  className="p-3 text-left font-bold text-inverse bg-surface-secondary border-r border-primary first:sticky first:left-0 first:z-20 cursor-pointer hover:bg-surface-primary select-none text-xs uppercase"
                  onClick={() => handleSort(colKey)}
                  style={{ width: COLUMN_WIDTHS[colKey] }}
                >
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    <span>{COLUMN_LABELS[colKey] || colKey}</span>
                    {isSorted && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {data.map((row, idx) => {
            const rowId = String(row.id || idx);
            const isSelected = selectedRows.has(rowId);
            const bgClass = idx % 2 === 1 ? 'bg-slate-50' : 'bg-white';

            return (
              <tr
                key={rowId}
                className={`border-b border-primary ${bgClass} hover:bg-blue-50 transition-colors cursor-pointer`}
                onClick={() => onRowClick?.(row)}
              >
                {visibleColumns.seq && (
                  <td className="w-12 p-3 text-left z-10">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-primary cursor-pointer"
                      checked={isSelected}
                      onChange={(e) => {
                        onRowSelect?.(rowId, e.target.checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                )}
                {visibleColumnKeys.map((colKey) => (
                  <td
                    key={`${rowId}-${colKey}`}
                    className="p-3 text-sm text-primary first:sticky first:left-0 first:z-10 first:bg-inherit font-medium whitespace-nowrap overflow-hidden text-overflow-ellipsis"
                    title={String(row[colKey] || '')}
                    style={{ width: COLUMN_WIDTHS[colKey] }}
                  >
                    {renderValue(colKey, row[colKey])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
