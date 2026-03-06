// Endpoint para retornar TODOS os registros (37k+)
// Supabase REST API limite: 1000 por request, então fazemos requisições paralelas

const SUPABASE_MAX_LIMIT = 1000;

async function fetchAllFormalizacoes(supabaseUrl: string, serviceRoleKey: string, totalExpected = 37352) {
  const BATCH_SIZE = SUPABASE_MAX_LIMIT;
  const numBatches = Math.ceil(totalExpected / BATCH_SIZE);
  
  console.log(`🔄 Fetching ${totalExpected} registros em ${numBatches} batches de ${BATCH_SIZE}...`);
  
  // Criar array de promises para requisições paralelas
  const promises = [];
  for (let i = 0; i < numBatches; i++) {
    const offset = i * BATCH_SIZE;
    promises.push(
      fetch(
        `${supabaseUrl}/rest/v1/formalizacao?order=id.asc&limit=${BATCH_SIZE}&offset=${offset}`,
        {
          headers: {
            'Authorization': 'Bearer ' + serviceRoleKey,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
          }
        }
      ).then(async (resp) => {
        if (!resp.ok) {
          const err = await resp.text();
          console.error(`❌ Batch ${i} falhou:`, err.substring(0, 100));
          return [];
        }
        const data = await resp.json();
        console.log(`✅ Batch ${i} (offset ${offset}): ${Array.isArray(data) ? data.length : 0} registros`);
        return Array.isArray(data) ? data : [];
      })
    );
  }
  
  // Executar todas as requisições em paralelo
  const batches = await Promise.all(promises);
  
  // Combinar resultados
  const allData = batches.flat();
  console.log(`🎉 Total carregado: ${allData.length} registros`);
  
  return allData;
}

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ 
      error: 'Variáveis de ambiente não configuradas' 
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // GET /api/formalizacao (retorna TODOS com paginação)
  if (request.method === 'GET') {
    try {
      const fetchAllParam = url.searchParams.get('all') || 'true';
      const shouldFetchAll = fetchAllParam === 'true';
      
      let data: any[] = [];
      let total = 0;

      if (shouldFetchAll) {
        // Buscar TODOS os registros em paralelo
        console.log(`📥 GET /api/formalizacao?all=true - carregando TODOS os registros...`);
        data = await fetchAllFormalizacoes(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        total = data.length;
      } else {
        // Buscar apenas uma página específica
        const pageParam = url.searchParams.get('page') || '0';
        const limitParam = url.searchParams.get('limit') || '1000';
        const page = parseInt(pageParam);
        const limit = Math.min(parseInt(limitParam), SUPABASE_MAX_LIMIT);
        const offset = page * limit;

        console.log(`📥 GET /api/formalizacao - page: ${page}, limit: ${limit}, offset: ${offset}`);

        const dataResp = await fetch(
          `${SUPABASE_URL}/rest/v1/formalizacao?order=id.asc&limit=${limit}&offset=${offset}`,
          {
            headers: {
              'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!dataResp.ok) {
          const err = await dataResp.text();
          return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
            status: dataResp.status,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        data = await dataResp.json();
        
        // Contar total de registros apenas quando não estamos fetchando todos
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

        if (countResp.ok) {
          const contentRange = countResp.headers.get('content-range');
          if (contentRange) {
            const parts = contentRange.split('/');
            total = parseInt(parts[1]) || 0;
          }
        }
      }

      console.log(`✅ Retornando ${data?.length || 0} registros de ${total} total`);

      return new Response(JSON.stringify({
        data: Array.isArray(data) ? data : [],
        total: total || data.length
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e: any) {
      console.error('❌ ERRO:', e);
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
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
};
