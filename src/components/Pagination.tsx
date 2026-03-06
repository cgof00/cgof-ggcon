import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  recordsPerPage: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  totalRecords,
  recordsPerPage,
  onPageChange,
  loading = false,
}: PaginationProps) {
  const from = currentPage * recordsPerPage + 1;
  const to = Math.min((currentPage + 1) * recordsPerPage, totalRecords);

  const canGoPrev = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

  const pageNumbers: (number | string)[] = [];
  const maxPagesToShow = 5;
  const halfWindow = Math.floor(maxPagesToShow / 2);

  let startPage = Math.max(0, currentPage - halfWindow);
  let endPage = Math.min(totalPages - 1, currentPage + halfWindow);

  if (endPage - startPage < maxPagesToShow - 1) {
    if (startPage === 0) {
      endPage = Math.min(totalPages - 1, startPage + maxPagesToShow - 1);
    } else {
      startPage = Math.max(0, endPage - maxPagesToShow + 1);
    }
  }

  if (startPage > 0) {
    pageNumbers.push(0);
    if (startPage > 1) {
      pageNumbers.push('...');
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  if (endPage < totalPages - 1) {
    if (endPage < totalPages - 2) {
      pageNumbers.push('...');
    }
    pageNumbers.push(totalPages - 1);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-surface-tertiary border-t border-primary">
      <div className="text-sm text-secondary font-medium">
        Exibindo <span className="font-bold">{from}</span>–<span className="font-bold">{to}</span> de{' '}
        <span className="font-bold">{totalRecords.toLocaleString('pt-BR')}</span> registros
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(0)}
          disabled={!canGoPrev || loading}
          leftIcon={<ChevronsLeft className="w-4 h-4" />}
          title="Primeira página"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrev || loading}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
          title="Página anterior"
        />

        <div className="flex gap-1 mx-2">
          {pageNumbers.map((page, idx) => (
            <React.Fragment key={idx}>
              {page === '...' ? (
                <span className="px-2 text-secondary">…</span>
              ) : (
                <Button
                  variant={page === currentPage ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => onPageChange(page as number)}
                  disabled={loading}
                  className="min-w-10"
                >
                  {(page as number) + 1}
                </Button>
              )}
            </React.Fragment>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext || loading}
          rightIcon={<ChevronRight className="w-4 h-4" />}
          title="Próxima página"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages - 1)}
          disabled={!canGoNext || loading}
          rightIcon={<ChevronsRight className="w-4 h-4" />}
          title="Última página"
        />
      </div>
    </div>
  );
}
