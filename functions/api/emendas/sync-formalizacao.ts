// Cloudflare Workers: POST /api/emendas/sync-formalizacao
// Sincroniza dados das emendas com a tabela de formalizacao
// Estratégia: busca emendas e formalizacoes via REST, faz match no worker, atualiza via PATCH/POST

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
    // Tentar RPC primeiro (mais eficiente se a funcao existir)
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
        message: `${result?.updated || 0} formalizacoes atualizadas, ${result?.inserted || 0} novas inseridas`
      }), { status: 200, headers: corsHeaders() });
    }

    // RPC falhou - fazer sync via REST (fallback)
    // NOTA: Cloudflare tem limite de 50 subrequests, entao usamos bulk operations
    const rpcError = await rpcResp.text();
    console.log('RPC indisponivel (' + rpcResp.status + '), usando fallback REST. Erro: ' + rpcError.substring(0, 200));

    // Buscar emendas com num_convenio preenchido (só campos necessários)
    // Usa 2 requests: emendas + formalizacoes = subrequests 2-3
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
        rpc_error: rpcError.substring(0, 200)
      }), { status: 500, headers: corsHeaders() });
    }

    const emendas: any[] = await emendasResp.json();
    if (!Array.isArray(emendas) || emendas.length === 0) {
      return new Response(JSON.stringify({
        method: 'rest',
        updated: 0, inserted: 0,
        message: 'Nenhuma emenda com num_convenio encontrada',
        rpc_status: rpcResp.status
      }), { status: 200, headers: corsHeaders() });
    }

    // Buscar formalizacoes existentes (numero_convenio para matching)
    const formResp = await supaFetch(
      `${SUPABASE_URL}/rest/v1/formalizacao?select=numero_convenio&numero_convenio=neq.&numero_convenio=not.is.null&limit=50000`,
      SUPABASE_SERVICE_ROLE_KEY,
      { method: 'GET' }
    );

    const formalizacoes: any[] = formResp.ok ? await formResp.json() : [];
    
    // Set de numero_convenio existentes
    const existingConvenios = new Set<string>();
    for (const f of formalizacoes) {
      if (f.numero_convenio) existingConvenios.add(String(f.numero_convenio).trim());
    }

    // Filtrar emendas que NAO existem na formalizacao (novas)
    const toInsert = emendas.filter(e => {
      const key = e.num_convenio ? String(e.num_convenio).trim() : '';
      return key && !existingConvenios.has(key);
    });

    let inserted = 0;

    if (toInsert.length > 0) {
      // Mapear para formato formalizacao
      const rows = toInsert.map(e => ({
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
      }));

      // Inserir em batches de 1000 (cada batch = 1 subrequest)
      const BATCH = 1000;
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const insResp = await supaFetch(
          `${SUPABASE_URL}/rest/v1/formalizacao`,
          SUPABASE_SERVICE_ROLE_KEY,
          { method: 'POST', body: JSON.stringify(batch) }
        );
        if (insResp.ok) {
          inserted += batch.length;
        } else {
          const err = await insResp.text();
          console.error('Insert batch falhou:', err.substring(0, 200));
        }
      }
    }

    return new Response(JSON.stringify({
      method: 'rest_fallback',
      updated: 0,
      inserted,
      total_emendas: emendas.length,
      existing_formalizacoes: formalizacoes.length,
      new_to_insert: toInsert.length,
      rpc_status: rpcResp.status,
      message: `${inserted} novas formalizacoes inseridas (RPC indisponivel, updates nao aplicados - execute CRIAR_FUNCAO_SYNC.sql no Supabase para sync completo)`
    }), { status: 200, headers: corsHeaders() });

  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(JSON.stringify({ error: 'Erro ao sincronizar', details: error.message }), {
      status: 500, headers: corsHeaders()
    });
  }
};
