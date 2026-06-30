// Endpoint: GET /api/formalizacao — Retorna registros da tabela formalizacao
// Suporta limit/offset para paginação (igual ao endpoint de emendas)

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
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '1000'), 50000);
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const nocache = url.searchParams.get('nocache') === '1';

      console.log(`📥 GET /api/formalizacao - limit=${limit}, offset=${offset}, nocache=${nocache}`);

      // ─── Cloudflare Cache API (gratuito, edge cache) ───────────────────────────────────
      // Cada offset diferente tem sua própria cache key; TTL de 30 minutos
      const cache = caches.default;
      const cacheKey = new Request(`${url.origin}/api/formalizacao?limit=${limit}&offset=${offset}`);
      if (!nocache) {
        const cachedResponse = await cache.match(cacheKey);
        if (cachedResponse) {
          console.log(`⚡ Cache HIT offset=${offset}`);
          return cachedResponse;
        }
      } else {
        console.log(`🚨 nocache=1: ignorando cache Cloudflare offset=${offset}`);
      }

      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?select=*&order=id.asc`,
        {
          headers: {
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json',
            'Range': `${offset}-${offset + limit - 1}`,
            // count=exact só no primeiro request (offset=0) para obter total via content-range
            // Para demais offsets, omitir para reduzir carga no Supabase (~50% menos trabalho)
            ...(offset === 0 ? { 'Prefer': 'count=exact' } : {})
          }
        }
      );

      if (!resp.ok && resp.status !== 206) {
        const err = await resp.text();
        console.error(`❌ Supabase error: ${resp.status} - ${err.substring(0, 200)}`);
        return new Response(JSON.stringify([]), {
          status: 200, headers: { 'Content-Type': 'application/json' }
        });
      }

      const rawText = await resp.text();
      const contentRange = resp.headers.get('content-range'); // ex: "0-999/38593"
      const totalCount = contentRange ? contentRange.split('/')[1] : null;
      const recordCount = (() => { try { return JSON.parse(rawText).length; } catch { return '?'; } })();
      console.log(`✅ Retornados: ${recordCount} registros (total=${totalCount ?? 'desconhecido'})`);

      const finalResponse = new Response(rawText, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Expose-Headers': 'X-Total-Count',
          'Cache-Control': 's-maxage=1800, stale-while-revalidate=120', // 30 min edge cache
          ...(totalCount ? { 'X-Total-Count': totalCount } : {})
        }
      });
      // Armazenar no Cloudflare Cache (não bloqueia a resposta)
      // Se nocache=1, INVALIDAR o cache guardando a resposta nova
      context.waitUntil(cache.put(cacheKey, finalResponse.clone()));
      return finalResponse;
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
