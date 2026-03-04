export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;

  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ 
      error: 'Variáveis de ambiente não configuradas' 
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const url = new URL(request.url);

  // GET /api/usuarios (lista todos para admin)
  if (request.method === 'GET') {
    try {
      console.log('👥 GET /api/usuarios');

      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/usuarios?select=id,email,nome,role,ativo,created_at,updated_at&order=created_at.desc`,
        {
          headers: {
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!resp.ok) {
        const err = await resp.text();
        return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
          status: resp.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const data = await resp.json();
      console.log(`✅ ${data?.length || 0} usuários encontrados`);

      return new Response(JSON.stringify(Array.isArray(data) ? data : []), {
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

  // POST /api/usuarios (criar novo usuário)
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const { email, nome, role, ativo } = body;

      if (!email || !nome) {
        return new Response(JSON.stringify({ error: 'Email e nome são obrigatórios' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      console.log(`📝 POST /api/usuarios - email: ${email}`);

      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/usuarios`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email,
            nome,
            role: role || 'usuario',
            ativo: ativo !== false,
            senha_hash: ''  // Será definida depois
          })
        }
      );

      if (!resp.ok) {
        const err = await resp.text();
        return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
          status: resp.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const data = await resp.json();
      console.log(`✅ Usuário criado: ${email}`);

      return new Response(JSON.stringify(data), {
        status: 201,
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
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
};
