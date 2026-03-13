// POST /api/admin/update-formalizacao-campos
// Atualiza tipo_formalizacao e recurso na tabela formalizacao usando emenda como chave
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
    const { records } = body;

    if (!Array.isArray(records) || records.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum registro enviado' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    let updated = 0;
    let notFound = 0;
    const errors: string[] = [];

    for (const record of records) {
      const emenda = record.emenda ? String(record.emenda).trim() : '';
      if (!emenda) { notFound++; continue; }

      const updateData: any = {};
      if (record.tipo_formalizacao !== undefined && record.tipo_formalizacao !== null && String(record.tipo_formalizacao).trim() !== '') {
        updateData.tipo_formalizacao = String(record.tipo_formalizacao).trim();
      }
      if (record.recurso !== undefined && record.recurso !== null && String(record.recurso).trim() !== '') {
        updateData.recurso = String(record.recurso).trim();
      }
      if (Object.keys(updateData).length === 0) { notFound++; continue; }

      // PATCH via Supabase REST API com filtro por emenda
      const encodedEmenda = encodeURIComponent(emenda);
      const patchResp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?emenda=eq.${encodedEmenda}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'apikey': SUPABASE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=headers-only,count=exact'
          },
          body: JSON.stringify(updateData)
        }
      );

      if (!patchResp.ok) {
        const err = await patchResp.text();
        errors.push(`Emenda ${emenda}: ${err.substring(0, 200)}`);
        continue;
      }

      // Verificar quantos registros foram afetados pelo header content-range
      const contentRange = patchResp.headers.get('content-range');
      if (contentRange) {
        // Formato: "*/N" onde N é o count
        const match = contentRange.match(/\/(\d+)/);
        const count = match ? parseInt(match[1], 10) : 0;
        if (count > 0) {
          updated += count;
        } else {
          notFound++;
        }
      } else {
        // Se não retornou content-range, assume sucesso
        updated++;
      }
    }

    return new Response(JSON.stringify({
      updated,
      notFound,
      total: records.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `${updated} registros atualizados | ${notFound} não encontrados`
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    console.error('Erro update-formalizacao-campos:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};
