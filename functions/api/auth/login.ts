import { createClient } from '@supabase/supabase-js';
import { hashPassword, generateToken, verifyPassword } from '../../../src/auth';

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

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query usuarios table
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !usuarios) {
      return new Response(
        JSON.stringify({ error: 'Email ou senha incorretos' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify password
    const isValid = verifyPassword(senha, usuarios.senha);

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Email ou senha incorretos' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate token
    const token = generateToken(
      usuarios.id,
      usuarios.email,
      usuarios.role
    );

    // Update last login
    await supabase
      .from('usuarios')
      .update({ ultima_sessao: new Date().toISOString() })
      .eq('id', usuarios.id);

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
      JSON.stringify({ error: 'Erro ao processar login' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};


