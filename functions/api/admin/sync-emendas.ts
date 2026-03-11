// POST /api/admin/sync-emendas
// Sincroniza emendas → formalizacao em 3 etapas separadas para evitar timeout
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

  const headers = {
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'apikey': SUPABASE_KEY,
    'Content-Type': 'application/json'
  };

  async function callRpc(fnName: string): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
      method: 'POST', headers, body: '{}', signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(err.substring(0, 300));
    }
    return resp.json();
  }

  try {
    // Etapa 1: UPDATE por numero_convenio
    let r1, r2, r3;
    try {
      r1 = await callRpc('sync_step1_update_convenio');
    } catch (e: any) {
      console.error('Etapa 1 falhou:', e.message?.substring(0, 200));
      r1 = { updated: 0, error: e.message?.substring(0, 100) };
    }

    // Etapa 2: UPDATE por emenda/codigo_num
    try {
      r2 = await callRpc('sync_step2_update_emenda');
    } catch (e: any) {
      console.error('Etapa 2 falhou:', e.message?.substring(0, 200));
      r2 = { updated: 0, error: e.message?.substring(0, 100) };
    }

    // Etapa 3: INSERT novas emendas na formalização
    try {
      r3 = await callRpc('sync_step3_insert_novas');
    } catch (e: any) {
      console.error('Etapa 3 falhou:', e.message?.substring(0, 200));
      r3 = { inserted: 0, error: e.message?.substring(0, 100) };
    }

    return new Response(JSON.stringify({
      success: true,
      result: {
        updated_by_convenio: r1?.updated || 0,
        updated_by_emenda: r2?.updated || 0,
        inserted: r3?.inserted || 0,
        message: `${(r1?.updated || 0) + (r2?.updated || 0)} atualizadas, ${r3?.inserted || 0} inseridas`
      }
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
