// Cache em memória
let formalizacaoCache: any[] | null = null;
let formalizacaoCacheTimestamp = 0;
let isCachingFormalizacao = false;
const FORMALIZACAO_CACHE_TTL = 10 * 60 * 1000; // 10 minutos

async function getAllFormalizacoes(env: any, forceRefresh: boolean = false): Promise<any[]> {
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  const now = Date.now();

  // ✅ Verificar cache
  if (!forceRefresh && formalizacaoCache && (now - formalizacaoCacheTimestamp) < FORMALIZACAO_CACHE_TTL) {
    const cacheAge = Math.round((now - formalizacaoCacheTimestamp) / 1000);
    console.log(`⚡ CACHE HIT: ${formalizacaoCache.length} registros (${cacheAge}s antigo)`);
    return formalizacaoCache;
  }

  // 🔄 Se outro request já está cacheando, aguardar
  if (isCachingFormalizacao) {
    console.log('⏳ Aguardando cache anterior...');
    let waitCount = 0;
    while (isCachingFormalizacao && waitCount < 60) {
      await new Promise(resolve => setTimeout(resolve, 100));
      waitCount++;
    }
    if (formalizacaoCache) {
      console.log(`⚡ CACHE HIT (após espera): ${formalizacaoCache.length} registros`);
      return formalizacaoCache;
    }
  }

  isCachingFormalizacao = true;
  console.log('🔄 Cache MISS - Carregando todos os registros com PARALELISMO...');
  const startTime = Date.now();

  try {
    const pageSize = 1000;
    let allData: any[] = [];

    // ⚡ Pedir contagem primeiro
    const countResp = await fetch(
      `${SUPABASE_URL}/rest/v1/formalizacao?select=id`,
      {
        headers: {
          'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact'
        }
      }
    );

    let count = 0;
    if (countResp.ok) {
      const countHeader = countResp.headers.get('content-range');
      if (countHeader) {
        const parts = countHeader.split('/');
        count = parseInt(parts[1]) || 0;
      }
    }

    if (!count) {
      console.warn('⚠️ Nenhum registro encontrado');
      return [];
    }

    const totalPages = Math.ceil(count / pageSize);
    console.log(`📊 Total de registros: ${count} (${totalPages} páginas de ${pageSize})`);

    // ⚡ Fazer REQUISIÇÕES PARALELAS em lotes de 5
    const simultaneousRequests = 5;
    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i);

    for (let i = 0; i < pageNumbers.length; i += simultaneousRequests) {
      const batchPageNumbers = pageNumbers.slice(i, i + simultaneousRequests);
      const batchPromises = batchPageNumbers.map(pageNum =>
        fetch(
          `${SUPABASE_URL}/rest/v1/formalizacao?select=*&order=created_at.desc&limit=${pageSize}&offset=${pageNum * pageSize}`,
          {
            headers: {
              'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Content-Type': 'application/json'
            }
          }
        ).then(async (resp) => {
          const data = resp.ok ? await resp.json() : [];
          return {
            data: Array.isArray(data) ? data : [],
            error: resp.ok ? null : `Page ${pageNum} failed`,
            pageNum
          };
        }).catch((err) => ({
          data: [],
          error: err.message,
          pageNum
        }))
      );

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ data, error, pageNum }) => {
        if (error) {
          console.error(`❌ Erro página ${pageNum}:`, error);
        } else if (data && data.length > 0) {
          allData = allData.concat(data);
          console.log(`📦 Página ${pageNum + 1}/${totalPages}: ${data.length} registros (total: ${allData.length})`);
        }
      });

      // Pequeno delay entre lotes
      if (i + simultaneousRequests < pageNumbers.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ CONCLUÍDO: ${allData.length} registros em ${duration}ms`);

    // ✅ Armazenar em cache
    formalizacaoCache = allData;
    formalizacaoCacheTimestamp = now;

    return allData;
  } catch (err: any) {
    console.error('❌ Erro crítico:', err);
    return [];
  } finally {
    isCachingFormalizacao = false;
  }
}

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // GET /api/formalizacao
  if (request.method === 'GET') {
    try {
      // Buscar TODOS os registros (como no server.ts)
      const allData = await getAllFormalizacoes(env);

      return new Response(JSON.stringify(allData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  return new Response('Method not allowed', { status: 405 });
};
