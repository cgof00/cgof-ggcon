export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;

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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json() as any;
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return new Response(JSON.stringify({ error: 'IDs não são válidos' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const validIds = ids.filter((id: any) => {
      const num = parseInt(id, 10);
      return !isNaN(num) && num > 0;
    });

    if (validIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum ID válido fornecido' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const idsFilter = validIds.map((id: any) => `${id}`).join(',');
    const updateResp = await fetch(
      `${SUPABASE_URL}/rest/v1/formalizacao?id=in.(${idsFilter})`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          conferencista: null,
          data_recebimento_demanda: null,
          updated_at: new Date().toISOString()
        })
      }
    );

    if (!updateResp.ok) {
      const err = await updateResp.text();
      return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const updatedData = await updateResp.json() as any[];

    return new Response(JSON.stringify({
      message: 'Atribuição de conferencista removida com sucesso',
      updated: updatedData?.length || 0,
      success: true
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    console.error('❌ ERRO:', e);
    return new Response(JSON.stringify({ error: e.message, success: false }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};
