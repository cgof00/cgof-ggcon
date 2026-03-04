// Cache em memória para filtros
let filtersCache: Record<string, { data: Record<string, string[]>, timestamp: number }> = {};

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

      // Buscar todos os registros de formalizacao
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?select=${validFilterFields.join(',')}&limit=10000`,
        {
          headers: {
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!resp.ok) {
        const err = await resp.text();
        console.error(`❌ Supabase error: ${resp.status}`);
        return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
          status: resp.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const records = await resp.json();
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
