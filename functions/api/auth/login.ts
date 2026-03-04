import { createClient } from '@supabase/supabase-js';

export const onRequest: PagesFunction = async (context) => {
  const { request } = context;
  const url = new URL(request.url);

  const SUPABASE_URL = 'https://dvziqcgjuidtkhoeqdc.supabase.co';
  const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2emlxY2dqdWlkdGtwaG9lcWRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjExNjQwMSwiZXhwIjoyMDg3NjkyNDAxfQ.bAgun92X0530xUXg_Wa5hrCAkLL-P8O44usT8o2_Mr8';

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

  // TEST endpoint usando SDK
  if (request.method === 'GET' && url.pathname === '/api/auth/test') {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id,email,nome')
        .limit(1);
      return new Response(JSON.stringify({ ok: !error, error: error?.message, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  // PING
  if (request.method === 'GET' && url.pathname === '/api/auth/ping') {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }





  // LOGIN - Usando SDK do Supabase
  if (request.method === 'POST' && url.pathname === '/api/auth/login') {
    try {
      const body = await request.json();
      const email = body.email;
      const senha = body.senha;

      if (!email || !senha) {
        return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
      }

      const emailLower = email.toLowerCase();
      const hashCalc = hashPassword(senha);

      // Usar SDK do Supabase para query
      const { data: users, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', emailLower);

      if (error) {
        return new Response(JSON.stringify({ error: `Supabase error: ${error.message}` }), { status: 401 });
      }

      if (!Array.isArray(users) || users.length === 0) {
        return new Response(JSON.stringify({ error: 'Email ou senha incorretos' }), { status: 401 });
      }

      const user = users[0];

      if (hashCalc !== user.senha_hash) {
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
