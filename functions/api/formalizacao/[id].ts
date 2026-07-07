export const onRequest: PagesFunction = async (context) => {
  const { request, env, params } = context;
  const id = params.id as string;

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
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId) || parsedId <= 0) {
    return new Response(JSON.stringify({ error: 'ID inválido' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  // PUT /api/formalizacao/:id — Update a record
  if (request.method === 'PUT') {
    try {
      const body = await request.json() as Record<string, unknown>;

      // Remove fields that shouldn't be updated
      delete body['id'];
      delete body['created_at'];

      // Decodifica token para verificar role do caller
      function decodeCallerToken(auth: string): any {
        try { return JSON.parse(atob(auth.replace('Bearer ', ''))); } catch { return null; }
      }
      const callerDecoded = decodeCallerToken(request.headers.get('Authorization') || '');
      const callerRole = callerDecoded?.role || '';

      // ── PROTEÇÃO CRÍTICA: somente admin pode alterar técnico e conferencista ─
      // Qualquer outro role que enviar esses campos no payload tem os campos ignorados.
      // Isso evita que usuários modifiquem acidentalmente as atribuições ao salvar.
      if (callerRole !== 'admin') {
        delete body['tecnico'];
        delete body['data_liberacao'];
        delete body['usuario_atribuido_id'];
        delete body['conferencista'];
        delete body['data_liberacao_assinatura_conferencista'];
      }

      // Allow empty strings to clear fields
      const cleanBody: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(body)) {
        if (value === '' || value === null || value === undefined) {
          cleanBody[key] = null;
        } else {
          cleanBody[key] = value;
        }
      }

      // Buscar estado atual antes de alterar (para auditoria)
      const beforeResp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?select=*&id=eq.${parsedId}`,
        {
          headers: {
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
          }
        }
      );
      const beforeArr: any[] = beforeResp.ok ? await beforeResp.json() : [];
      const before: any = beforeArr[0] || {};

      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?id=eq.${parsedId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(cleanBody)
        }
      );

      if (!resp.ok) {
        const err = await resp.text();
        console.error(`❌ Supabase PATCH error: ${resp.status} - ${err.substring(0, 300)}`);
        return new Response(JSON.stringify({ error: 'Erro ao atualizar registro', details: err.substring(0, 200) }), {
          status: resp.status, headers: { 'Content-Type': 'application/json' }
        });
      }

      const updated = await resp.json();
      console.log(`✅ Registro ${parsedId} atualizado`);

      // ── Substituir "sistema" pelo nome real do usuário no histórico ──────────
      try {
        function decodeCallerForHist(auth: string): any {
          try { return JSON.parse(atob(auth.replace('Bearer ', ''))); } catch { return null; }
        }
        const callerInfo = decodeCallerForHist(request.headers.get('Authorization') || '');
        const userName: string = callerInfo?.nome || callerInfo?.email || 'sistema';

        if (userName !== 'sistema') {
          const updatedRec: any = Array.isArray(updated) ? updated[0] : updated;
          const historico: any[] = Array.isArray(updatedRec?.historico_situacao) ? updatedRec.historico_situacao : [];
          const oldCount: number = Array.isArray(before?.historico_situacao) ? before.historico_situacao.length : 0;

          if (historico.length > oldCount) {
            const patchedHistorico = historico.map((entry: any, idx: number) =>
              idx >= oldCount && entry.usuario === 'sistema'
                ? { ...entry, usuario: userName }
                : entry
            );

            const patchResp = await fetch(
              `${SUPABASE_URL}/rest/v1/formalizacao?id=eq.${parsedId}`,
              {
                method: 'PATCH',
                headers: {
                  'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
                  'apikey': SUPABASE_SERVICE_ROLE_KEY,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=minimal',
                },
                body: JSON.stringify({ historico_situacao: patchedHistorico }),
              }
            );

            if (patchResp.ok) {
              // Retorna com histórico corrigido
              if (Array.isArray(updated) && updated[0]) {
                updated[0] = { ...updated[0], historico_situacao: patchedHistorico };
              }
              console.log(`✅ Histórico atualizado com usuário real: ${userName}`);
            }
          }
        }
      } catch (_) { /* não deve quebrar a operação */ }
      // ──────────────────────────────────────────────────────────────────────────

      // ── Propagar campos de análise ao grupo agregado (mesmo nº de demanda) ──
      const ANALISE_FIELDS = [
        'situacao_analise_demanda', 'data_analise_demanda', 'area_estagio_situacao_demanda',
        'area_estagio', 'motivo_retorno_diligencia', 'data_retorno_diligencia',
        'data_retorno', 'observacao_motivo_retorno',
      ];
      const propagateData: Record<string, unknown> = {};
      for (const field of ANALISE_FIELDS) {
        if (field in cleanBody) propagateData[field] = cleanBody[field];
      }
      if (Object.keys(propagateData).length > 0 && before?.demanda) {
        try {
          const demandaValue = encodeURIComponent(String(before.demanda));
          const propagateResp = await fetch(
            `${SUPABASE_URL}/rest/v1/formalizacao?demanda=eq.${demandaValue}&id=neq.${parsedId}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
              },
              body: JSON.stringify({ ...propagateData, updated_at: new Date().toISOString() }),
            }
          );
          if (propagateResp.ok) {
            console.log(`✅ Análise propagada para grupo (demanda=${before.demanda})`);
          } else {
            console.warn(`⚠️ Falha ao propagar análise ao grupo: HTTP ${propagateResp.status}`);
          }
        } catch (propErr) {
          console.warn('⚠️ Não foi possível propagar análise ao grupo agregado:', propErr);
        }
      }
      // ──────────────────────────────────────────────────────────────────────────

      // ── Auditoria: loga campo a campo tudo que mudou ─────────────────────────
      try {
        function decodeToken(auth: string): any {
          try { return JSON.parse(atob(auth.replace('Bearer ', ''))); } catch { return null; }
        }
        const decoded = decodeToken(request.headers.get('Authorization') || '');
        const adminNome = decoded?.nome || decoded?.email || 'desconhecido';
        const adminRole = decoded?.role || 'unknown';
        const updatedRec: any = Array.isArray(updated) ? updated[0] : updated;

        // Campos relevantes para rastrear
        const TRACKED_FIELDS = [
          'tecnico', 'conferencista', 'situacao_analise_demanda',
          'data_liberacao', 'data_liberacao_assinatura', 'data_recebimento_demanda',
          'status', 'tipo_formalizacao', 'recurso', 'regional',
          'parlamentar', 'conveniado', 'emenda', 'lote', 'prioridade',
          'falta_assinatura',
        ];

        const auditRows: any[] = [];
        for (const campo of TRACKED_FIELDS) {
          if (!(campo in cleanBody)) continue;
          const anterior = String(before[campo] ?? '');
          const novo = String(cleanBody[campo] ?? '');
          if (anterior === novo) continue;

          // Determinar ação semântica
          let acao = 'alterar_campo';
          if (campo === 'tecnico') acao = cleanBody[campo] ? 'atribuir' : 'remover';
          if (campo === 'conferencista') acao = cleanBody[campo] ? 'atribuir_conferencista' : 'remover_conferencista';
          if (campo === 'situacao_analise_demanda') acao = 'alterar_situacao';
          if (campo === 'data_liberacao_assinatura') acao = 'liberar_assinatura';

          auditRows.push({
            formalizacao_id: parsedId,
            demanda: updatedRec?.demanda || before?.demanda || null,
            tecnico_novo: campo === 'tecnico' ? (cleanBody[campo] as string || null) : null,
            tecnico_anterior: campo === 'tecnico' ? (before?.tecnico || null) : null,
            admin_nome: adminNome,
            admin_role: adminRole,
            acao,
            campo_alterado: campo,
            valor_anterior: anterior || null,
            valor_novo: novo || null,
          });
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
      // ──────────────────────────────────────────────────────────────────────────

      return new Response(JSON.stringify(Array.isArray(updated) ? updated[0] : updated), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    } catch (e: any) {
      console.error('❌ ERRO PUT:', e);
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // DELETE /api/formalizacao/:id
  if (request.method === 'DELETE') {
    try {
      async function hashPassword(password: string): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      }

      const authHeader = request.headers.get('Authorization') || '';
      let decoded: any = null;
      try { decoded = JSON.parse(atob(authHeader.replace('Bearer ', ''))); } catch { /* noop */ }

      if (!decoded) {
        return new Response(JSON.stringify({ error: 'Token não fornecido ou inválido' }), {
          status: 401, headers: { 'Content-Type': 'application/json' }
        });
      }
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return new Response(JSON.stringify({ error: 'Token expirado' }), {
          status: 401, headers: { 'Content-Type': 'application/json' }
        });
      }
      if (decoded.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Acesso negado. Apenas administradores podem deletar formalizações.' }), {
          status: 403, headers: { 'Content-Type': 'application/json' }
        });
      }

      const body = await request.json().catch(() => ({})) as Record<string, unknown>;
      const senha = body?.senha as string | undefined;
      if (!senha) {
        return new Response(JSON.stringify({ error: 'Senha é obrigatória para deletar uma formalização' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        });
      }

      const callerId = decoded.id ?? decoded.userId;
      const adminResp = await fetch(
        `${SUPABASE_URL}/rest/v1/usuarios?id=eq.${callerId}&select=senha_hash`,
        {
          headers: {
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
          }
        }
      );
      const adminRows: any[] = adminResp.ok ? await adminResp.json() : [];
      if (!adminRows[0]) {
        return new Response(JSON.stringify({ error: 'Erro ao verificar credenciais' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        });
      }

      const senhaHash = await hashPassword(senha);
      if (senhaHash !== adminRows[0].senha_hash) {
        return new Response(JSON.stringify({ error: 'Senha incorreta' }), {
          status: 401, headers: { 'Content-Type': 'application/json' }
        });
      }

      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?id=eq.${parsedId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!resp.ok) {
        const err = await resp.text();
        return new Response(JSON.stringify({ error: 'Erro ao deletar registro' }), {
          status: resp.status, headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // GET /api/formalizacao/:id
  if (request.method === 'GET') {
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?id=eq.${parsedId}&limit=1`,
        {
          headers: {
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!resp.ok) {
        return new Response(JSON.stringify({ error: 'Erro ao buscar registro' }), {
          status: resp.status, headers: { 'Content-Type': 'application/json' }
        });
      }

      const data = await resp.json();
      if (!Array.isArray(data) || data.length === 0) {
        return new Response(JSON.stringify({ error: 'Registro não encontrado' }), {
          status: 404, headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(data[0]), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405, headers: { 'Content-Type': 'application/json' }
  });
};
