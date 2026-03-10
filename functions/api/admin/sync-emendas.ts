// POST /api/admin/sync-emendas
// Sincroniza emendas → formalizacao (atualiza apenas colunas mapeadas e novas emendas)
export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: 'Variáveis de ambiente não configuradas' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Chamar a função RPC sync_emendas_formalizacao no Supabase (timeout aumentado para 120s)
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/sync_emendas_formalizacao`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json'
        },
        body: '{}',
        timeout: 120000 // 120 segundos
      }
    );

    if (!resp.ok) {
      const err = await resp.text();
      console.error('Erro sync:', err.substring(0, 500));
      return new Response(JSON.stringify({ error: err.substring(0, 300) }), {
        status: resp.status, headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await resp.json();
    
    return new Response(JSON.stringify({ 
      success: true, 
      result 
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    console.error('Erro sync-emendas:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};
