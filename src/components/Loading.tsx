import React from 'react';

export const LoadingSkeleton = ({ rows = 10 }: { rows?: number }) => (
  <div className="space-y-2">
    {Array(rows)
      .fill(0)
      .map((_, i) => (
        <div key={i} className="h-12 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse" />
      ))}
  </div>
);

export const LoadingOverlay = ({ isLoading, message = 'Carregando...' }: { isLoading: boolean; message?: string }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 text-center">
        <div className="inline-block animate-spin">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
        </div>
        <p className="mt-4 text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
};

export const FastCounter = ({
  current,
  total,
  label = 'Registros',
}: {
  current: number;
  total: number;
  label?: string;
}) => (
  <div className="text-sm text-gray-600 font-medium bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
    <span className="text-blue-600 font-bold">{current.toLocaleString('pt-BR')}</span>
    <span className="text-gray-600"> / {total.toLocaleString('pt-BR')} {label}</span>
  </div>
);
