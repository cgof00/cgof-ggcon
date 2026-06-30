// Os filtros são obtidos via SELECT DISTINCT direto no Supabase (campo a campo em paralelo).
// Isso transfere o trabalho pesado para o Postgres e elimina o fetch de 37k registros no Worker.

async function fetchDistinctValues(
  supabaseUrl: string,
  serviceRoleKey: string,
  campo: string
): Promise<string[]> {
  const resp = await fetch(
    `${supabaseUrl}/rest/v1/formalizacao?select=${campo}&${campo}=not.is.null&order=${campo}.asc&limit=50000`,
    {
      headers: {
        'Authorization': 'Bearer ' + serviceRoleKey,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      }
    }
  );
  if (!resp.ok) return [];
  const rows = await resp.json() as Record<string, unknown>[];
  if (!Array.isArray(rows)) return [];
  const seen = new Set<string>();
  for (const row of rows) {
    const v = row[campo];
    if (v && String(v).trim() !== '' && String(v) !== '—') {
      seen.add(String(v).trim());
    }
  }
  return Array.from(seen).sort();
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

      // ── Edge cache: TTL de 5 minutos — evita reprocessar 37k registros a cada request ──
      const nocache = url.searchParams.get('nocache') === '1';
      const cacheKey = new Request(`${url.origin}/api/formalizacao/filters-cascata`);
      if (!nocache) {
        const cached = await caches.default.match(cacheKey);
        if (cached) {
          console.log('⚡ Cache HIT filters-cascata');
          return cached;
        }
      }

      const startTime = Date.now();
      const validFilterFields = [
        "ano", "demandas_formalizacao", "area_estagio", "recurso", "tecnico",
        "situacao_analise_demanda", "area_estagio_situacao_demanda", "conferencista",
        "falta_assinatura", "publicacao", "vigencia", "parlamentar", "partido",
        "regional", "municipio", "conveniado", "objeto", "data_liberacao", "data_analise_demanda",
        "data_recebimento_demanda", "data_retorno", "encaminhado_em", "concluida_em",
        "lote", "prioridade"
      ];

      // Buscar valores únicos por campo em paralelo — o Postgres faz o trabalho pesado
      const entries = await Promise.all(
        validFilterFields.map(async (campo) => {
          const values = await fetchDistinctValues(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, campo);
          return [campo, values] as [string, string[]];
        })
      );
      const result = Object.fromEntries(entries);

      const duration = Date.now() - startTime;
      console.log(`✅ Filtros prontos em ${duration}ms com ${Object.keys(result).length} campos`);

      const finalResponse = new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 's-maxage=300, stale-while-revalidate=60', // 5 min edge cache
        }
      });
      // Armazenar no edge cache sem bloquear a resposta
      context.waitUntil(caches.default.put(cacheKey, finalResponse.clone()));
      return finalResponse;
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
