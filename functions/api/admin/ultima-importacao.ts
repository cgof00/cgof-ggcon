// GET  /api/admin/ultima-importacao — retorna quando (e quem) fez a última importação de emendas (qualquer usuário autenticado)
// POST /api/admin/ultima-importacao — registra a importação recém-concluída (somente admin)

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

const SETTINGS_KEY = 'ultima_importacao_emendas';

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL as string;
  const KEY = env.SUPABASE_SERVICE_ROLE_KEY as string;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  if (!SUPABASE_URL || !KEY)
    return new Response(JSON.stringify({ error: 'Env não configurado' }), { status: 500, headers: CORS });

  const auth = request.headers.get('Authorization') || '';
  const decoded = verifyToken(auth.replace('Bearer ', ''));
  if (!decoded)
    return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: CORS });

  // GET: qualquer usuário autenticado pode ver quando foi a última importação
  if (request.method === 'GET') {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/system_settings?key=eq.${SETTINGS_KEY}&select=value,updated_at`,
      { headers: { 'Authorization': `Bearer ${KEY}`, 'apikey': KEY } }
    );
    const rows = await resp.json() as any[];
    const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    let usuario: string | null = null;
    try { usuario = row ? (JSON.parse(row.value)?.usuario ?? null) : null; } catch { /* ignore */ }
    return new Response(JSON.stringify({ em: row?.updated_at ?? null, usuario }), {
      status: 200, headers: CORS
    });
  }

  // POST: somente admin registra a importação recém-concluída
  if (request.method === 'POST') {
    if (decoded.role !== 'admin')
      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403, headers: CORS });

    const usuario: string = decoded.nome || decoded.email || 'admin';
    const now = new Date().toISOString();
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
        body: JSON.stringify({ key: SETTINGS_KEY, value: JSON.stringify({ usuario }), updated_at: now }),
      }
    );

    if (!upsertResp.ok) {
      const err = await upsertResp.text();
      return new Response(JSON.stringify({ error: 'Falha ao registrar importação', detail: err }), { status: 500, headers: CORS });
    }

    return new Response(JSON.stringify({ success: true, em: now, usuario }), { status: 200, headers: CORS });
  }

  return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405, headers: CORS });
};
