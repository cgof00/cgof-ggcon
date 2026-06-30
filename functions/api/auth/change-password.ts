// Cloudflare Pages Function: POST /api/auth/change-password

function verifyToken(token: string): any {
  try {
    const payload = atob(token);
    const decoded = JSON.parse(payload);
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verificar token
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Token não fornecido' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return new Response(JSON.stringify({ error: 'Token inválido ou expirado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Ler body
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { senhaAtual, novaSenha } = body;

  if (!senhaAtual || !novaSenha) {
    return new Response(JSON.stringify({ error: 'Senha atual e nova senha são obrigatórias' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (novaSenha.trim().length < 6) {
    return new Response(JSON.stringify({ error: 'Nova senha deve ter no mínimo 6 caracteres' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Configuração do servidor incompleta' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // id pode ser 'id' (cloudflare login) ou 'userId' (express login)
  const userId = decoded.id ?? decoded.userId;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Token inválido: sem ID de usuário' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Buscar usuário no Supabase para validar senha atual
  const fetchResp = await fetch(
    `${supabaseUrl}/rest/v1/usuarios?id=eq.${userId}&select=id,senha_hash`,
    {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!fetchResp.ok) {
    const errText = await fetchResp.text();
    console.error('❌ Supabase fetch error:', fetchResp.status, errText);
    return new Response(JSON.stringify({ error: 'Erro ao buscar usuário' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const users = await fetchResp.json();
  if (!Array.isArray(users) || users.length === 0) {
    return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const user = users[0];
  const hashAtual = await hashPassword(senhaAtual);

  if (hashAtual !== user.senha_hash) {
    return new Response(JSON.stringify({ error: 'Senha atual incorreta' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Atualizar senha
  const novoHash = await hashPassword(novaSenha);
  const updateResp = await fetch(
    `${supabaseUrl}/rest/v1/usuarios?id=eq.${userId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        senha_hash: novoHash,
        updated_at: new Date().toISOString(),
      }),
    }
  );

  if (!updateResp.ok) {
    const errText = await updateResp.text();
    console.error('❌ Supabase update error:', updateResp.status, errText);
    return new Response(JSON.stringify({ error: 'Erro ao atualizar senha' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log(`✅ Senha alterada para userId=${userId}`);
  return new Response(JSON.stringify({ message: 'Senha alterada com sucesso' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
