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
  const { request, env } = context;

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

  // POST /api/admin/usuarios — criar usuário
  if (request.method === 'POST') {
    try {
      const body = await request.json() as Record<string, any>;
      const { email, nome, role, senha } = body;

      if (!email || !nome) {
        return new Response(JSON.stringify({ error: 'Email e nome são obrigatórios' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        });
      }

      if (role && !['admin', 'usuario'].includes(role)) {
        return new Response(JSON.stringify({ error: "Role inválido - deve ser 'admin' ou 'usuario'" }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        });
      }

      // Generate or use provided password
      let senhaTemp = senha;
      if (!senhaTemp) {
        senhaTemp = Math.random().toString(36).substring(2, 10) +
          Math.random().toString(36).substring(2, 3).toUpperCase() +
          Math.random().toString(36).substring(2, 3).toUpperCase();
      }

      const senhaHash = await hashPassword(senhaTemp);

      const resp = await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          nome,
          role: role || 'usuario',
          senha_hash: senhaHash,
          ativo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      });

      if (!resp.ok) {
        const err = await resp.text();
        if (err.includes('duplicate') || err.includes('unique')) {
          return new Response(JSON.stringify({ error: 'Este email já está cadastrado' }), {
            status: 400, headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
          status: resp.status, headers: { 'Content-Type': 'application/json' }
        });
      }

      const data = await resp.json();
      const usuario = Array.isArray(data) ? data[0] : data;

      return new Response(JSON.stringify({
        usuario,
        senhaTemporaria: senhaTemp,
        aviso: !senha ? 'Compartilhe a senha temporária com o usuário.' : 'Usuário criado com a senha fornecida.'
      }), {
        status: 201, headers: { 'Content-Type': 'application/json' }
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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405, headers: { 'Content-Type': 'application/json' }
  });
};
