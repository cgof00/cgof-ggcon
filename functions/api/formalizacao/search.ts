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

  // GET /api/formalizacao/search
  if (request.method === 'GET') {
    try {
      const search = url.searchParams.get('q') || '';
      const pageParam = url.searchParams.get('page') || '0';
      const limitParam = url.searchParams.get('limit') || '100';
      const page = parseInt(pageParam);
      const limit = parseInt(limitParam);
      const offset = page * limit;

      console.log(`🔍 GET /api/formalizacao/search - q: "${search}", page: ${page}`);

      // Se há busca, filtrar (simplificado - apenas parlamentar)
      let query = `/rest/v1/formalizacao?order=created_at.desc&limit=${limit}&offset=${offset}`;
      
      if (search) {
        // Buscar em algumas colunas principais
        const searchFilter = `or=(parlamentar.ilike.*${search}*,conveniado.ilike.*${search}*,objeto.ilike.*${search}*)`;
        query = `/rest/v1/formalizacao?${searchFilter}&order=created_at.desc&limit=${limit}&offset=${offset}`;
      }

      const dataResp = await fetch(SUPABASE_URL + query, {
        headers: {
          'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!dataResp.ok) {
        const err = await dataResp.text();
        return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
          status: dataResp.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const data = await dataResp.json();

      // Contar total
      const countQuery = search 
        ? `/rest/v1/formalizacao?${`or=(parlamentar.ilike.*${search}*,conveniado.ilike.*${search}*,objeto.ilike.*${search}*)`}&select=id`
        : `/rest/v1/formalizacao?select=id`;

      const countResp = await fetch(SUPABASE_URL + countQuery, {
        headers: {
          'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact'
        }
      });

      let total = 0;
      if (countResp.ok) {
        const contentRange = countResp.headers.get('content-range');
        if (contentRange) {
          const parts = contentRange.split('/');
          total = parseInt(parts[1]) || 0;
        }
      }

      console.log(`✅ ${data?.length || 0} registros encontrados de ${total}`);

      return new Response(JSON.stringify({
        data: Array.isArray(data) ? data : [],
        total: total,
        page: page,
        limit: limit,
        search: search
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
