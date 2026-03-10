// Cloudflare Workers: POST /api/emendas/sync-formalizacao
// Sincroniza dados das emendas com a tabela de formalizacao
// Usa RPC (funcao SQL no Supabase) para ficar dentro do limite de 50 subrequests

function verifyToken(token: string): any {
  try {
    const cleanToken = token.trim();
    if (!cleanToken) return null;
    const payload = atob(cleanToken);
    const decoded = JSON.parse(payload);
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now - 300) return null;
    return decoded;
  } catch (e) {
    console.error('Token decode error:', e);
    return null;
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };
}

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;

  const SUPABASE_URL = env.SUPABASE_URL as string;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY as string;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Variaveis de ambiente nao configuradas' }), {
      status: 500, headers: corsHeaders()
    });
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: corsHeaders()
    });
  }

  // Auth
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Token nao fornecido' }), {
      status: 401, headers: corsHeaders()
    });
  }
  const decoded = verifyToken(authHeader.replace('Bearer ', ''));
  if (!decoded) {
    return new Response(JSON.stringify({ error: 'Token invalido ou expirado' }), {
      status: 401, headers: corsHeaders()
    });
  }
  if (decoded.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Apenas administradores' }), {
      status: 403, headers: corsHeaders()
    });
  }

  try {
    console.log('Sincronizando emendas -> formalizacao via RPC...');

    // Chamar a funcao RPC no Supabase (1 subrequest apenas)
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/sync_emendas_formalizacao`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      }
    );

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('RPC falhou: ' + resp.status + ' - ' + errText.substring(0, 500));

      // Se a funcao nao existe, dar instrucoes claras
      if (resp.status === 404 || errText.includes('function') || errText.includes('not found') || errText.includes('does not exist')) {
        return new Response(JSON.stringify({
          error: 'Funcao sync_emendas_formalizacao nao encontrada no Supabase',
          details: 'Execute o script CRIAR_FUNCAO_SYNC.sql no Supabase SQL Editor primeiro.',
          supabase_error: errText.substring(0, 300)
        }), { status: 404, headers: corsHeaders() });
      }

      return new Response(JSON.stringify({
        error: 'Erro na sincronizacao RPC',
        details: errText.substring(0, 500),
        status: resp.status
      }), { status: 500, headers: corsHeaders() });
    }

    const result = await resp.json();
    console.log('Sincronizacao concluida:', result);

    return new Response(JSON.stringify({
      updated: result?.updated || 0,
      inserted: result?.inserted || 0,
      message: `${result?.updated || 0} formalizacoes atualizadas, ${result?.inserted || 0} novas inseridas`
    }), { status: 200, headers: corsHeaders() });

  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(JSON.stringify({ error: 'Erro ao sincronizar', details: error.message }), {
      status: 500, headers: corsHeaders()
    });
  }
};
