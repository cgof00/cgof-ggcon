// Hash password helper
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

// Generate token
function generateToken(id: number, email: string, role: string): string {
  const payload = {
    id,
    email,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
  };
  
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(JSON.stringify(payload)).toString('base64');
    } else {
      return btoa(JSON.stringify(payload));
    }
  } catch (e) {
    console.error('Token generation error:', e);
    throw new Error('Failed to generate token');
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
    console.log('=== LOGIN HANDLER START ===');

    // Parse body
    let body;
    try {
      body = await request.json();
      console.log('✅ Body parsed:', { email: body.email ? 'provided' : 'missing', senha: body.senha ? 'provided' : 'missing' });
    } catch (e) {
      console.error('❌ JSON parse error:', e);
      return sendError(400, 'JSON inválido');
    }

    const { email, senha } = body;

    if (!email || !senha) {
      console.error('❌ Missing email or password');
      return sendError(400, 'Email e senha são obrigatórios');
    }

    // Get env vars
    const supabaseUrl = context.env.SUPABASE_URL;
    const supabaseKey = context.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('📋 Environment:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlFirst20: supabaseUrl?.substring(0, 20),
      keyFirst10: supabaseKey?.substring(0, 10),
    });

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase config');
      return sendError(500, 'Configuração incompleta');
    }

    // Build query URL
    const emailEncoded = encodeURIComponent(email.toLowerCase());
    const queryUrl = `${supabaseUrl}/rest/v1/usuarios?email=eq.${emailEncoded}&select=*`;
    
    console.log('🔍 Querying:', queryUrl.substring(0, 100) + '...');

    // Query Supabase
    let response;
    try {
      response = await fetch(queryUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
        },
      });
      console.log('✅ Fetch completed, status:', response.status);
    } catch (e) {
      console.error('❌ Fetch error:', e);
      return sendError(500, `Fetch failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API error:', response.status, errorText);
      return sendError(500, `API Error ${response.status}`);
    }

    let usuarios;
    try {
      usuarios = await response.json();
      console.log('✅ Response parsed, users found:', Array.isArray(usuarios) ? usuarios.length : 0);
    } catch (e) {
      console.error('❌ JSON parse response error:', e);
      return sendError(500, 'Invalid response from API');
    }

    if (!Array.isArray(usuarios) || usuarios.length === 0) {
      console.warn('⚠️ No user found for email:', email);
      return sendError(401, 'Email ou senha incorretos');
    }

    const user = usuarios[0];
    console.log('✅ User found:', { id: user.id, email: user.email });

    // Check password
    const hashedInput = hashPassword(senha);
    const isValid = hashedInput === user.senha;
    
    console.log('🔐 Password check:', {
      inputHash: hashedInput.substring(0, 8),
      storedHash: user.senha.substring(0, 8),
      match: isValid,
    });

    if (!isValid) {
      console.warn('⚠️ Invalid password for:', email);
      return sendError(401, 'Email ou senha incorretos');
    }

    // Generate token
    let token;
    try {
      token = generateToken(user.id, user.email, user.role);
      console.log('✅ Token generated');
    } catch (e) {
      console.error('❌ Token generation failed:', e);
      return sendError(500, 'Failed to generate token');
    }

    // Update last login (non-blocking)
    const updateUrl = `${supabaseUrl}/rest/v1/usuarios?id=eq.${user.id}`;
    fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ultima_sessao: new Date().toISOString() }),
    }).catch(err => console.error('⚠️ Last login update failed:', err));

    console.log('✅ Login successful for:', email);
    console.log('=== LOGIN HANDLER END ===');

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
    console.error('❌ UNCAUGHT ERROR:', error);
    return sendError(500, `Unexpected: ${error instanceof Error ? error.message : String(error)}`);
  }
};

function sendError(status: number, message: string) {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}


