export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Variáveis de ambiente não configuradas' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  if (request.method === 'GET') {
    try {
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '10000'), 50000);
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const all = url.searchParams.get('all') === 'true';

      console.log(`📥 GET /api/emendas - limit=${limit}, offset=${offset}, all=${all}`);

      if (all) {
        // Buscar TODOS os registros em batches paralelos
        const BATCH_SIZE = 1000;
        const allData: any[] = [];
        let batchOffset = 0;
        let hasMore = true;

        while (hasMore) {
          const batchPromises = [];
          for (let i = 0; i < 5 && hasMore; i++) {
            const currentOffset = batchOffset + (i * BATCH_SIZE);
            batchPromises.push(
              fetch(
                `${SUPABASE_URL}/rest/v1/emendas?select=*&order=id.desc&limit=${BATCH_SIZE}&offset=${currentOffset}`,
                {
                  headers: {
                    'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
                    'apikey': SUPABASE_SERVICE_ROLE_KEY,
                    'Content-Type': 'application/json'
                  }
                }
              ).then(async (resp) => {
                if (!resp.ok) return [];
                const data = await resp.json();
                return Array.isArray(data) ? data : [];
              })
            );
          }

          const batches = await Promise.all(batchPromises);
          for (const batch of batches) {
            if (batch.length > 0) {
              allData.push(...batch);
            }
            if (batch.length < BATCH_SIZE) {
              hasMore = false;
            }
          }
          batchOffset += 5 * BATCH_SIZE;
        }

        console.log(`✅ Total retornado: ${allData.length} emendas`);
        return new Response(JSON.stringify(allData), {
          status: 200, headers: { 'Content-Type': 'application/json' }
        });
      }

      // Busca paginada padrão
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/emendas?select=*&order=id.desc&offset=${offset}&limit=${limit}`,
        {
          headers: {
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!resp.ok) {
        const err = await resp.text();
        console.error(`❌ Supabase error: ${resp.status} - ${err.substring(0, 200)}`);
        return new Response(JSON.stringify([]), {
          status: 200, headers: { 'Content-Type': 'application/json' }
        });
      }

      const data = await resp.json();
      console.log(`✅ Retornados: ${Array.isArray(data) ? data.length : 0} registros`);

      return new Response(JSON.stringify(Array.isArray(data) ? data : []), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    } catch (e: any) {
      console.error('❌ ERRO:', e);
      return new Response(JSON.stringify([]), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405, headers: { 'Content-Type': 'application/json' }
  });
};
