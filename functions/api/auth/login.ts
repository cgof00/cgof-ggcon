// Hash password helper - simples para compatibilidade
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

// Generate token - simple base64
function generateToken(id: number, email: string, role: string): string {
  const payload = {
    id,
    email,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
  };
  
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  } else {
    // Cloudflare Workers - usar btoa
    return btoa(JSON.stringify(payload));
  }
}

export const onRequest: PagesFunction = async (context) => {
  const { request } = context;

  // Handle CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Only POST allowed
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { email, senha } = await request.json();

    if (!email || !senha) {
      return new Response(
        JSON.stringify({ error: 'Email e senha são obrigatórios' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = context.env.SUPABASE_URL;
    const supabaseKey = context.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('Auth attempt:', {
      email,
      supabaseUrl: supabaseUrl ? 'configured' : 'MISSING',
      supabaseKey: supabaseKey ? 'configured' : 'MISSING'
    });

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase config:', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
      return new Response(
        JSON.stringify({ 
          error: 'Configuração do servidor incompleta. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no Cloudflare Dashboard.',
          details: 'Missing environment variables'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Dynamically import Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query usuarios table
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    console.log('Usuario lookup:', { email, found: !!usuarios, error: error?.message });

    if (error || !usuarios) {
      return new Response(
        JSON.stringify({ error: 'Email ou senha incorretos' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify password
    const isValid = hashPassword(senha) === usuarios.senha;

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Email ou senha incorretos' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate token
    const token = generateToken(usuarios.id, usuarios.email, usuarios.role);

    // Update last login
    await supabase
      .from('usuarios')
      .update({ ultima_sessao: new Date().toISOString() })
      .eq('id', usuarios.id)
      .catch(err => console.error('Error updating last login:', err));

    return new Response(
      JSON.stringify({
        token,
        user: {
          id: usuarios.id,
          email: usuarios.email,
          nome: usuarios.nome,
          role: usuarios.role,
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
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao processar login',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};


