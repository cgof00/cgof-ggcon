// Cloudflare Workers: POST /api/emendas/import-report
// Importar relatório de emendas - recebe CSV mapeado, faz PROCV no servidor, insere somente novas

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

async function fetchExistingCodigos(supabaseUrl: string, serviceRoleKey: string): Promise<Set<string>> {
  const allCodigos = new Set<string>();
  let offset = 0;
  const batchSize = 2000;

  while (true) {
    const resp = await fetch(
      `${supabaseUrl}/rest/v1/emendas?select=codigo_num&codigo_num=not.is.null&order=id.asc&limit=${batchSize}&offset=${offset}`,
      {
        headers: {
          'Authorization': 'Bearer ' + serviceRoleKey,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!resp.ok) {
      const err = await resp.text();
      console.error(`❌ Erro ao buscar codigos (offset ${offset}):`, err.substring(0, 200));
      throw new Error('Falha ao consultar emendas existentes no banco');
    }

    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) break;

    for (const row of data) {
      if (row.codigo_num && String(row.codigo_num).trim() !== '') {
        allCodigos.add(String(row.codigo_num).trim());
      }
    }

    if (data.length < batchSize) break;
    offset += batchSize;
  }

  return allCodigos;
}

async function insertEmendas(supabaseUrl: string, serviceRoleKey: string, items: any[]): Promise<{ inserted: number; errors: string[] }> {
  let inserted = 0;
  const errors: string[] = [];
  const chunkSize = 200;

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);

    const resp = await fetch(
      `${supabaseUrl}/rest/v1/emendas`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + serviceRoleKey,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(chunk)
      }
    );

    if (!resp.ok) {
      const err = await resp.text();
      console.error(`❌ Erro ao inserir chunk ${Math.floor(i / chunkSize) + 1}:`, err.substring(0, 300));
      errors.push(`Lote ${Math.floor(i / chunkSize) + 1}: ${err.substring(0, 200)}`);
    } else {
      const data = await resp.json();
      inserted += Array.isArray(data) ? data.length : 0;
    }
  }

  return { inserted, errors };
}

async function syncFormalizacao(supabaseUrl: string, serviceRoleKey: string, novosItems: any[]): Promise<{ updated: number; notFound: number; errors: string[] }> {
  let updated = 0;
  let notFound = 0;
  const errors: string[] = [];

  const convenios = novosItems
    .filter((it: any) => it.num_convenio && String(it.num_convenio).trim() !== '')
    .map((it: any) => String(it.num_convenio).trim());

  if (convenios.length === 0) return { updated, notFound: novosItems.length, errors };

  const uniqueConvenios = [...new Set(convenios)];
  const formalizacoesEncontradas: any[] = [];

  for (let i = 0; i < uniqueConvenios.length; i += 100) {
    const batch = uniqueConvenios.slice(i, i + 100);
    const queryParam = batch.map(c => `"${c}"`).join(',');

    const resp = await fetch(
      `${supabaseUrl}/rest/v1/formalizacao?select=id,numero_convenio&numero_convenio=in.(${queryParam})`,
      {
        headers: {
          'Authorization': 'Bearer ' + serviceRoleKey,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!resp.ok) {
      const err = await resp.text();
      errors.push(`Buscar formalizações: ${err.substring(0, 200)}`);
    } else {
      const data = await resp.json();
      if (Array.isArray(data)) formalizacoesEncontradas.push(...data);
    }
  }

  const formalizacaoMap = new Map<string, number[]>();
  for (const f of formalizacoesEncontradas) {
    const key = f.numero_convenio ? String(f.numero_convenio).trim() : '';
    if (!key) continue;
    if (!formalizacaoMap.has(key)) formalizacaoMap.set(key, []);
    formalizacaoMap.get(key)!.push(f.id);
  }

  for (const emendaItem of novosItems) {
    const conv = emendaItem.num_convenio ? String(emendaItem.num_convenio).trim() : '';
    if (!conv) { notFound++; continue; }
    const fIds = formalizacaoMap.get(conv);
    if (!fIds || fIds.length === 0) { notFound++; continue; }

    const updateData: any = {};
    if (emendaItem.detalhes) updateData.demanda = emendaItem.detalhes;
    if (emendaItem.natureza) updateData.classificacao_emenda_demanda = emendaItem.natureza;
    if (emendaItem.ano_refer) updateData.ano = emendaItem.ano_refer;
    if (emendaItem.num_emenda) updateData.emendas_agregadoras = emendaItem.num_emenda;
    if (emendaItem.situacao_d) updateData.situacao_demandas_sempapel = emendaItem.situacao_d;
    if (emendaItem.parlamentar) updateData.parlamentar = emendaItem.parlamentar;
    if (emendaItem.partido) updateData.partido = emendaItem.partido;
    if (emendaItem.beneficiario) updateData.conveniado = emendaItem.beneficiario;
    if (emendaItem.municipio) updateData.municipio = emendaItem.municipio;
    if (emendaItem.objeto) updateData.objeto = emendaItem.objeto;
    if (emendaItem.regional) updateData.regional = emendaItem.regional;
    if (emendaItem.num_convenio) updateData.numero_convenio = emendaItem.num_convenio;
    if (emendaItem.valor !== undefined && emendaItem.valor !== null) updateData.valor = emendaItem.valor;
    if (emendaItem.portfolio) updateData.portfolio = emendaItem.portfolio;
    if (Object.keys(updateData).length === 0) continue;

    for (const fId of fIds) {
      const resp = await fetch(
        `${supabaseUrl}/rest/v1/formalizacao?id=eq.${fId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': 'Bearer ' + serviceRoleKey,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(updateData)
        }
      );

      if (!resp.ok) {
        const err = await resp.text();
        errors.push(`Formalização ${fId}: ${err.substring(0, 100)}`);
      } else {
        updated++;
      }
    }
  }

  return { updated, notFound, errors };
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

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: corsHeaders()
    });
  }

  // Auth verification
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Token não fornecido' }), {
      status: 401, headers: corsHeaders()
    });
  }
  const token = authHeader.replace('Bearer ', '');
  const decoded = verifyToken(token);
  if (!decoded) {
    return new Response(JSON.stringify({ error: 'Token inválido ou expirado' }), {
      status: 401, headers: corsHeaders()
    });
  }
  if (decoded.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Apenas administradores podem importar relatórios' }), {
      status: 403, headers: corsHeaders()
    });
  }

  try {
    const items = await request.json();
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Dados inválidos ou vazios' }), {
        status: 400, headers: corsHeaders()
      });
    }

    console.log(`📥 Import Report: Recebido ${items.length} registros mapeados`);

    // PASSO 1: PROCV - buscar todos os codigo_num existentes
    const allExistingCodigos = await fetchExistingCodigos(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log(`📋 ${allExistingCodigos.size} emendas já existem no banco`);

    // PASSO 2: Filtrar somente emendas NOVAS
    const novosItems = items.filter((item: any) => {
      const cod = item.codigo_num ? String(item.codigo_num).trim() : '';
      if (!cod) return false;
      return !allExistingCodigos.has(cod);
    });
    const skipped = items.length - novosItems.length;
    console.log(`✅ ${novosItems.length} emendas NOVAS para importar (${skipped} já existiam)`);

    // PASSO 3: Inserir novas emendas
    const insertResult = await insertEmendas(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, novosItems);

    // PASSO 4: Sincronizar com formalização
    const syncResult = await syncFormalizacao(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, novosItems);

    const result = {
      emendas_inserted: insertResult.inserted,
      skipped,
      formalizacao_updated: syncResult.updated,
      not_in_formalizacao: syncResult.notFound,
      errors: [...insertResult.errors, ...syncResult.errors].length > 0
        ? [...insertResult.errors, ...syncResult.errors]
        : undefined,
      message: `${insertResult.inserted} emendas importadas, ${skipped} já existiam, ${syncResult.updated} formalizações atualizadas`
    };

    console.log(`📊 Resultado: ${result.message}`);

    return new Response(JSON.stringify(result), {
      status: 200, headers: corsHeaders()
    });

  } catch (error: any) {
    console.error('❌ Erro no import report:', error);
    return new Response(JSON.stringify({ error: 'Erro ao importar relatório', details: error.message }), {
      status: 500, headers: corsHeaders()
    });
  }
};
