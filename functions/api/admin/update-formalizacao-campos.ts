// POST /api/admin/update-formalizacao-campos
// Atualiza tipo_formalizacao e recurso na tabela formalizacao usando emenda como chave
export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  const YEARS = [2023, 2024, 2025, 2026];

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
    const { records } = body;

    if (!Array.isArray(records) || records.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum registro enviado' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Uma única subrequest para o Supabase via RPC (evita limite do Cloudflare de subrequests)
    const rpcResp = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/update_formalizacao_campos_batch`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records, years: YEARS }),
      }
    );

    const text = await rpcResp.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }

    if (!rpcResp.ok) {
      const message = (data && (data.message || data.error))
        ? String(data.message || data.error)
        : (text || rpcResp.statusText);

      // Se a RPC ainda não foi criada no Supabase, orientar.
      const hint = message.includes('update_formalizacao_campos_batch')
        ? 'RPC não encontrada. Execute o SQL em sql/RPC_UPDATE_FORMALIZACAO_CAMPOS_BATCH.sql no Supabase e tente novamente.'
        : undefined;

      return new Response(JSON.stringify({ error: message, hint }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      updated: data?.updated || 0,
      notFound: data?.notFound || 0,
      skippedYear: data?.skippedYear || 0,
      total: data?.total ?? records.length,
      filtered: data?.filtered,
      years: data?.years || YEARS,
      message: `${data?.updated || 0} registros atualizados | ${data?.notFound || 0} emendas não encontradas | ${data?.skippedYear || 0} fora de ${YEARS.join(', ')}`,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (e: any) {
    console.error('Erro update-formalizacao-campos:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};
