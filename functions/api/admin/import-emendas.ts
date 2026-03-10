// POST /api/admin/import-emendas
// Recebe batch de emendas do CSV e faz upsert na tabela emendas
export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: 'Variáveis de ambiente não configuradas' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json() as { records: any[] };
    const records = body.records;

    if (!Array.isArray(records) || records.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum registro enviado' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Upsert na tabela emendas (conflito por codigo_num)
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/emendas`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify(records)
      }
    );

    if (!resp.ok) {
      const err = await resp.text();
      console.error('Erro upsert emendas:', err.substring(0, 500));
      return new Response(JSON.stringify({ error: err.substring(0, 300) }), {
        status: resp.status, headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      imported: records.length 
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    console.error('Erro import-emendas:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};
