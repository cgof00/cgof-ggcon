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

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error('❌ JSON parse error:', e);
      return new Response(
        JSON.stringify({ error: 'Request body deve estar em JSON válido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { email, senha } = body;

    if (!email || !senha) {
      return new Response(
        JSON.stringify({ error: 'Email e senha são obrigatórios' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get environment variables
    const supabaseUrl = context.env.SUPABASE_URL;
    const supabaseKey = context.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('🔐 Login attempt:', {
      email,
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlLength: supabaseUrl?.length || 0,
      keyLength: supabaseKey?.length || 0,
    });

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing config');
      return new Response(
        JSON.stringify({
          error: 'Servidor não está configurado corretamente',
          missing: {
            url: !supabaseUrl,
            key: !supabaseKey,
          }
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Query Supabase REST API directly (more reliable than SDK)
    console.log('🔍 Querying usuarios table for:', email);
    const queryUrl = `${supabaseUrl}/rest/v1/usuarios?email=eq.${encodeURIComponent(email.toLowerCase())}&select=*`;
    
    const response = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Supabase API error:', response.status, errorText);
      return new Response(
        JSON.stringify({
          error: 'Erro ao buscar usuário',
          details: `HTTP ${response.status}`
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const usuarios = await response.json();
    
    if (!Array.isArray(usuarios) || usuarios.length === 0) {
      console.warn('⚠️ User not found:', email);
      return new Response(
        JSON.stringify({ error: 'Email ou senha incorretos' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user = usuarios[0];

    // Verify password
    const isValid = hashPassword(senha) === user.senha;
    if (!isValid) {
      console.warn('⚠️ Invalid password for:', email);
      return new Response(
        JSON.stringify({ error: 'Email ou senha incorretos' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate token
    const token = generateToken(user.id, user.email, user.role);

    // Update last login (don't wait)
    fetch(`${supabaseUrl}/rest/v1/usuarios?id=eq.${user.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
      },
      body: JSON.stringify({ ultima_sessao: new Date().toISOString() }),
    }).catch(err => console.error('⚠️ Last login update failed:', err));

    console.log('✅ Login successful for:', email);

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
    console.error('❌ Unexpected error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    return new Response(
      JSON.stringify({
        error: 'Erro inesperado ao processar login',
        message: errorMsg,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};


