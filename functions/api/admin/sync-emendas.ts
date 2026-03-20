// POST /api/admin/sync-emendas
// 🚀 SINCRONIZAÇÃO INCREMENTAL - Simples e Eficiente
// Compara toda emendas.codigo_num vs formalizacao.emenda (normalizado),
// insere apenas o que está faltando e atualiza apenas anos 2023-2026.
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

  const headers = {
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'apikey': SUPABASE_KEY,
    'Content-Type': 'application/json'
  };

  // Cada chamada processa um lote de p_limit registros.
  // O frontend chama em loop até has_more = false.
  async function callBatch(p_offset: number, p_limit: number): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 24000); // 24s < 30s Cloudflare limit
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sync_emendas_formalizacao_batch`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_offset, p_limit }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(err.substring(0, 400));
    }
    return resp.json();
  }

  try {
    // Ler offset e limit do body (frontend controla o loop de batches)
    let p_offset = 0;
    let p_limit = 5000;
    try {
      const body = await request.json() as any;
      if (typeof body?.offset === 'number') p_offset = body.offset;
      if (typeof body?.limit  === 'number') p_limit  = body.limit;
    } catch { /* body vazio ou inválido: usa defaults */ }

    console.log(`🔄 Sync batch: offset=${p_offset}, limit=${p_limit}`);
    const result = await callBatch(p_offset, p_limit);
    console.log('✅ Batch concluído:', result);

    // Só limpa o staging após o último lote
    let emendasCleaned = false;
    if (!result?.has_more) {
      try {
        // TRUNCATE via RPC devolve espaço em disco imediatamente (sem bloat).
        // DELETE marcaria linhas como mortas e acumularia bloat ao longo do tempo.
        const truncResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/truncate_emendas_staging`, {
          method: 'POST',
          headers,
          body: '{}',
        });
        if (truncResp.ok) {
          emendasCleaned = true;
          console.log('🧹 Staging truncado após último lote (espaço liberado)');
        } else {
          // Fallback para DELETE caso a função ainda não exista no banco
          const deleteResp = await fetch(`${SUPABASE_URL}/rest/v1/emendas?id=gte.0`, {
            method: 'DELETE',
            headers: { ...headers, 'Prefer': 'return=minimal' },
          });
          if (deleteResp.ok) emendasCleaned = true;
        }
      } catch (cleanErr: any) {
        console.warn('⚠️ Erro ao limpar staging:', cleanErr.message);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      result: {
        updated:           result?.updated           || 0,
        inserted:          result?.inserted          || 0,
        staging_count:     result?.total             || 0,
        has_more:          result?.has_more          ?? false,
        offset:            result?.offset            ?? p_offset,
        limit:             result?.limit             ?? p_limit,
        total:             result?.total             || 0,
        formalizacao_count: result?.formalizacao_count ?? null,
        emendas_cleaned:   emendasCleaned,
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (e: any) {
    console.error('❌ Erro sync-emendas:', e);
    const isTimeout = e?.name === 'AbortError' || (e?.message || '').includes('aborted');
    const errorMsg = isTimeout
      ? 'Timeout no lote de sincronização (>24s). Tente reduzir o tamanho do lote.'
      : e.message;
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
