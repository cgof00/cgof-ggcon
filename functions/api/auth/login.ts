export const onRequest: PagesFunction = async (context) => {
  const { request } = context;
  const url = new URL(request.url);

  const SUPABASE_URL = 'https://dvziqqcgjuidtkhoeqdc.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2emlxY2dqdWlkdGtwaG9lcWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTY0MDEsImV4cCI6MjA4NzY5MjQwMX0.Ck6FSoE-Ol1Te8dZ9qc4T9gGLKXukR-JsN3oK0M3iWE';

  function hashPassword(pwd: string): string {
    let h = 0;
    const s = 'salt';
    const c = pwd + s;
    for (let i = 0; i < c.length; i++) {
      h = ((h << 5) - h) + c.charCodeAt(i);
      h = h & h;
    }
    return Math.abs(h).toString(16);
  }

  // PING
  if (request.method === 'GET' && url.pathname === '/api/auth/ping') {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // TEST KEY
  if (request.method === 'GET' && url.pathname === '/api/auth/test-key') {
    try {
      const testUrl = SUPABASE_URL + '/rest/v1/usuarios?select=id&limit=1';
      const resp = await fetch(testUrl, {
        headers: {
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'apikey': SUPABASE_ANON_KEY
        }
      });
      const txt = await resp.text();
      return new Response(JSON.stringify({ status: resp.status, data: txt.substring(0, 200) }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Exception' }), { status: 500 });
    }
  }

  // HASH TEST
  if (request.method === 'GET' && url.pathname === '/api/auth/hash-test') {
    const pwd = url.searchParams.get('senha') || 'M@dmax2026';
    const h = hashPassword(pwd);
    return new Response(JSON.stringify({ senha: pwd, hash: h }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // LOGIN
  if (request.method === 'POST' && url.pathname === '/api/auth/login') {
    try {
      const body = await request.json();
      const email = body.email;
      const senha = body.senha;

      if (!email || !senha) {
        return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
      }

      const emailLower = email.toLowerCase();
      const emailEnc = encodeURIComponent(emailLower);
      const qUrl = SUPABASE_URL + '/rest/v1/usuarios?select=*&email=eq.' + emailEnc;

      const resp = await fetch(qUrl, {
        headers: {
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'apikey': SUPABASE_ANON_KEY
        }
      });

      if (!resp.ok) {
        const err = await resp.text();
        return new Response(JSON.stringify({ error: 'Supabase error: ' + err.substring(0, 100) }), { status: 401 });
      }

      const users = await resp.json();
      
      if (!Array.isArray(users) || users.length === 0) {
        return new Response(JSON.stringify({ error: 'User not found' }), { status: 401 });
      }

      const user = users[0];
      const hashCalc = hashPassword(senha);

      if (hashCalc !== user.senha_hash) {
        return new Response(JSON.stringify({ error: 'Wrong password', debug: { calc: hashCalc, banco: user.senha_hash } }), { status: 401 });
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
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Exception in login' }), { status: 500 });
    }
  }

  // DEBUG FULL
  if (request.method === 'GET' && url.pathname === '/api/auth/debug-full') {
    const email = url.searchParams.get('email') || 'afpereira@saude.sp.gov.br';
    const senha = url.searchParams.get('senha') || 'M@dmax2026';
    const hashCalc = hashPassword(senha);
    
    try {
      const emailLower = email.toLowerCase();
      const emailEnc = encodeURIComponent(emailLower);
      const qUrl = SUPABASE_URL + '/rest/v1/usuarios?select=*&email=eq.' + emailEnc;

      const resp = await fetch(qUrl, {
        headers: {
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'apikey': SUPABASE_ANON_KEY
        }
      });

      const users = await resp.json();

      return new Response(JSON.stringify({
        email: email,
        hash: hashCalc,
        status: resp.status,
        found: Array.isArray(users) ? users.length : 0,
        users: Array.isArray(users) ? users.map((u) => ({ id: u.id, email: u.email, hash: u.senha_hash })) : []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Exception' }), { status: 500 });
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
