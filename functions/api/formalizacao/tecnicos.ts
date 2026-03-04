export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;

  const SUPABASE_URL = env.SUPABASE_URL || 'https://dvziqcgjuidtkihoeqdc.supabase.co';
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2emlxY2dqdWlkdGtwaG9lcWRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjExNjQwMSwiZXhwIjoyMDg3NjkyNDAxfQ.bAgun92X0530xUXg_Wa5hrCAkLL-P8O44usT8o2_Mr8';

  // GET /api/formalizacao/tecnicos
  if (request.method === 'GET') {
    try {
      // Buscar usuários da tabela usuarios
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/usuarios?select=id,nome,email,role&eq=ativo,true&order=nome.asc`,
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
        return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
          status: resp.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const data = await resp.json();

      return new Response(JSON.stringify({
        tecnicos: Array.isArray(data) ? data : []
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
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  return new Response('Method not allowed', { status: 405 });
};
