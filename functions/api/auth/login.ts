export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // Usar variáveis do Cloudflare
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ 
      error: 'Variáveis de ambiente não configuradas no Cloudflare' 
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // SHA256 hash function
  async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  // PING
  if (request.method === 'GET' && url.pathname === '/api/auth/ping') {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // LOGIN
  if (request.method === 'POST' && url.pathname === '/api/auth/login') {
    try {
      const body = await request.json();
      const email = body.email || '';
      const senha = body.senha || '';

      if (!email || !senha) {
        return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const emailLower = email.toLowerCase();
      const hashCalc = await hashPassword(senha);

      console.log(`🔐 Login attempt: ${email}`);
      console.log(`   Hash calculado: ${hashCalc}`);

      // Fetch todos os usuários (sem filtro para evitar erro 1016)
      const resp = await fetch(SUPABASE_URL + '/rest/v1/usuarios?select=*', {
        headers: {
          'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error(`❌ Supabase error: ${resp.status}`);
        return new Response(JSON.stringify({ 
          error: `API error: ${errText.substring(0, 200)}` 
        }), { status: resp.status, headers: { 'Content-Type': 'application/json' } });
      }

      const users = await resp.json();

      // Filtro manual no JavaScript
      const user = Array.isArray(users) 
        ? users.find((u: any) => u.email && u.email.toLowerCase() === emailLower)
        : null;

      if (!user) {
        console.log('❌ User not found');
        return new Response(JSON.stringify({ error: 'Email ou senha incorretos' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      console.log(`✓ User found: ${user.email}`);
      console.log(`   Hash armazenado: ${user.senha_hash}`);

      // Comparar SHA256
      if (hashCalc !== user.senha_hash) {
        console.log('❌ Hash mismatch');
        return new Response(JSON.stringify({ error: 'Email ou senha incorretos' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      console.log(`✅ Login successful for ${user.email}`);

      const token = btoa(JSON.stringify({
        id: user.id,
        email: user.email,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + 86400
      }));

      return new Response(JSON.stringify({
        token: token,
        user: { id: user.id, email: user.email, nome: user.nome, role: user.role }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e: any) {
      console.error('❌ Exception:', e);
      return new Response(JSON.stringify({ error: `Exception: ${e.message}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  // OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  return new Response('Not found', { status: 404 });
};
