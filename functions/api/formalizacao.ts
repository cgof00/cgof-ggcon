// Endpoint simples que retorna TODOS os registros
// Sem cache compartilhado entre handlers do Cloudflare

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
      const pageParam = url.searchParams.get('page') || '0';
      // Default para 37352 (total de registros) se não especificado
      const limitParam = url.searchParams.get('limit') || '37352';
      const page = parseInt(pageParam);
      const limit = Math.min(parseInt(limitParam), 37352); // Cap at 37352
      const offset = page * limit;

      console.log(`📥 GET /api/formalizacao - page: ${page}, limit: ${limit}, offset: ${offset}`);

      // Buscar dados com paginação
      const dataResp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?order=created_at.desc&limit=${limit}&offset=${offset}`,
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

      // Contar total de registros
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

      console.log(`✅ Retornando ${data?.length || 0} registros de ${total} total`);

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
