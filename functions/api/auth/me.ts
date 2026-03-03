import { createClient } from '@supabase/supabase-js';

// Verify token helper
function verifyToken(token: string): any {
  try {
    let payload: string;
    if (typeof Buffer !== 'undefined') {
      payload = Buffer.from(token, 'base64').toString('utf-8');
    } else {
      payload = atob(token);
    }
    
    const decoded = JSON.parse(payload);
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return null; // Token expirado
    }
    return decoded;
  } catch {
    return null;
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
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization',
      },
    });
  }

  // Only GET allowed
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Token não fornecido' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.slice(7); // Remove 'Bearer '

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = context.env.SUPABASE_URL;
    const supabaseKey = context.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user from database
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, email, nome, role, ativo')
      .eq('id', decoded.id)
      .single();

    if (error || !usuario) {
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!usuario.ativo) {
      return new Response(
        JSON.stringify({ error: 'Usuário inativo' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        user: {
          id: usuario.id,
          email: usuario.email,
          nome: usuario.nome,
          role: usuario.role,
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
    console.error('Auth check error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao validar sessão' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
