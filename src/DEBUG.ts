// DEBUG.ts - Ferramentas de debug para performance

export const DEBUG = {
  // Verificar se virtualização está funcionando
  checkVirtualization: () => {
    const rows = document.querySelectorAll('[role="row"]');
    const visible = Array.from(rows).filter(r => {
      const rect = r.getBoundingClientRect();
      return rect.height > 0; // altura > 0 = visível
    }).length;
    
    const total = rows.length;
    console.log(`📊 Virtualização Status:
      Total de linhas DOM: ${total}
      Linhas visíveis: ${visible}
      Por renderizar: ${total - visible}
      Eficiência: ${((visible/total)*100).toFixed(1)}%
      Status: ${visible < 50 ? '✅ OK' : '⚠️ MUITAS LINHAS'}`);
  },

  // Verificar tamanho das respostas
  checkNetworkSize: async () => {
    const response = await fetch('http://localhost:4000/api/formalizacao');
    const size = response.headers.get('content-length');
    const gzipped = response.headers.get('content-encoding') === 'gzip';
    
    console.log(`📦 Network Status:
      Tamanho da resposta: ${(size / 1024 / 1024).toFixed(2)} MB
      Compressão: ${gzipped ? '✅ Gzip ativo' : '❌ Sem compressão'}
      Cache: ${response.headers.get('cache-control') || 'Sem cache headers'}`);
  },

  // Benchmark de performance
  benchmark: async (name, fn) => {
    const start = performance.now();
    await fn();
    const duration = performance.now() - start;
    const speed = duration < 50 ? '⚡ Rápido' : duration < 200 ? '✅ OK' : '⚠️ Lento';
    console.log(`${speed} ${name}: ${duration.toFixed(2)}ms`);
    return duration;
  },

  // Verificar estado do cache
  checkCache: () => {
    const cached = localStorage.getItem('formalizacao-cache');
    const ts = localStorage.getItem('formalizacao-cache-ts');
    const age = ts ? Math.round((Date.now() - parseInt(ts)) / 1000) : null;
    
    console.log(`💾 Cache Status:
      Dados em cache: ${cached ? '✅ Sim' : '❌ Não'}
      Idade: ${age ? `${age}s` : 'N/A'}
      TTL: 300s (5 minutos)
      Status: ${age && age < 300 ? '✅ Válido' : '❌ Expirado'}`);
  },

  // Analisar filtros
  analyzeFilters: (filters) => {
    const active = Object.values(filters).filter(v => Array.isArray(v) && v.length > 0);
    console.log(`🔍 Filtros Ativos:
      Total de filtros: ${Object.keys(filters).length}
      Ativos: ${active.length}
      Status: ${active.length > 0 ? '⚠️ Dados filtrados' : '✅ Sem filtros'}`);
  },

  // Verificar memória
  checkMemory: () => {
    if ((performance as any).memory) {
      const mem = (performance as any).memory;
      const used = (mem.usedJSHeapSize / 1048576).toFixed(2);
      const total = (mem.totalJSHeapSize / 1048576).toFixed(2);
      const percent = ((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100).toFixed(1);
      
      console.log(`💾 Memória:
        Usada: ${used} MB
        Total alocada: ${total} MB
        Limite: ${percent}%
        Status: ${percent < 80 ? '✅ OK' : '⚠️ Alto'}`);
    }
  },

  // Executar tudo de uma vez
  runFull: async () => {
    console.log('🔍 ===== DEBUG COMPLETO =====\n');
    DEBUG.checkVirtualization();
    DEBUG.checkMemory();
    DEBUG.checkCache();
    DEBUG.checkNetworkSize();
    await DEBUG.benchmark('Teste de latência', () => {
      return new Promise(r => setTimeout(r, 100));
    });
    console.log('✅ Debug completo! Verifique os logs acima.');
  }
};

// Usar no console:
// DEBUG.runFull()
// DEBUG.checkVirtualization()
// DEBUG.checkNetwork()

// Exportar para usar em testes
export default DEBUG;
