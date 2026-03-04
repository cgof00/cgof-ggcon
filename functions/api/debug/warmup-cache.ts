export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;

  const SUPABASE_URL = env.SUPABASE_URL || 'https://dvziqcgjuidtkihoeqdc.supabase.co';
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2emlxY2dqdWlkdGtwaG9lcWRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjExNjQwMSwiZXhwIjoyMDg3NjkyNDAxfQ.bAgun92X0530xUXg_Wa5hrCAkLL-P8O44usT8o2_Mr8';

  // POST /api/debug/warmup-cache
  if (request.method === 'POST') {
    try {
      const startTime = Date.now();

      // Buscar contagem de formalizações
      const countResp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?select=count()`,
        {
          headers: {
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      let recordCount = 0;
      if (countResp.ok) {
        const countData = await countResp.json();
        recordCount = Array.isArray(countData) ? countData.length : 0;
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
