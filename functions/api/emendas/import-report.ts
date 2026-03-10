// Cloudflare Workers: POST /api/emendas/import-report
// Importar relatório de emendas - recebe CSV mapeado, insere direto
// ⚠️ SIMPLIFICADO: Máximo 1-2 subrequests por invocação (limite Cloudflare = 50)
// Dedup e sync são feitos no frontend ou via SQL separadamente

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
    return new Response(JSON.stringify({ error: 'Variáveis de ambiente não configuradas' }), {
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
    return new Response(JSON.stringify({ error: 'Token não fornecido' }), {
      status: 401, headers: corsHeaders()
    });
  }
  const token = authHeader.replace('Bearer ', '').trim();
  const decoded = verifyToken(token);
  if (!decoded) {
    let debugInfo = 'Token inválido';
    try {
      const raw = atob(token.trim());
      const parsed = JSON.parse(raw);
      const now = Math.floor(Date.now() / 1000);
      if (parsed.exp && parsed.exp < now) {
        debugInfo = `Token expirado há ${now - parsed.exp}s`;
      }
    } catch {}
    return new Response(JSON.stringify({ error: 'Token inválido ou expirado', details: debugInfo }), {
      status: 401, headers: corsHeaders()
    });
  }
  if (decoded.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Apenas administradores podem importar' }), {
      status: 403, headers: corsHeaders()
    });
  }

  try {
    const items = await request.json();
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Dados inválidos ou vazios' }), {
        status: 400, headers: corsHeaders()
      });
    }

    console.log(`📥 Import: ${items.length} registros recebidos`);

    // UM ÚNICO INSERT - 1 subrequest apenas
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/emendas?on_conflict=codigo_num`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal,resolution=ignore-duplicates'
        },
        body: JSON.stringify(items)
      }
    );

    if (!resp.ok) {
      const err = await resp.text();
      console.error(`❌ Insert falhou: ${err.substring(0, 300)}`);
      return new Response(JSON.stringify({
        error: 'Erro ao inserir emendas',
        details: err.substring(0, 500)
      }), { status: 500, headers: corsHeaders() });
    }

    console.log(`✅ ${items.length} registros inseridos com sucesso`);

    return new Response(JSON.stringify({
      emendas_inserted: items.length,
      skipped: 0,
      message: `${items.length} emendas inseridas com sucesso`
    }), { status: 200, headers: corsHeaders() });

  } catch (error: any) {
    console.error('❌ Erro:', error);
    return new Response(JSON.stringify({ error: 'Erro ao importar', details: error.message }), {
      status: 500, headers: corsHeaders()
    });
  }
};
