export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;

  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ 
      error: 'Variáveis de ambiente não configuradas',
      env_keys: Object.keys(env)
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    // Testar conexão com Supabase
    const testResp = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?select=count()&limit=1`, {
      headers: {
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });

    const userTest = await testResp.text();

    // Contar formalizations
    const formalResp = await fetch(`${SUPABASE_URL}/rest/v1/formalizacao?select=id&limit=1`, {
      headers: {
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    });

    const contentRange = formalResp.headers.get('content-range');
    let formalCount = 0;
    if (contentRange) {
      const parts = contentRange.split('/');
      formalCount = parseInt(parts[1]) || 0;
    }

    return new Response(JSON.stringify({
      status: 'OK',
      supabase_url: SUPABASE_URL ? '✓' : '✗',
      supabase_key: SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗',
      usuarios_response: userTest.substring(0, 500),
      usuarios_status: testResp.status,
      formalizacao_count: formalCount,
      endpoints: {
        login: 'POST /api/auth/login',
        usuarios: 'GET /api/usuarios',
        formalizacao: 'GET /api/formalizacao',
        tecnicos: 'GET /api/formalizacao/tecnicos'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ 
      error: e.message,
      stack: e.stack
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
