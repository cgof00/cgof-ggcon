export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;

  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Variáveis de ambiente não configuradas' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

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

  // ── PROTEÇÃO: somente admin pode atribuir conferencista ──────────────────
  function decodeCallerToken(auth: string): any {
    try { return JSON.parse(atob(auth.replace('Bearer ', ''))); } catch { return null; }
  }
  const callerDecoded = decodeCallerToken(request.headers.get('Authorization') || '');
  if (callerDecoded?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Acesso negado: somente administradores podem atribuir o conferencista.' }), {
      status: 403, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json() as any;
    const { ids, usuario_id, data_recebimento_demanda } = body;

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

    if (!usuario_id) {
      return new Response(JSON.stringify({ error: 'ID do usuário inválido' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!data_recebimento_demanda || !/^\d{4}-\d{2}-\d{2}$/.test(data_recebimento_demanda)) {
      return new Response(JSON.stringify({ error: 'Data em formato inválido (use YYYY-MM-DD)' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Buscar dados do conferencista
    const userResp = await fetch(
      `${SUPABASE_URL}/rest/v1/usuarios?select=id,nome,email&id=eq.${usuario_id}`,
      {
        headers: {
          'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!userResp.ok) {
      return new Response(JSON.stringify({ error: 'Erro ao buscar conferencista' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const usuarios = await userResp.json() as any[];
    if (!usuarios || usuarios.length === 0) {
      return new Response(JSON.stringify({ error: 'Conferencista não encontrado' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const conferencista = usuarios[0];

    // ── Expandir para o grupo agregado (todos com o mesmo nº de demanda) ──────
    let expandedIds: number[] = [...validIds.map(Number)];
    try {
      const selFilter = validIds.join(',');
      const demandaResp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?select=id,demanda&id=in.(${selFilter})`,
        {
          headers: {
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
          }
        }
      );
      if (demandaResp.ok) {
        const selRecords = await demandaResp.json() as any[];
        const demandas = [...new Set(
          selRecords.map((r: any) => r.demanda).filter((d: any) => d && String(d).trim())
        )];
        if (demandas.length > 0) {
          const demandaFilter = demandas.map((d: any) => encodeURIComponent(String(d))).join(',');
          const siblingsResp = await fetch(
            `${SUPABASE_URL}/rest/v1/formalizacao?select=id&demanda=in.(${demandaFilter})`,
            {
              headers: {
                'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
              }
            }
          );
          if (siblingsResp.ok) {
            const siblings = await siblingsResp.json() as any[];
            const siblingIds = siblings.map((s: any) => Number(s.id));
            expandedIds = [...new Set([...validIds.map(Number), ...siblingIds])];
            if (expandedIds.length > validIds.length) {
              console.log(`✅ Grupo agregado: ${validIds.length} selecionado(s) → ${expandedIds.length} total (demandas: ${demandas.join(', ')})`);
            }
          }
        }
      }
    } catch (expandErr) {
      console.warn('⚠️ Não foi possível expandir para o grupo agregado, usando IDs originais:', expandErr);
    }
    // ────────────────────────────────────────────────────────────────────────────

    // Atualizar formalizações
    const idsFilter = expandedIds.join(',');
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
        body: JSON.stringify({
          conferencista: conferencista.nome,
          data_recebimento_demanda: data_recebimento_demanda,
          updated_at: new Date().toISOString()
        })
      }
    );

    if (!updateResp.ok) {
      const err = await updateResp.text();
      return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const updatedData = await updateResp.json() as any[];

    // ── Substituir "sistema" pelo nome real do admin no histórico ─────────────
    try {
      function decodeForHist(auth: string): any {
        try { return JSON.parse(atob(auth.replace('Bearer ', ''))); } catch { return null; }
      }
      const histDecoded = decodeForHist(request.headers.get('Authorization') || '');
      const histUserName: string = histDecoded?.nome || histDecoded?.email || '';

      if (histUserName) {
        const spNow = new Date(Date.now() - 3 * 60 * 60 * 1000);
        const currentSpMinute = [
          String(spNow.getUTCDate()).padStart(2, '0'),
          String(spNow.getUTCMonth() + 1).padStart(2, '0'),
          String(spNow.getUTCFullYear()),
        ].join('/') + ' ' + [
          String(spNow.getUTCHours()).padStart(2, '0'),
          String(spNow.getUTCMinutes()).padStart(2, '0'),
        ].join(':');

        const patchPromises = (updatedData || [])
          .filter((rec: any) => Array.isArray(rec.historico_situacao))
          .filter((rec: any) => rec.historico_situacao.some(
            (e: any) => e.usuario === 'sistema' && e.em === currentSpMinute
          ))
          .map((rec: any) => {
            const patchedHistorico = (rec.historico_situacao as any[]).map((e: any) =>
              e.usuario === 'sistema' && e.em === currentSpMinute
                ? { ...e, usuario: histUserName }
                : e
            );
            return fetch(`${SUPABASE_URL}/rest/v1/formalizacao?id=eq.${rec.id}`, {
              method: 'PATCH',
              headers: {
                'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
              },
              body: JSON.stringify({ historico_situacao: patchedHistorico }),
            });
          });

        await Promise.all(patchPromises);
      }
    } catch (_) { /* não deve quebrar a operação principal */ }
    // ──────────────────────────────────────────────────────────────────────────

    // ── Auditoria ──────────────────────────────────────────────────────────────
    try {
      function decodeToken(auth: string): any {
        try { return JSON.parse(atob(auth.replace('Bearer ', ''))); } catch { return null; }
      }
      const decoded = decodeToken(request.headers.get('Authorization') || '');
      const adminNome = decoded?.nome || decoded?.email || 'desconhecido';
      const adminRole = decoded?.role || 'unknown';
      const updatedMap = new Map((updatedData || []).map((r: any) => [r.id, r]));
      const auditRows = expandedIds.map((id: any) => {
        const rec = updatedMap.get(parseInt(id));
        return {
          formalizacao_id: parseInt(id),
          demanda: rec?.demanda || null,
          tecnico_novo: conferencista.nome,
          data_liberacao: data_recebimento_demanda,
          admin_nome: adminNome,
          admin_role: adminRole,
          acao: 'atribuir_conferencista',
          valor_novo: conferencista.nome,
        };
      });
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
    } catch (_) { /* auditoria não deve quebrar a operação */ }
    // ──────────────────────────────────────────────────────────────────────────

    // ── Criar notificação de recebimento para o conferencista ─────────────────
    let notifCriada = false;
    let notifErro: string | null = null;
    try {
      const demandaCodes = (updatedData || []).map((r: any) =>
        r.demandas_formalizacao || r.demanda || String(r.id)
      );
      // ── Deduplicate demandas (para agregadas, contar como 1) ────────────────
      const demandasUniques = Array.from(new Set(demandaCodes.map(String)));
      const notifResp = await fetch(`${SUPABASE_URL}/rest/v1/notificacoes_atribuicao`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          tipo: 'conferencista',
          usuario_id: Number(usuario_id),
          usuario_nome: conferencista.nome,
          admin_nome: callerDecoded?.nome || callerDecoded?.email || 'desconhecido',
          formalizacao_ids: expandedIds,
          demandas: demandasUniques,
          total_demandas: demandasUniques.length,
        }),
      });
      if (notifResp.ok) {
        notifCriada = true;
        console.log(`✅ Notificação criada para conferencista ${conferencista.nome} (id=${usuario_id}, ${expandedIds.length} demandas)`);
      } else {
        const notifErrText = await notifResp.text();
        notifErro = `HTTP ${notifResp.status}: ${notifErrText.substring(0, 300)}`;
        console.error(`❌ Falha ao criar notificação: ${notifErro}`);
      }
    } catch (notifErr: any) {
      notifErro = String(notifErr?.message || notifErr);
      console.error('❌ Exceção ao criar notificação:', notifErro);
    }

    // ── Sinalizar force-reload para todos os clientes ─────────────────
    // (O cliente recarrega com nocache=1, que já atualiza o cache Cloudflare automaticamente)────────
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/system_settings`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify({ key: 'force_reload_at', value: String(Date.now()), updated_at: new Date().toISOString() }),
      });
    } catch (_) { /* não bloquear se falhar */ }

    return new Response(JSON.stringify({
      message: 'Conferencista atribuído com sucesso',
      updated: updatedData?.length || expandedIds.length,
      conferencista: conferencista.nome,
      updatedRecords: updatedData || [],
      success: true,
      notificacao: {
        criada: notifCriada,
        erro: notifErro,
      },
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    console.error('❌ ERRO:', e);
    return new Response(JSON.stringify({ error: e.message, success: false }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};
