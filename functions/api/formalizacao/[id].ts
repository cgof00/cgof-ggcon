export const onRequest: PagesFunction = async (context) => {
  const { request, env, params } = context;
  const id = params.id as string;

  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Variáveis de ambiente não configuradas' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId) || parsedId <= 0) {
    return new Response(JSON.stringify({ error: 'ID inválido' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  // PUT /api/formalizacao/:id — Update a record
  if (request.method === 'PUT') {
    try {
      const body = await request.json() as Record<string, unknown>;

      // Remove fields that shouldn't be updated
      delete body['id'];
      delete body['created_at'];

      // Allow empty strings to clear fields
      const cleanBody: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(body)) {
        if (value === '' || value === null || value === undefined) {
          cleanBody[key] = null; // Set to null to clear the field in DB
        } else {
          cleanBody[key] = value;
        }
      }

      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?id=eq.${parsedId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(cleanBody)
        }
      );

      if (!resp.ok) {
        const err = await resp.text();
        console.error(`❌ Supabase PATCH error: ${resp.status} - ${err.substring(0, 300)}`);
        return new Response(JSON.stringify({ error: 'Erro ao atualizar registro', details: err.substring(0, 200) }), {
          status: resp.status, headers: { 'Content-Type': 'application/json' }
        });
      }

      const updated = await resp.json();
      console.log(`✅ Registro ${parsedId} atualizado`);

      return new Response(JSON.stringify(Array.isArray(updated) ? updated[0] : updated), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    } catch (e: any) {
      console.error('❌ ERRO PUT:', e);
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // DELETE /api/formalizacao/:id
  if (request.method === 'DELETE') {
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?id=eq.${parsedId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!resp.ok) {
        const err = await resp.text();
        return new Response(JSON.stringify({ error: 'Erro ao deletar registro' }), {
          status: resp.status, headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // GET /api/formalizacao/:id
  if (request.method === 'GET') {
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?id=eq.${parsedId}&limit=1`,
        {
          headers: {
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!resp.ok) {
        return new Response(JSON.stringify({ error: 'Erro ao buscar registro' }), {
          status: resp.status, headers: { 'Content-Type': 'application/json' }
        });
      }

      const data = await resp.json();
      if (!Array.isArray(data) || data.length === 0) {
        return new Response(JSON.stringify({ error: 'Registro não encontrado' }), {
          status: 404, headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(data[0]), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405, headers: { 'Content-Type': 'application/json' }
  });
};
