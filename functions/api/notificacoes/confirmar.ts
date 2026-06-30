// POST /api/notificacoes/confirmar
// Técnico/conferencista confirma o recebimento de um lote de demandas.
// Registra confirmação na tabela notificacoes_atribuicao e no log_atribuicoes.

function decodeToken(auth: string): any {
  try { return JSON.parse(atob(auth.replace('Bearer ', ''))); } catch { return null; }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL as string;
  const KEY = env.SUPABASE_SERVICE_ROLE_KEY as string;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS });

  if (!SUPABASE_URL || !KEY)
    return new Response(JSON.stringify({ error: 'Env não configurado' }), { status: 500, headers: CORS });

  const decoded = decodeToken(request.headers.get('Authorization') || '');
  if (!decoded)
    return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: CORS });

  try {
    const body = await request.json() as any;
    const { id, observacao } = body;

    if (!id || typeof id !== 'number')
      return new Response(JSON.stringify({ error: 'ID da notificação inválido' }), { status: 400, headers: CORS });

    // Buscar a notificação para validar que pertence ao usuário (ou admin confirmando por outro)
    const getResp = await fetch(
      `${SUPABASE_URL}/rest/v1/notificacoes_atribuicao?id=eq.${id}&select=*`,
      { headers: { 'Authorization': `Bearer ${KEY}`, 'apikey': KEY } }
    );
    if (!getResp.ok)
      return new Response(JSON.stringify({ error: 'Erro ao buscar notificação' }), { status: 500, headers: CORS });

    const notifs = await getResp.json() as any[];
    if (!notifs || notifs.length === 0)
      return new Response(JSON.stringify({ error: 'Notificação não encontrada' }), { status: 404, headers: CORS });

    const notif = notifs[0];

    // Apenas o próprio usuário ou admin pode confirmar
    if (decoded.role !== 'admin' && notif.usuario_id !== decoded.id)
      return new Response(JSON.stringify({ error: 'Acesso negado: esta notificação não é sua.' }), { status: 403, headers: CORS });

    if (notif.confirmado)
      return new Response(JSON.stringify({ error: 'Esta notificação já foi confirmada.', ja_confirmado: true }), { status: 409, headers: CORS });

    const agora = new Date().toISOString();

    // Atualizar notificação como confirmada
    const patchResp = await fetch(
      `${SUPABASE_URL}/rest/v1/notificacoes_atribuicao?id=eq.${id}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${KEY}`,
          'apikey': KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          confirmado: true,
          confirmado_em: agora,
          lida: true,
          observacao: observacao || null,
        }),
      }
    );

    if (!patchResp.ok) {
      const err = await patchResp.text();
      return new Response(JSON.stringify({ error: 'Erro ao confirmar notificação', detail: err.substring(0, 200) }), { status: 500, headers: CORS });
    }

    const updated = await patchResp.json() as any[];
    const notifAtualizada = updated[0] || notif;

    // ── Log de auditoria ──────────────────────────────────────────────────────
    try {
      const auditRows = (notif.formalizacao_ids || []).map((fid: number) => ({
        formalizacao_id: fid,
        demanda: null,
        tecnico_novo: notif.usuario_nome,
        data_liberacao: null,
        admin_nome: decoded.nome || decoded.email || 'desconhecido',
        admin_role: decoded.role || 'usuario',
        acao: 'confirmar_recebimento',
        valor_novo: observacao || 'Recebimento confirmado sem observação',
        campo_alterado: 'confirmacao_recebimento',
      }));

      await fetch(`${SUPABASE_URL}/rest/v1/log_atribuicoes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${KEY}`,
          'apikey': KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(auditRows),
      });
    } catch (_) { /* auditoria não deve quebrar a operação */ }

    return new Response(JSON.stringify({
      success: true,
      message: 'Recebimento confirmado com sucesso',
      notificacao: notifAtualizada,
    }), { status: 200, headers: CORS });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
};
