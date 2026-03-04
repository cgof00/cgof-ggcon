export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  const SUPABASE_URL = env.SUPABASE_URL || 'https://dvziqcgjuidtkihoeqdc.supabase.co';
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2emlxY2dqdWlkdGtpaG9lcWRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjExNjQwMSwiZXhwIjoyMDg3NjkyNDAxfQ.bAgun92X0530xUXg_Wa5hrCAkLL-P8O44usT8o2_Mr8';

  // GET /api/formalizacao
  if (request.method === 'GET') {
    try {
      const pageParam = url.searchParams.get('page') || '0';
      const limitParam = url.searchParams.get('limit') || '100';
      const page = parseInt(pageParam);
      const limit = parseInt(limitParam);
      const start = page * limit;
      const end = start + limit - 1;

      // Buscar dados do Supabase
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?select=*&order=created_at.desc&limit=${limit}&offset=${start}`,
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
        return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
          status: resp.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const data = await resp.json();

      // Buscar total de registros
      const countResp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?select=count()`,
        {
          headers: {
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      let total = 0;
      if (countResp.ok) {
        const countData = await countResp.json();
        total = Array.isArray(countData) && countData.length > 0 ? countData.length : 0;
      }

      return new Response(JSON.stringify({
        data: Array.isArray(data) ? data : [],
        total: total,
        page: page,
        limit: limit
      }), {
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
