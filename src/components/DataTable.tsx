import React, { ReactNode, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface DataTableColumn<T> {
  key: keyof T;
  label: string;
  width?: string;
  sortable?: boolean;
  render?: (value: any, row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  striped?: boolean;
  hoverable?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  sortColumn?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string, order: 'asc' | 'desc') => void;
  fixedHeader?: boolean;
  maxHeight?: string;
  rowSelectable?: boolean;
  selectedRows?: Set<string>;
  onRowSelect?: (rowId: string, selected: boolean) => void;
  getRowId?: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T, index: number) => string;
  stickyFirstColumn?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  striped = true,
  hoverable = true,
  loading = false,
  emptyMessage = 'Nenhum registro encontrado',
  sortColumn,
  sortOrder = 'asc',
  onSort,
  fixedHeader = true,
  maxHeight = '600px',
  rowSelectable = false,
  selectedRows = new Set(),
  onRowSelect,
  getRowId = (_, idx) => String(idx),
  onRowClick,
  rowClassName,
  stickyFirstColumn = false,
}: DataTableProps<T>) {
  const handleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable || !onSort) return;

    const newOrder = sortColumn === String(column.key) && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(String(column.key), newOrder);
  };

  const containerClass = fixedHeader ? 'overflow-y-auto' : '';
  const containerStyle: React.CSSProperties = fixedHeader ? { maxHeight } : {};

  return (
    <div className="border border-primary rounded-lg overflow-hidden shadow-md">
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center p-12">
          <p className="text-secondary text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <div className={containerClass} style={containerStyle}>
          <table className="w-full border-collapse">
            {/* Header */}
            <thead className={fixedHeader ? 'sticky top-0 z-10' : ''}>
              <tr className="bg-surface-secondary border-b-2 border-primary">
                {rowSelectable && (
                  <th className="w-12 p-3 text-left">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-primary cursor-pointer"
                      checked={selectedRows.size > 0 && selectedRows.size === data.length}
                      onChange={(e) => {
                        if (!onRowSelect) return;
                        if (e.target.checked) {
                          data.forEach((row, idx) => {
                            const rowId = getRowId(row, idx);
                            onRowSelect(rowId, true);
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
                {columns.map((column) => {
                  const isSorted = sortColumn === String(column.key);
                  return (
                    <th
                      key={String(column.key)}
                      className={`p-3 text-left font-bold text-inverse first:sticky first:left-0 first:z-20 first:bg-surface-secondary ${
                        column.sortable ? 'cursor-pointer hover:bg-surface-primary select-none' : ''
                      }`}
                      onClick={() => handleSort(column)}
                      style={{
                        width: column.width,
                        textAlign: column.align || 'left',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span>{column.label}</span>
                        {column.sortable && isSorted && (
                          <span>
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
              {data.map((row, rowIndex) => {
                const rowId = getRowId(row, rowIndex);
                const isSelected = selectedRows.has(rowId);
                const bgClass = striped && rowIndex % 2 === 1 ? 'bg-slate-50' : 'bg-white';
                const hoverClass = hoverable ? 'hover:bg-blue-50 hover:shadow-sm' : '';
                const customRowClass = rowClassName?.(row, rowIndex) || '';

                return (
                  <tr
                    key={rowId}
                    className={`border-b border-primary transition-normal ${bgClass} ${hoverClass} ${customRowClass}`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {rowSelectable && (
                      <td className="w-12 p-3 text-left">
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
                    {columns.map((column) => (
                      <td
                        key={String(column.key)}
                        className="p-3 text-sm text-primary first:sticky first:left-0 first:z-10 first:bg-inherit font-medium"
                        style={{
                          width: column.width,
                          textAlign: column.align || 'left',
                        }}
                      >
                        {column.render
                          ? column.render(row[column.key], row)
                          : row[column.key] === null || row[column.key] === undefined
                          ? '—'
                          : String(row[column.key])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
