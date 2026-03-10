// Cloudflare Workers: POST /api/emendas/sync-formalizacao
// Sincroniza dados das emendas com a tabela de formalização

function verifyToken(token: string): any {
  try {
    const payload = atob(token);
    const decoded = JSON.parse(payload);
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
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
  const decoded = verifyToken(authHeader.replace('Bearer ', ''));
  if (!decoded) {
    return new Response(JSON.stringify({ error: 'Token inválido ou expirado' }), {
      status: 401, headers: corsHeaders()
    });
  }
  if (decoded.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Apenas administradores' }), {
      status: 403, headers: corsHeaders()
    });
  }

  try {
    console.log('🔄 Sincronizando emendas → formalização...');

    // Buscar formalizações com numero_convenio
    const allFormalizacoes: any[] = [];
    let fOffset = 0;
    while (true) {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?select=id,numero_convenio,emenda&numero_convenio=not.is.null&order=id.asc&limit=1000&offset=${fOffset}`,
        {
          headers: {
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      if (!resp.ok) break;
      const data = await resp.json();
      if (!Array.isArray(data) || data.length === 0) break;
      allFormalizacoes.push(...data);
      if (data.length < 1000) break;
      fOffset += 1000;
    }

    // Mapa numero_convenio → [ids]
    const formalizacaoMap = new Map<string, number[]>();
    for (const f of allFormalizacoes) {
      const key = f.numero_convenio ? String(f.numero_convenio).trim() : '';
      if (!key) continue;
      if (!formalizacaoMap.has(key)) formalizacaoMap.set(key, []);
      formalizacaoMap.get(key)!.push(f.id);
    }

    const convenioKeys = [...formalizacaoMap.keys()];
    console.log(`📋 ${convenioKeys.length} números de convênio únicos`);

    let updated = 0;
    let notFound = 0;
    const errors: string[] = [];

    for (let i = 0; i < convenioKeys.length; i += 100) {
      const batch = convenioKeys.slice(i, i + 100);
      const queryParam = batch.map(c => `"${c}"`).join(',');

      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/emendas?select=*&num_convenio=in.(${queryParam})`,
        {
          headers: {
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      if (!resp.ok) { errors.push('Erro ao buscar emendas'); continue; }
      const emendas = await resp.json();
      if (!Array.isArray(emendas)) continue;

      const emendaMap = new Map<string, any>();
      for (const e of emendas) {
        if (e.num_convenio) emendaMap.set(String(e.num_convenio).trim(), e);
      }

      for (const conv of batch) {
        const emenda = emendaMap.get(conv);
        if (!emenda) { notFound++; continue; }

        const fIds = formalizacaoMap.get(conv);
        if (!fIds) continue;

        const updateData: any = {};
        if (emenda.detalhes) updateData.demanda = emenda.detalhes;
        if (emenda.natureza) updateData.classificacao_emenda_demanda = emenda.natureza;
        if (emenda.ano_refer) updateData.ano = emenda.ano_refer;
        if (emenda.num_emenda) updateData.emendas_agregadoras = emenda.num_emenda;
        if (emenda.situacao_d) updateData.situacao_demandas_sempapel = emenda.situacao_d;
        if (emenda.parlamentar) updateData.parlamentar = emenda.parlamentar;
        if (emenda.partido) updateData.partido = emenda.partido;
        if (emenda.beneficiario) updateData.conveniado = emenda.beneficiario;
        if (emenda.municipio) updateData.municipio = emenda.municipio;
        if (emenda.objeto) updateData.objeto = emenda.objeto;
        if (emenda.regional) updateData.regional = emenda.regional;
        if (emenda.num_convenio) updateData.numero_convenio = emenda.num_convenio;
        if (emenda.valor !== undefined && emenda.valor !== null) updateData.valor = emenda.valor;
        if (emenda.portfolio) updateData.portfolio = emenda.portfolio;
        if (Object.keys(updateData).length === 0) continue;

        for (const fId of fIds) {
          const patchResp = await fetch(
            `${SUPABASE_URL}/rest/v1/formalizacao?id=eq.${fId}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify(updateData)
            }
          );
          if (!patchResp.ok) {
            errors.push(`F#${fId}: ${(await patchResp.text()).substring(0, 100)}`);
          } else {
            updated++;
          }
        }
      }
    }

    console.log(`✅ Sync: ${updated} formalizações atualizadas, ${notFound} não encontradas`);

    return new Response(JSON.stringify({
      updated,
      not_found: notFound,
      total_formalizacoes: allFormalizacoes.length,
      errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
      message: `${updated} formalizações atualizadas com dados das emendas`
    }), { status: 200, headers: corsHeaders() });

  } catch (error: any) {
    console.error('❌ Erro sync:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: corsHeaders()
    });
  }
};
