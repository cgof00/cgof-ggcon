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

      console.log(`📥 GET /api/formalizacao - limit=${limit}, offset=${offset}`);

      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?select=*&order=id.asc`,
        {
          headers: {
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json',
            'Range': `${offset}-${offset + limit - 1}`,
            'Prefer': 'count=exact'
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

      const data = await resp.json();
      console.log(`✅ Retornados: ${Array.isArray(data) ? data.length : 0} registros de formalizacao`);

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
