export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;

  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Supabase env vars not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // POST /api/debug/warmup-cache
  if (request.method === 'POST') {
    try {
      const startTime = Date.now();

      // Buscar contagem de formalizações
      const countResp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?select=id`,
        {
          headers: {
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'count=exact'
          }
        }
      );

      let recordCount = 0;
      if (countResp.ok) {
        const countHeader = countResp.headers.get('content-range');
        if (countHeader) {
          // Format: "0-99/37000"
          const parts = countHeader.split('/');
          recordCount = parseInt(parts[1]) || 0;
        }
      }

      // Buscar primeiros registros para aquecer cache
      if (recordCount > 0) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/formalizacao?select=*&limit=100&order=created_at.desc`,
          {
            headers: {
              'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Content-Type': 'application/json'
            }
          }
        );
      }

      const durationMs = Date.now() - startTime;

      return new Response(JSON.stringify({
        status: 'success',
        records: recordCount,
        durationMs: durationMs
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e: any) {
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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  return new Response('Method not allowed', { status: 405 });
};
