// POST /api/admin/update-area-estagio
// Chama a função RPC update_area_estagio_from_sempapel() no Supabase
// Preenche area_estagio baseado em situacao_demandas_sempapel (lógica PROCX)
export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: 'Variáveis de ambiente não configuradas' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verificar autenticação (sem isso qualquer curl poderia chamar)
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const headers = {
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'apikey': SUPABASE_KEY,
    'Content-Type': 'application/json',
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000); // 55s — UPDATE em 37k rows

    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/update_area_estagio_from_sempapel`, {
      method: 'POST',
      headers,
      body: '{}',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(err.substring(0, 400));
    }

    const result = await resp.json();
    console.log('✅ PROCX area_estagio:', result);

    return new Response(JSON.stringify({
      success: true,
      updated: result?.updated || 0,
      message: result?.message || 'Concluído',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (e: any) {
    console.error('❌ Erro update-area-estagio:', e);
    const isTimeout = e?.name === 'AbortError' || (e?.message || '').includes('aborted');
    return new Response(JSON.stringify({
      error: isTimeout
        ? 'Timeout (>55s). Execute SELECT update_area_estagio_from_sempapel() diretamente no Supabase SQL Editor.'
        : e.message,
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
