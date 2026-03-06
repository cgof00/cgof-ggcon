// Cache em memória para filtros
let filtersCache: Record<string, { data: Record<string, string[]>, timestamp: number }> = {};

const SUPABASE_MAX_LIMIT = 1000;

async function fetchAllRecordsForFilters(supabaseUrl: string, serviceRoleKey: string, fields: string[], totalExpected = 37352) {
  const BATCH_SIZE = SUPABASE_MAX_LIMIT;
  const numBatches = Math.ceil(totalExpected / BATCH_SIZE);
  const fieldsList = fields.join(',');
  
  console.log(`🔄 Fetching ${totalExpected} records para filtros em ${numBatches} batches...`);
  
  const promises = [];
  for (let i = 0; i < numBatches; i++) {
    const offset = i * BATCH_SIZE;
    promises.push(
      fetch(
        `${supabaseUrl}/rest/v1/formalizacao?select=${fieldsList}&order=id.asc&limit=${BATCH_SIZE}&offset=${offset}`,
        {
          headers: {
            'Authorization': 'Bearer ' + serviceRoleKey,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
          }
        }
      ).then(async (resp) => {
        if (!resp.ok) {
          const err = await resp.text();
          console.error(`❌ Batch ${i} failed:`, err.substring(0, 100));
          return [];
        }
        const data = await resp.json();
        console.log(`✅ Batch ${i} (offset ${offset}): ${Array.isArray(data) ? data.length : 0} registros`);
        return Array.isArray(data) ? data : [];
      })
    );
  }
  
  const batches = await Promise.all(promises);
  const allRecords = batches.flat();
  console.log(`🎉 Total de registros carregados para filtros: ${allRecords.length}`);
  
  return allRecords;
}

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;

  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ 
      error: 'Variáveis de ambiente não configuradas' 
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const url = new URL(request.url);

  // GET /api/formalizacao/filters-cascata
  if (request.method === 'GET') {
    try {
      console.log('🎨 GET /api/formalizacao/filters-cascata');

      const startTime = Date.now();
      const validFilterFields = [
        "ano", "demandas_formalizacao", "area_estagio", "recurso", "tecnico",
        "situacao_analise_demanda", "area_estagio_situacao_demanda", "conferencista",
        "falta_assinatura", "publicacao", "vigencia", "parlamentar", "partido",
        "regional", "municipio", "conveniado", "objeto", "data_liberacao", "data_analise_demanda",
        "data_recebimento_demanda", "data_retorno", "encaminhado_em", "concluida_em"
      ];

      // Buscar TODOS os registros em paralelo (37k+)
      const records = await fetchAllRecordsForFilters(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, validFilterFields);
      const result: Record<string, string[]> = {};

      // Extrair valores únicos
      const filterMaps = new Map<string, Set<string>>();
      for (const campo of validFilterFields) {
        filterMaps.set(campo, new Set<string>());
      }

      // Processar registros
      if (Array.isArray(records)) {
        for (const record of records) {
          for (const campo of validFilterFields) {
            const valor = record[campo];
            if (valor && String(valor).trim() !== '' && String(valor) !== '—') {
              filterMaps.get(campo)?.add(String(valor).trim());
            }
          }
        }
      }

      // Converter para arrays ordenados
      for (const [campo, valoresSet] of filterMaps) {
        result[campo] = Array.from(valoresSet).sort();
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Filtros prontos em ${duration}ms com ${Object.keys(result).length} campos`);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e: any) {
      console.error('❌ ERRO:', e);
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
};
