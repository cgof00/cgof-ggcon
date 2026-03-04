export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // Usar variáveis do Cloudflare ou fallback
  const SUPABASE_URL = env.SUPABASE_URL || 'https://dvziqcgjuidtkihoeqdc.supabase.co';
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2emlxY2dqdWlkdGtpaG9lcWRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjExNjQwMSwiZXhwIjoyMDg3NjkyNDAxfQ.bAgun92X0530xUXg_Wa5hrCAkLL-P8O44usT8o2_Mr8';

  // SHA256 hash function - CORRETO
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

  // TEST - Teste simples
  if (request.method === 'GET' && url.pathname === '/api/auth/test-raw') {
    try {
      const resp = await fetch('https://dvziqcgjuidtkhoeqdc.supabase.co/rest/v1/usuarios?select=id&limit=1', {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2emlxY2dqdWlkdGtwaG9lcWRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjExNjQwMSwiZXhwIjoyMDg3NjkyNDAxfQ.bAgun92X0530xUXg_Wa5hrCAkLL-P8O44usT8o2_Mr8',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2emlxY2dqdWlkdGtwaG9lcWRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjExNjQwMSwiZXhwIjoyMDg3NjkyNDAxfQ.bAgun92X0530xUXg_Wa5hrCAkLL-P8O44usT8o2_Mr8'
        }
      });
      const text = await resp.text();
      return new Response(JSON.stringify({
        status: resp.status,
        data: text.substring(0, 500)
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.toString() }), { status: 500 });
    }
  }

  // LOGIN - Carrega TODOS os usuários e filtra no JavaScript
  if (request.method === 'POST' && url.pathname === '/api/auth/login') {
    try {
      const body = await request.json();
      const email = body.email || '';
      const senha = body.senha || '';

      if (!email || !senha) {
        return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
      }

      const emailLower = email.toLowerCase();
      const hashCalc = await hashPassword(senha);

      // Fetch SEM filtro de email - isto contorna o erro 1016 do filtro
      const resp = await fetch(SUPABASE_URL + '/rest/v1/usuarios?select=*', {
        headers: {
          'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!resp.ok) {
        const errText = await resp.text();
        return new Response(JSON.stringify({ 
          error: `API error: ${errText.substring(0, 200)}` 
        }), { status: resp.status });
      }

      const users = await resp.json();

      // Filtro manual no JavaScript
      const user = Array.isArray(users) 
        ? users.find((u: any) => u.email && u.email.toLowerCase() === emailLower)
        : null;

      if (!user) {
        return new Response(JSON.stringify({ error: 'Email ou senha incorretos' }), { status: 401 });
      }

      // Comparar SHA256
      if (hashCalc !== user.senha_hash) {
        console.log('Hash mismatch:', { calculado: hashCalc, armazenado: user.senha_hash });
        return new Response(JSON.stringify({ error: 'Email ou senha incorretos' }), { status: 401 });
      }

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
      return new Response(JSON.stringify({ error: `Exception: ${e.message}` }), { status: 500 });
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
