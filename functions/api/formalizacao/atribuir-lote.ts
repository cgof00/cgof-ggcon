export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;

  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Variáveis de ambiente não configuradas' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  function decodeToken(auth: string): any {
    try { return JSON.parse(atob(auth.replace('Bearer ', ''))); } catch { return null; }
  }
  const decoded = decodeToken(request.headers.get('Authorization') || '');
  const adminNome = decoded?.nome || decoded?.email || 'desconhecido';
  const adminRole = decoded?.role || 'unknown';

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json() as any;
    const { ids, lote, prioridade } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return new Response(JSON.stringify({ error: 'IDs não são válidos' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const validIds = ids.filter((id: any) => {
      const num = parseInt(id, 10);
      return !isNaN(num) && num > 0;
    });

    if (validIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum ID válido fornecido' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validar valores permitidos
    const LOTES_VALIDOS = ['Lote 1', 'Lote 2', 'Lote 3', null, ''];
    const PRIORIDADES_VALIDAS = ['P0', 'P1', 'P2', null, ''];

    if (lote !== undefined && !LOTES_VALIDOS.includes(lote)) {
      return new Response(JSON.stringify({ error: `Lote inválido: ${lote}` }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }
    if (prioridade !== undefined && !PRIORIDADES_VALIDAS.includes(prioridade)) {
      return new Response(JSON.stringify({ error: `Prioridade inválida: ${prioridade}` }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Construir payload de atualização apenas com campos enviados
    const patchBody: Record<string, string | null> = {};
    if (lote !== undefined) patchBody['lote'] = lote || null;
    if (prioridade !== undefined) patchBody['prioridade'] = prioridade || null;

    if (Object.keys(patchBody).length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum campo para atualizar' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const idsFilter = validIds.map((id: any) => `${id}`).join(',');

    // Buscar estado atual para auditoria
    const beforeResp = await fetch(
      `${SUPABASE_URL}/rest/v1/formalizacao?select=id,demanda,lote,prioridade&id=in.(${idsFilter})`,
      {
        headers: {
          'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
        }
      }
    );
    const beforeArr: any[] = beforeResp.ok ? await beforeResp.json() : [];
    const beforeMap = new Map(beforeArr.map((r: any) => [r.id, r]));

    // Atualizar registros
    const updateResp = await fetch(
      `${SUPABASE_URL}/rest/v1/formalizacao?id=in.(${idsFilter})`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(patchBody)
      }
    );

    if (!updateResp.ok) {
      const err = await updateResp.text();
      return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const updatedData = await updateResp.json() as any[];

    // Auditoria
    try {
      const auditRows: any[] = [];
      for (const id of validIds) {
        const before: any = beforeMap.get(parseInt(id)) || {};
        const demanda = before?.demanda || null;
        for (const campo of Object.keys(patchBody) as ('lote' | 'prioridade')[]) {
          const anterior = before[campo] ?? null;
          const novo = patchBody[campo] ?? null;
          if (String(anterior) === String(novo)) continue;
          auditRows.push({
            formalizacao_id: parseInt(id),
            demanda,
            admin_nome: adminNome,
            admin_role: adminRole,
            acao: 'alterar_campo',
            campo_alterado: campo,
            valor_anterior: anterior,
            valor_novo: novo,
          });
        }
      }
      if (auditRows.length > 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/log_atribuicoes`, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(auditRows),
        });
      }
    } catch (_) { /* auditoria não deve quebrar a operação */ }

    return new Response(JSON.stringify({
      message: 'Lote/Prioridade definidos com sucesso',
      updated: updatedData?.length || 0,
      updatedRecords: updatedData || [],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};
