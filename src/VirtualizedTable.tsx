import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { ChevronRight, Trash2, Edit2 } from 'lucide-react';

interface TableColumn {
  key: string;
  label: string;
  width: number;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: TableColumn[];
  itemHeight: number;
  height: number;
  width: string | number;
  renderCell: (value: any, column: TableColumn, item: T, index: number) => React.ReactNode;
  onRowClick?: (item: T, index: number) => void;
  onEdit?: (item: T, index: number) => void;
  onDelete?: (item: T, index: number) => void;
  rowKey: string;
}

const Row = React.memo(({ index, style, data }: any) => {
  const { item, columns, renderCell, onRowClick, onEdit, onDelete } = data;

  return (
    <div
      style={style}
      className="flex border-b border-gray-200 hover:bg-blue-50 transition-colors group"
      onClick={() => onRowClick && onRowClick(item, index)}
    >
      {columns.map((col: TableColumn) => (
        <div
          key={col.key}
          style={{ width: col.width }}
          className="px-4 py-3 truncate text-sm text-gray-700 flex items-center"
        >
          {renderCell(item[col.key], col, item, index)}
        </div>
      ))}
      <div className="w-24 px-4 py-3 flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item, index);
            }}
            className="p-1 hover:bg-blue-100 rounded"
            title="Editar"
          >
            <Edit2 size={16} className="text-blue-600" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item, index);
            }}
            className="p-1 hover:bg-red-100 rounded"
            title="Deletar"
          >
            <Trash2 size={16} className="text-red-600" />
          </button>
        )}
      </div>
    </div>
  );
});

Row.displayName = 'Row';

export const VirtualizedTable = React.memo(function VirtualizedTable<T>({
  data,
  columns,
  itemHeight,
  height,
  width,
  renderCell,
  onRowClick,
  onEdit,
  onDelete,
  rowKey,
}: VirtualizedTableProps<T>) {
  const itemData = useMemo(
    () => ({
      item: data,
      columns,
      renderCell,
      onRowClick,
      onEdit,
      onDelete,
    }),
    [data, columns, renderCell, onRowClick, onEdit, onDelete]
  );

  return (
    <div className="overflow-hidden rounded-lg border border-gray-300 bg-white">
      {/* Header */}
      <div className="flex border-b-2 border-gray-300 bg-gray-50 sticky top-0 z-10">
        {columns.map((col) => (
          <div
            key={col.key}
            style={{ width: col.width }}
            className="px-4 py-3 text-sm font-bold text-gray-700"
          >
            {col.label}
          </div>
        ))}
        <div className="w-24 px-4 py-3 text-sm font-bold text-gray-700 text-right">
          Ações
        </div>
      </div>

      {/* Virtualized List */}
      {data.length > 0 ? (
        <List
          height={height}
          itemCount={data.length}
          itemSize={itemHeight}
          width={width}
          itemData={{
            item: data,
            columns,
            renderCell,
            onRowClick,
            onEdit,
            onDelete,
          }}
        >
          {({ index, style }) => (
            <div style={style} className="flex border-b border-gray-200 hover:bg-blue-50 transition-colors group">
              {columns.map((col) => (
                <div
                  key={col.key}
                  style={{ width: col.width }}
                  className="px-4 py-3 truncate text-sm text-gray-700 flex items-center overflow-hidden"
                  title={String(data[index][col.key])}
                >
                  {renderCell(data[index][col.key], col, data[index], index)}
                </div>
              ))}
              <div className="w-24 px-4 py-3 flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(data[index], index);
                    }}
                    className="p-1 hover:bg-blue-100 rounded"
                    title="Editar"
                  >
                    <Edit2 size={16} className="text-blue-600" />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(data[index], index);
                    }}
                    className="p-1 hover:bg-red-100 rounded"
                    title="Deletar"
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                )}
              </div>
            </div>
          )}
        </List>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-500">
          ⚠️ Nenhum registro encontrado
        </div>
      )}
    </div>
  );
});
