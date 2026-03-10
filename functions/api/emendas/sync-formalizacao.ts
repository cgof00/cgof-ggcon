// Cloudflare Workers: POST /api/emendas/sync-formalizacao
// Sincroniza dados das emendas com a tabela de formalizacao
// Estratégia dupla: RPC (ideal) ou REST com updates+inserts (fallback)

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

async function supaFetch(url: string, key: string, options: RequestInit = {}) {
  return fetch(url, {
    ...options,
    headers: {
      'Authorization': 'Bearer ' + key,
      'apikey': key,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
      ...(options.headers || {})
    }
  });
}

function digitsOnly(s: string | null | undefined): string {
  return (s || '').replace(/[^0-9]/g, '');
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
    // === TENTAR RPC PRIMEIRO ===
    const rpcResp = await supaFetch(
      `${SUPABASE_URL}/rest/v1/rpc/sync_emendas_formalizacao`,
      SUPABASE_SERVICE_ROLE_KEY,
      { method: 'POST', body: JSON.stringify({}) }
    );

    if (rpcResp.ok) {
      const result = await rpcResp.json();
      return new Response(JSON.stringify({
        method: 'rpc',
        updated: result?.updated || 0,
        inserted: result?.inserted || 0,
        message: `${result?.updated || 0} formalizacoes atualizadas, ${result?.inserted || 0} novas inseridas (via RPC)`
      }), { status: 200, headers: corsHeaders() });
    }

    // === RPC FALHOU - FALLBACK REST COM UPDATES + INSERTS ===
    const rpcError = await rpcResp.text();

    // 1) Buscar emendas com num_convenio preenchido
    const emendasResp = await supaFetch(
      `${SUPABASE_URL}/rest/v1/emendas?select=codigo_num,num_convenio,num_emenda,detalhes,natureza,ano_refer,situacao_d,parlamentar,partido,beneficiario,municipio,objeto,regional,portfolio,valor&num_convenio=neq.&num_convenio=not.is.null&limit=10000`,
      SUPABASE_SERVICE_ROLE_KEY,
      { method: 'GET' }
    );

    if (!emendasResp.ok) {
      const err = await emendasResp.text();
      return new Response(JSON.stringify({
        error: 'Erro ao buscar emendas',
        details: err.substring(0, 300),
        rpc_error: rpcError.substring(0, 300)
      }), { status: 500, headers: corsHeaders() });
    }

    const emendas: any[] = await emendasResp.json();
    if (!emendas.length) {
      return new Response(JSON.stringify({
        method: 'rest', updated: 0, inserted: 0,
        message: 'Nenhuma emenda com num_convenio encontrada'
      }), { status: 200, headers: corsHeaders() });
    }

    // 2) Buscar formalizacoes com todos os campos necessários para merge
    const formResp = await supaFetch(
      `${SUPABASE_URL}/rest/v1/formalizacao?select=id,numero_convenio,emenda,demanda,classificacao_emenda_demanda,ano,emendas_agregadoras,situacao_demandas_sempapel,parlamentar,partido,conveniado,municipio,objeto,regional,portfolio,valor&limit=50000`,
      SUPABASE_SERVICE_ROLE_KEY,
      { method: 'GET' }
    );

    const formalizacoes: any[] = formResp.ok ? await formResp.json() : [];

    // 3) Índices para matching
    const formByConvenio = new Map<string, any>();
    const formByEmendaDigits = new Map<string, any>();
    for (const f of formalizacoes) {
      const conv = (f.numero_convenio || '').trim();
      if (conv) formByConvenio.set(conv, f);
      const emDigits = digitsOnly(f.emenda);
      if (emDigits.length >= 8) formByEmendaDigits.set(emDigits, f);
    }

    // 4) Calcular updates e inserts
    const toUpdate: any[] = [];
    const toInsert: any[] = [];
    const processedFormIds = new Set<number>();

    const fieldMap: [string, string][] = [
      ['demanda', 'detalhes'],
      ['classificacao_emenda_demanda', 'natureza'],
      ['ano', 'ano_refer'],
      ['emenda', 'codigo_num'],
      ['emendas_agregadoras', 'num_emenda'],
      ['situacao_demandas_sempapel', 'situacao_d'],
      ['parlamentar', 'parlamentar'],
      ['partido', 'partido'],
      ['conveniado', 'beneficiario'],
      ['municipio', 'municipio'],
      ['objeto', 'objeto'],
      ['regional', 'regional'],
      ['portfolio', 'portfolio'],
    ];

    for (const e of emendas) {
      const convKey = (e.num_convenio || '').trim();
      const emDigits = digitsOnly(e.codigo_num);

      let matched = convKey ? formByConvenio.get(convKey) : null;
      if (!matched && emDigits.length >= 8) {
        matched = formByEmendaDigits.get(emDigits);
      }

      if (matched && !processedFormIds.has(matched.id)) {
        processedFormIds.add(matched.id);
        const updates: any = { id: matched.id };
        let hasChanges = false;

        for (const [fCol, eCol] of fieldMap) {
          const fVal = (matched[fCol] || '').trim();
          const eVal = (e[eCol] || '').trim();
          if (!fVal && eVal) {
            updates[fCol] = eVal;
            hasChanges = true;
          }
        }

        if (!(matched.numero_convenio || '').trim() && convKey) {
          updates['numero_convenio'] = convKey;
          hasChanges = true;
        }

        if (!matched.valor && e.valor) {
          updates['valor'] = e.valor;
          hasChanges = true;
        }

        if (hasChanges) toUpdate.push(updates);
      } else if (!matched && convKey) {
        toInsert.push({
          ano: e.ano_refer || null,
          parlamentar: e.parlamentar || null,
          partido: e.partido || null,
          emenda: e.codigo_num || null,
          demanda: e.detalhes || null,
          classificacao_emenda_demanda: e.natureza || null,
          numero_convenio: e.num_convenio || null,
          regional: e.regional || null,
          municipio: e.municipio || null,
          conveniado: e.beneficiario || null,
          objeto: e.objeto || null,
          portfolio: e.portfolio || null,
          valor: e.valor || null
        });
      }
    }

    // 5) Executar UPDATES via PATCH (até ~40, limite 50 subrequests total)
    let updated = 0;
    const MAX_PATCHES = 40;
    const patchBatch = toUpdate.slice(0, MAX_PATCHES);

    for (const row of patchBatch) {
      const id = row.id;
      const body = { ...row };
      delete body.id;

      const patchResp = await supaFetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?id=eq.${id}`,
        SUPABASE_SERVICE_ROLE_KEY,
        { method: 'PATCH', body: JSON.stringify(body) }
      );
      if (patchResp.ok) updated++;
    }

    // 6) Executar INSERTS em batch
    let inserted = 0;
    if (toInsert.length > 0) {
      const BATCH = 1000;
      for (let i = 0; i < toInsert.length; i += BATCH) {
        const batch = toInsert.slice(i, i + BATCH);
        const insResp = await supaFetch(
          `${SUPABASE_URL}/rest/v1/formalizacao`,
          SUPABASE_SERVICE_ROLE_KEY,
          { method: 'POST', body: JSON.stringify(batch) }
        );
        if (insResp.ok) inserted += batch.length;
      }
    }

    const pendingUpdates = toUpdate.length > MAX_PATCHES ? toUpdate.length - MAX_PATCHES : 0;
    let msg = `${updated} atualizadas, ${inserted} novas inseridas (REST fallback)`;
    if (pendingUpdates > 0) {
      msg += ` - ${pendingUpdates} updates pendentes (execute sync novamente)`;
    }

    return new Response(JSON.stringify({
      method: 'rest_fallback',
      updated,
      inserted,
      total_emendas: emendas.length,
      total_formalizacoes: formalizacoes.length,
      matched_to_update: toUpdate.length,
      new_to_insert: toInsert.length,
      rpc_status: rpcResp.status,
      rpc_error: rpcError.substring(0, 300),
      message: msg
    }), { status: 200, headers: corsHeaders() });

  } catch (error: any) {
    return new Response(JSON.stringify({
      error: 'Erro interno',
      details: error.message || String(error)
    }), { status: 500, headers: corsHeaders() });
  }
};
