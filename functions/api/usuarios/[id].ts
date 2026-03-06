// Helper: verify auth token
function verifyToken(token: string): any {
  try {
    const payload = atob(token);
    const decoded = JSON.parse(payload);
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export const onRequest: PagesFunction = async (context) => {
  const { request, env, params } = context;
  const id = params.id;

  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Variáveis de ambiente não configuradas' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verify admin auth
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Token não fornecido' }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }
  const decoded = verifyToken(authHeader.slice(7));
  if (!decoded) {
    return new Response(JSON.stringify({ error: 'Token inválido ou expirado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }
  if (decoded.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Acesso negado' }), {
      status: 403, headers: { 'Content-Type': 'application/json' }
    });
  }

  // PUT /api/usuarios/:id (atualizar usuário)
  if (request.method === 'PUT') {
    try {
      const body = await request.json();
      const { role, ativo, nome, email } = body as Record<string, any>;

      console.log(`✏️ PUT /api/usuarios/${id} - Updates:`, { role, ativo, nome, email });

      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString()
      };

      if (role !== undefined) updateData.role = role;
      if (ativo !== undefined) updateData.ativo = ativo;
      if (nome !== undefined) updateData.nome = nome;
      if (email !== undefined) updateData.email = (email as string).toLowerCase().trim();

      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/usuarios?id=eq.${id}&select=id,email,nome,role,ativo,created_at,updated_at`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
            'apikey': SUPABASE_SERVICE_ROLE_KEY as string,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(updateData)
        }
      );

      if (!resp.ok) {
        const err = await resp.text();
        console.error('❌ Erro Supabase:', err);
        return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
          status: resp.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const data = await resp.json();
      const usuario = Array.isArray(data) ? data[0] : data;
      console.log(`✅ Usuário ${id} atualizado`);

      return new Response(JSON.stringify({ success: true, usuario }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e: any) {
      console.error('❌ ERRO PUT:', e);
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
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
};
