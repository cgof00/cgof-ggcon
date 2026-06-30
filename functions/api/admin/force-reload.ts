// GET  /api/admin/force-reload  — retorna o timestamp da última solicitação de reload (público)
// POST /api/admin/force-reload  — admin registra novo reload; todos os clientes recarregarão (somente admin)

function verifyToken(token: string): any {
  try {
    const payload = atob(token);
    const decoded = JSON.parse(payload);
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch { return null; }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL as string;
  const KEY = env.SUPABASE_SERVICE_ROLE_KEY as string;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  if (!SUPABASE_URL || !KEY)
    return new Response(JSON.stringify({ error: 'Env não configurado' }), { status: 500, headers: CORS });

  // GET: qualquer cliente autenticado pode verificar se deve recarregar
  if (request.method === 'GET') {
    const auth = request.headers.get('Authorization') || '';
    const decoded = verifyToken(auth.replace('Bearer ', ''));
    if (!decoded)
      return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: CORS });

    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/system_settings?key=eq.force_reload_at&select=value,updated_at`,
      { headers: { 'Authorization': `Bearer ${KEY}`, 'apikey': KEY } }
    );
    const rows = await resp.json() as any[];
    const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    const forceReloadAt = row ? Number(row.value) : 0;
    const updatedAt = row ? row.updated_at : null;
    return new Response(JSON.stringify({ force_reload_at: forceReloadAt, updated_at: updatedAt }), {
      status: 200, headers: CORS
    });
  }

  // POST: somente admin
  if (request.method === 'POST') {
    const auth = request.headers.get('Authorization') || '';
    const decoded = verifyToken(auth.replace('Bearer ', ''));
    if (!decoded)
      return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: CORS });
    if (decoded.role !== 'admin')
      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403, headers: CORS });

    const now = Date.now();
    const upsertResp = await fetch(
      `${SUPABASE_URL}/rest/v1/system_settings`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${KEY}`,
          'apikey': KEY,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify({ key: 'force_reload_at', value: String(now), updated_at: new Date(now).toISOString() }),
      }
    );

    if (!upsertResp.ok) {
      const err = await upsertResp.text();
      return new Response(JSON.stringify({ error: 'Falha ao atualizar', detail: err }), { status: 500, headers: CORS });
    }

    return new Response(JSON.stringify({
      success: true,
      force_reload_at: now,
      message: 'Todos os usuários conectados serão notificados para recarregar os dados'
    }), { status: 200, headers: CORS });
  }

  return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405, headers: CORS });
};
