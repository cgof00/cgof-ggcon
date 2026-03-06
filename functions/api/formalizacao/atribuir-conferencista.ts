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
    const { ids, usuario_id, data_recebimento_demanda } = body;

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

    if (!usuario_id) {
      return new Response(JSON.stringify({ error: 'ID do usuário inválido' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!data_recebimento_demanda || !/^\d{4}-\d{2}-\d{2}$/.test(data_recebimento_demanda)) {
      return new Response(JSON.stringify({ error: 'Data em formato inválido (use YYYY-MM-DD)' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Buscar dados do conferencista
    const userResp = await fetch(
      `${SUPABASE_URL}/rest/v1/usuarios?select=id,nome,email&id=eq.${usuario_id}`,
      {
        headers: {
          'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!userResp.ok) {
      return new Response(JSON.stringify({ error: 'Erro ao buscar conferencista' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const usuarios = await userResp.json() as any[];
    if (!usuarios || usuarios.length === 0) {
      return new Response(JSON.stringify({ error: 'Conferencista não encontrado' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const conferencista = usuarios[0];

    // Atualizar formalizações
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
          conferencista: conferencista.nome,
          data_recebimento_demanda: data_recebimento_demanda,
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
      message: 'Conferencista atribuído com sucesso',
      updated: updatedData?.length || 0,
      conferencista: conferencista.nome,
      updatedRecords: updatedData || [],
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
