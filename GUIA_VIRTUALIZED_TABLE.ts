// GUIA RÁPIDO: Como usar VirtualizedTable no App.tsx
// Copie e cole as seções abaixo no seu código

// 1. ADICIONE OS IMPORTS AQUI (no topo do App.tsx):
// import { VirtualizedTable } from './VirtualizedTable';
// import { LoadingSkeleton, LoadingOverlay, FastCounter } from './components/Loading';

// 2. ADICIONE ISSO NO SEU COMPONENTE (onde está a tabela de formalizações):

export function FormalizacoesTable({ data, onEdit, onDelete, isLoading }) {
  const columns = [
    { key: 'ano', label: 'Ano', width: 100 },
    { key: 'parlamentar', label: 'Parlamentar', width: 250 },
    { key: 'area_estagio', label: 'Área', width: 150 },
    { key: 'tecnico', label: 'Técnico', width: 150 },
    { key: 'objeto', label: 'Objeto', width: 300 },
    { key: 'conveniado', label: 'Conveniado', width: 200 },
  ];

  const renderCell = (value, column, item, index) => {
    // Renderizar com truncate e tooltip
    const text = String(value || '—').substring(0, 50);
    return <span title={String(value || '—')}>{text}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Contador rápido */}
      <FastCounter current={data.length} total={37352} label="Formalizações" />

      {/* Tabela virtualizada */}
      {isLoading ? (
        <LoadingSkeleton rows={10} />
      ) : (
        <VirtualizedTable
          data={data}
          columns={columns}
          itemHeight={48} // altura de cada linha em pixels
          height={600} // altura total do container
          width="100%" // largura
          renderCell={renderCell}
          onEdit={onEdit}
          onDelete={onDelete}
          rowKey="id"
        />
      )}

      {/* Overlay de loading */}
      <LoadingOverlay isLoading={isLoading} message="Carregando 37.352 formalizações..." />
    </div>
  );
}

// 3. PERFORMANCE HOOKS (opcional, para debug):
// import { usePerformanceMonitor, measurePerformance } from './hooks/usePerformance';

// No seu useEffect:
// usePerformanceMonitor('Formalizações Tab');

// Em operações críticas:
// const duration = measurePerformance('Filtro aplicado', () => {
//   // seu código aqui
// });

console.log('✅ Guia de integração carregado - siga as 3 etapas acima');
