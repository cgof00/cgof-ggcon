// GET /api/notificacoes
// Admin:      retorna TODAS as notificações (pendentes + confirmadas, ordenadas por data)
// Outros:     retorna apenas as notificações do próprio usuário (pelo usuario_id no token)

function decodeToken(auth: string): any {
  try { return JSON.parse(atob(auth.replace('Bearer ', ''))); } catch { return null; }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL as string;
  const KEY = env.SUPABASE_SERVICE_ROLE_KEY as string;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'GET') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS });

  if (!SUPABASE_URL || !KEY)
    return new Response(JSON.stringify({ error: 'Env não configurado' }), { status: 500, headers: CORS });

  const decoded = decodeToken(request.headers.get('Authorization') || '');
  if (!decoded)
    return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: CORS });

  // Tokens antigos podem não ter o campo 'id'; tentar buscar pelo e-mail
  let userId: number | null = decoded.id ?? null;
  if (!userId && decoded.email && decoded.role !== 'admin') {
    try {
      const userResp = await fetch(
        `${SUPABASE_URL}/rest/v1/usuarios?select=id&email=eq.${encodeURIComponent(decoded.email)}&limit=1`,
        { headers: { 'Authorization': `Bearer ${KEY}`, 'apikey': KEY } }
      );
      if (userResp.ok) {
        const users = await userResp.json() as any[];
        if (users && users.length > 0) userId = users[0].id;
      }
    } catch { /* silencioso */ }
  }

  if (!userId && decoded.role !== 'admin')
    return new Response(JSON.stringify({ error: 'Não foi possível identificar o usuário' }), { status: 400, headers: CORS });

  const url = new URL(request.url);
  const apenasNaoLidas = url.searchParams.get('nao_lidas') === '1';

  try {
    let supabaseUrl: string;

    if (decoded.role === 'admin') {
      // Admin vê todas
      let query = `${SUPABASE_URL}/rest/v1/notificacoes_atribuicao?select=*&order=data_atribuicao.desc`;
      if (apenasNaoLidas) query += '&confirmado=eq.false';
      supabaseUrl = query;
    } else {
      // Técnico/conferencista vê apenas as suas
      let query = `${SUPABASE_URL}/rest/v1/notificacoes_atribuicao?select=*&usuario_id=eq.${userId}&order=data_atribuicao.desc`;
      if (apenasNaoLidas) query += '&confirmado=eq.false';
      supabaseUrl = query;

      // Marcar como lida automaticamente quando o usuário consulta
      if (!apenasNaoLidas) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/notificacoes_atribuicao?usuario_id=eq.${userId}&lida=eq.false`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${KEY}`,
              'apikey': KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ lida: true }),
          }
        ).catch(() => {});
      }
    }

    const resp = await fetch(supabaseUrl, {
      headers: {
        'Authorization': `Bearer ${KEY}`,
        'apikey': KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!resp.ok) {
      const err = await resp.text();
      return new Response(JSON.stringify({ error: 'Erro ao buscar notificações', detail: err.substring(0, 200) }), { status: 500, headers: CORS });
    }

    const data = await resp.json() as any[];

    // Para admin, calcular contagens resumo
    const pendentes = data.filter((n: any) => !n.confirmado).length;
    const confirmadas = data.filter((n: any) => n.confirmado).length;

    return new Response(JSON.stringify({
      items: data,
      total: data.length,
      pendentes,
      confirmadas,
    }), { status: 200, headers: CORS });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
};
