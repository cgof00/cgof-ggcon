export const onRequest: PagesFunction = async (context) => {
  const { request, env, params } = context;

  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ 
      error: 'Variáveis de ambiente não configuradas' 
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // GET /api/formalizacao/page/:pageNum
  if (request.method === 'GET') {
    try {
      const pageNum = parseInt(params.pageNum as string) || 0;
      const pageSize = 500; // Padrão do server.ts
      const offset = pageNum * pageSize;

      console.log(`📄 GET /api/formalizacao/page/${pageNum} (offset: ${offset}, size: ${pageSize})`);

      // Buscar página específica
      const dataResp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?order=created_at.desc&limit=${pageSize}&offset=${offset}`,
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

      const data = await dataResp.json();

      // Contar total
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

      let total = 0;
      if (countResp.ok) {
        const contentRange = countResp.headers.get('content-range');
        if (contentRange) {
          const parts = contentRange.split('/');
          total = parseInt(parts[1]) || 0;
        }
      }

      console.log(`✅ Página ${pageNum}: ${data?.length || 0} registros`);

      return new Response(JSON.stringify({
        data: Array.isArray(data) ? data : [],
        total: total,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
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
