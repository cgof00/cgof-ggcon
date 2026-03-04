export const onRequest: PagesFunction = async (context) => {
  const { request } = context;
  const url = new URL(request.url);

  // Constantes globais de Supabase
  const SUPABASE_URL = 'https://dvziqcgjuidtkihoeqdc.supabase.co';
  const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2emlxY2dqdWlkdGtpaG9lcWRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjExNjQwMSwiZXhwIjoyMDg3NjkyNDAxfQ.bAgun92X0530xUXg_Wa5hrCAkLL-P8O44usT8o2_Mr8';
  // Helper global para hash de senha
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
  // DEBUG: GET /api/auth/ping - Simples teste de conexão
  if (request.method === 'GET' && url.pathname === '/api/auth/ping') {
    return new Response(
      JSON.stringify({ status: 'ok', message: 'Endpoint funcionando!' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // DEBUG: GET /api/auth/test-key - Testa se a chave service_role funciona
  if (request.method === 'GET' && url.pathname === '/api/auth/test-key') {
    try {
      const testUrl = `${SUPABASE_URL}/rest/v1/usuarios?select=id,email&limit=1`;
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
        },
      });

      const body = await response.text();

      return new Response(
        JSON.stringify({
          status: response.status,
          ok: response.ok,
          body: body.substring(0, 500), // Primeiros 500 chars
        }, null, 2),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // DEBUG: GET /api/auth/debug-full - Debug completo do login
  if (request.method === 'GET' && url.pathname === '/api/auth/debug-full') {
    try {
      const email = url.searchParams.get('email') || 'afpereira@saude.sp.gov.br';
      const senha = url.searchParams.get('senha') || 'M@dmax2026';
      
      const hashCalculado = hashPassword(senha);
      
      // Busca simples
      const emailLower = email.toLowerCase();
      const emailEncoded = encodeURIComponent(emailLower);
      const queryUrl = `${SUPABASE_URL}/rest/v1/usuarios?select=*&email=eq.${emailEncoded}`;
      
      const response = await fetch(queryUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
        },
      });

      const usuarios = await response.json();

      return new Response(
        JSON.stringify({
          email_procurado: email,
          hash_calculado: hashCalculado,
          query_status: response.status,
          usuarios_encontrados: Array.isArray(usuarios) ? usuarios.length : 0,
          usuarios: Array.isArray(usuarios) ? usuarios.map((u: any) => ({
            id: u.id,
            email: u.email,
            nome: u.nome,
            hash: u.senha_hash,
            match: u.senha_hash === hashCalculado,
          })) : usuarios
        }, null, 2),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // DEBUG: GET /api/auth/hash-test - Testar hash de senha
  if (request.method === 'GET' && url.pathname === '/api/auth/hash-test') {
    try {
      const senha = url.searchParams.get('senha') || 'M@dmax2026';
      const hash = hashPassword(senha);
      return new Response(
        JSON.stringify({
          senha,
          hash,
          length: hash.length,
        }, null, 2),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: String(error) }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // DEBUG: POST /api/auth/hash-compare - Comparar senha com hash do banco
  if (request.method === 'POST' && url.pathname === '/api/auth/hash-compare') {
    try {
      const { senha, hash_banco } = await request.json();
      const hashCalculado = hashPassword(senha);
      const batem = hashCalculado === hash_banco;
      
      return new Response(
        JSON.stringify({
          senha,
          hashCalculado,
          hash_banco,
          batem,
          comprimentoCalculado: hashCalculado.length,
          comprimentoBanco: hash_banco.length,
        }, null, 2),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: String(error) }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // DEBUG: GET /api/auth/debug - Ver estado do usuário
  if (request.method === 'GET' && url.pathname === '/api/auth/debug') {
    try {
      const email = url.searchParams.get('email') || 'afpereira@saude.sp.gov.br';

      const emailEncoded = encodeURIComponent(email.toLowerCase());
      const queryUrl = `${SUPABASE_URL}/rest/v1/usuarios?select=*&email=eq.${emailEncoded}`;

      const response = await fetch(queryUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
      });

      const usuarios = await response.json();

      if (Array.isArray(usuarios) && usuarios.length > 0) {
        const user = usuarios[0];
        return new Response(
          JSON.stringify({
            found: true,
            id: user.id,
            email: user.email,
            nome: user.nome,
            role: user.role,
            ativo: user.ativo,
            senha_hash: user.senha_hash,
          }, null, 2),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } else {
        return new Response(
          JSON.stringify({ found: false, email }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ error: String(error) }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // DEBUG: GET /api/auth/list - Lista todos os usuários
  if (request.method === 'GET' && url.pathname === '/api/auth/list') {
    try {
      const queryUrl = `${SUPABASE_URL}/rest/v1/usuarios?select=*`;
      const response = await fetch(queryUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
      });
      const usuarios = await response.json();
      return new Response(
        JSON.stringify(usuarios, null, 2),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: String(error) }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

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

      // Helper para hash de senha
      // (agora é global no escopo da função)

      // Buscar usuário (case-insensitive usando ilike com wildcards)
      const emailEncoded = encodeURIComponent(email);
      const queryUrl = `${SUPABASE_URL}/rest/v1/usuarios?select=*&email=ilike.%${emailEncoded}%`;

      console.log('🔐 POST /api/auth/login');
      console.log('  Email recebido:', email);
      console.log('  Email encoded:', emailEncoded);
      console.log('  Query URL:', queryUrl);
      console.log('  Senha recebida:', senha);

      const response = await fetch(queryUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
      });

      console.log('  Response status:', response.status);
      console.log('  Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro Supabase:', response.status, errorText);
        return new Response(JSON.stringify({ error: 'Email ou senha incorretos', debug: `Supabase error: ${errorText}` }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const usuarios = await response.json();
      console.log('  Usuarios encontrados:', usuarios.length);
      
      if (Array.isArray(usuarios) && usuarios.length > 0) {
        console.log('  Primeiro usuário:', JSON.stringify(usuarios[0]));
      }

      if (!Array.isArray(usuarios) || usuarios.length === 0) {
        console.error('❌ Usuário não encontrado com ilike');
        return new Response(JSON.stringify({ error: 'Email ou senha incorretos' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const user = usuarios[0];
      console.log('✅ Usuário encontrado:', user.id);
      console.log('  Nome:', user.nome);
      console.log('  Role:', user.role);
      console.log('  Ativo:', user.ativo);
      console.log('  Hash no banco:', user.senha_hash);

      // Verificar senha
      const hashedPassword = hashPassword(senha);
      console.log('  Senha recebida:', senha);
      console.log('  Hash calculado:', hashedPassword);
      console.log('  Hash no banco:', user.senha_hash);
      console.log('  Comprimento hash calculado:', hashedPassword.length);
      console.log('  Comprimento hash banco:', user.senha_hash.length);
      console.log('  Batem?', hashedPassword === user.senha_hash ? '✅ SIM' : '❌ NÃO');

      if (hashedPassword !== user.senha_hash) {
        console.log('❌ Senha incorreta - hash não bate');
        return new Response(JSON.stringify({ error: 'Email ou senha incorretos', debug: { 
          hashCalculado: hashedPassword,
          hashBanco: user.senha_hash,
          batem: false
        }}), {
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
