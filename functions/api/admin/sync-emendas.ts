// POST /api/admin/sync-emendas
// Sincroniza emendas → formalizacao em 2 etapas separadas para evitar duplicação
// Opção: { onlyNew: true } para inserir apenas novas emendas
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

  // Ler body para opções
  let requestBody: any = { onlyNew: false }; // default: FALSO = fazer AMBAS (atualizar + inserir)
  try {
    const bodyText = await request.text();
    if (bodyText) {
      requestBody = JSON.parse(bodyText);
    }
  } catch (e) {
    console.warn('Erro ao parsear body, usando default:', e);
  }

  const onlyNew = requestBody.onlyNew === true; // Apenas TRUE ativa onlyNew (mais seguro)
  console.log(`🔄 Sincronizando (onlyNew=${onlyNew})...`);

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
    let r1: any = { updated: 0, status: 'skipped' };
    let r2: any = { inserted: 0, status: 'skipped' };

    // Etapa 1: Atualizar emendas existentes
    if (!onlyNew) {
      try {
        console.log('Etapa 1: Atualizando emendas existentes...');
        r1 = await callRpc('sync_formalizacao_atualizar');
        console.log('Etapa 1 sucesso:', r1);
      } catch (e: any) {
        console.error('Etapa 1 falhou:', e.message?.substring(0, 200));
        r1 = { updated: 0, status: 'error', error: e.message?.substring(0, 100) };
      }
    }

    // Etapa 2: Inserir apenas novas emendas (sem duplicatas)
    try {
      console.log('Etapa 2: Inserindo apenas novas emendas...');
      r2 = await callRpc('sync_formalizacao_novas');
      console.log('Etapa 2 sucesso:', r2);
    } catch (e: any) {
      console.error('Etapa 2 falhou:', e.message?.substring(0, 200));
      r2 = { inserted: 0, status: 'error', error: e.message?.substring(0, 100) };
    }

    return new Response(JSON.stringify({
      success: true,
      result: {
        updated: r1?.updated || 0,
        inserted: r2?.inserted || 0,
        message: `${r1?.updated || 0} atualizadas, ${r2?.inserted || 0} novas inseridas`,
        onlyNew: onlyNew
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
