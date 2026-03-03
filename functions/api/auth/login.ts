export const onRequest: PagesFunction = async (context) => {
  const { request } = context;
  const url = new URL(request.url);

  // POST /api/auth/login
  if (request.method === 'POST' && url.pathname === '/api/auth/login') {
    try {
      const { email, senha } = await request.json();

      if (!email || !senha) {
        return new Response(JSON.stringify({ error: 'Email e senha são obrigatórios' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const SUPABASE_URL = 'https://dvziqqcgjuidtkhoeqdc.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2emlxY2dqdWlkdGtwaG9lcWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTY0MDEsImV4cCI6MjA4NzY5MjQwMX0.Ck6FSoE-Ol1Te8dZ9qc4T9gGLKXukR-JsN3oK0M3iWE';

      // Helper para hash de senha
      function hashPassword(password: string): string {
        let hash = 0;
        const salt = 'salt';
        const combined = password + salt;
        for (let i = 0; i < combined.length; i++) {
          const char = combined.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
      }

      // Buscar usuário
      const emailEncoded = encodeURIComponent(email.toLowerCase());
      const queryUrl = `${SUPABASE_URL}/rest/v1/usuarios?select=*&email=eq.${emailEncoded}`;

      console.log('🔍 Buscando usuário:', email);

      const response = await fetch(queryUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('❌ Erro Supabase:', response.status);
        return new Response(JSON.stringify({ error: 'Email ou senha incorretos' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const usuarios = await response.json();

      if (!Array.isArray(usuarios) || usuarios.length === 0) {
        console.error('❌ Usuário não encontrado');
        return new Response(JSON.stringify({ error: 'Email ou senha incorretos' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const user = usuarios[0];
      console.log('✅ Usuário encontrado:', user.id);

      // Verificar senha
      const hashedPassword = hashPassword(senha);
      if (hashedPassword !== user.senha_hash) {
        console.log('❌ Senha incorreta');
        return new Response(JSON.stringify({ error: 'Email ou senha incorretos' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Gerar token
      const token = btoa(
        JSON.stringify({
          id: user.id,
          email: user.email,
          role: user.role,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
        })
      );

      console.log('✅ Login sucesso:', email);

      return new Response(
        JSON.stringify({
          token,
          user: {
            id: user.id,
            email: user.email,
            nome: user.nome,
            role: user.role,
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    } catch (error) {
      console.error('❌ Erro:', error);
      return new Response(JSON.stringify({ error: 'Erro ao fazer login' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  return new Response('Not found', { status: 404 });
};
