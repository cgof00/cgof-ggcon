import { createClient } from '@supabase/supabase-js';

export const onRequest: PagesFunction = async (context) => {
  const { request } = context;
  const url = new URL(request.url);

  const SUPABASE_URL = 'https://dvziqcgjuidtkhoeqdc.supabase.co';
  const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2emlxY2dqdWlkdGtwaG9lcWRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjExNjQwMSwiZXhwIjoyMDg3NjkyNDAxfQ.bAgun92X0530xUXg_Wa5hrCAkLL-P8O44usT8o2_Mr8';

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

  // TEST - Tenta listar usuários sem filtro
  if (request.method === 'GET' && url.pathname === '/api/auth/test') {
    try {
      const resp = await fetch(SUPABASE_URL + '/rest/v1/usuarios?select=id,email,nome&limit=5', {
        headers: {
          'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });
      const data = await resp.json();
      return new Response(JSON.stringify({
        status: resp.status,
        ok: resp.ok,
        count: Array.isArray(data) ? data.length : 0,
        data: data
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
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
      const hashCalc = hashPassword(senha);

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
