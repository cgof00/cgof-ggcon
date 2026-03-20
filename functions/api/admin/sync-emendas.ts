// POST /api/admin/sync-emendas
// 🚀 SINCRONIZAÇÃO INCREMENTAL - Simples e Eficiente
// Compara toda emendas.codigo_num vs formalizacao.emenda (normalizado),
// insere apenas o que está faltando e atualiza apenas anos 2023-2026.
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
    console.log('🔄 Verificando staging e sincronizando...');
    
    // 1. Verificar quantos registros estão no staging antes de sincronizar
    const countResp = await fetch(`${SUPABASE_URL}/rest/v1/emendas?select=id&limit=1`, {
      headers: { ...headers, 'Prefer': 'count=exact' }
    });
    const stagingCount = countResp.ok
      ? parseInt(countResp.headers.get('content-range')?.split('/')[1] || '0', 10)
      : 0;
    
    if (stagingCount === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Nenhum registro no staging (tabela emendas vazia). Importe o CSV primeiro.',
        result: { inserted: 0, updated: 0, staging_count: 0 }
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    console.log(`📊 Staging: ${stagingCount} emendas aguardando sync`);
    
    const result = await callRpc('sync_emendas_formalizacao');
    
    console.log('✅ Sincronização sucesso:', result);

    // Limpar tabela emendas (staging) após sync para economizar espaço no banco
    let emendasCleaned = false;
    try {
      const deleteResp = await fetch(`${SUPABASE_URL}/rest/v1/emendas?id=gte.0`, {
        method: 'DELETE',
        headers: {
          ...headers,
          'Prefer': 'return=minimal'
        }
      });
      if (deleteResp.ok) {
        emendasCleaned = true;
        console.log('🧹 Tabela emendas limpa após sincronização (economia de espaço)');
      } else {
        console.warn('⚠️ Não foi possível limpar tabela emendas:', await deleteResp.text());
      }
    } catch (cleanErr: any) {
      console.warn('⚠️ Erro ao limpar emendas:', cleanErr.message);
    }

    return new Response(JSON.stringify({
      success: true,
      result: {
        inserted: result?.inserted || 0,
        updated: result?.updated || 0,
        staging_count: stagingCount,
        emendas_cleaned: emendasCleaned,
        message: result?.message || 'Sincronização concluída'
      }
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    console.error('❌ Erro sync-emendas:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};
