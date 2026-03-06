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

// SHA256 hash function (Web Crypto API)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const onRequest: PagesFunction = async (context) => {
  const { request, env, params } = context;
  const id = params.id;

  const SUPABASE_URL = env.SUPABASE_URL as string;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY as string;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Variáveis de ambiente não configuradas' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
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

  // DELETE /api/admin/usuarios/:id — soft delete (desativar)
  if (request.method === 'DELETE') {
    try {
      const body = await request.json() as Record<string, any>;
      const { senha } = body;

      if (!senha) {
        return new Response(JSON.stringify({ error: 'Senha é obrigatória para deletar um usuário' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        });
      }

      // Verify admin password
      const adminResp = await fetch(
        `${SUPABASE_URL}/rest/v1/usuarios?id=eq.${decoded.id || decoded.userId}&select=senha_hash`,
        {
          headers: {
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!adminResp.ok) {
        return new Response(JSON.stringify({ error: 'Erro ao verificar credenciais' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        });
      }

      const adminData = await adminResp.json();
      const admin = Array.isArray(adminData) ? adminData[0] : adminData;

      if (!admin) {
        return new Response(JSON.stringify({ error: 'Admin não encontrado' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        });
      }

      const senhaHash = await hashPassword(senha);
      if (senhaHash !== admin.senha_hash) {
        return new Response(JSON.stringify({ error: 'Senha incorreta' }), {
          status: 401, headers: { 'Content-Type': 'application/json' }
        });
      }

      // Soft delete - set ativo = false
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/usuarios?id=eq.${id}&select=id,email,nome,role,ativo`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({ ativo: false, updated_at: new Date().toISOString() })
        }
      );

      if (!resp.ok) {
        const err = await resp.text();
        return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
          status: resp.status, headers: { 'Content-Type': 'application/json' }
        });
      }

      const data = await resp.json();
      const usuario = Array.isArray(data) ? data[0] : data;

      return new Response(JSON.stringify({ message: 'Usuário deletado com sucesso', usuario }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405, headers: { 'Content-Type': 'application/json' }
  });
};
