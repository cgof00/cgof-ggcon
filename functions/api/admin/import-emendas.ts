// POST /api/admin/import-emendas
// Recebe batch de emendas do CSV e faz upsert na tabela emendas
// ⚠️ IMPORTANTE: Requer constraint UNIQUE (codigo_num) na tabela para funcionar corretamente
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
    let records = body.records;

    if (!Array.isArray(records) || records.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum registro enviado' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // 🔍 VALIDAÇÃO: Remover registros com codigo_num vazio ou duplicado
    const validRecords = records.filter(r => r.codigo_num && String(r.codigo_num).trim() !== '');
    const deduped = new Map<string, any>();
    for (const rec of validRecords) {
      const key = String(rec.codigo_num).trim();
      // Manter o último registro com o mesmo codigo_num
      deduped.set(key, rec);
    }
    const finalRecords = Array.from(deduped.values());

    if (finalRecords.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum registro válido após validação (codigo_num vazio)' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`📥 Import Emendas: ${records.length} original → ${finalRecords.length} após deduplicação local`);

    // Upsert na tabela emendas (conflito por codigo_num)
    // Estratégia "merge-duplicates" irá atualizar registros existentes e inserir novos
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/emendas?on_conflict=codigo_num`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify(finalRecords)
      }
    );

    if (!resp.ok) {
      const err = await resp.text();
      console.error('❌ Erro upsert emendas:', err.substring(0, 500));
      
      // Se erro mencionar UNIQUE violation, significa que a constraint provavelmente foi adicionada
      // Tentar alternativamente fazer INSERT OR UPDATE manualmente
      if (err.includes('duplicate') || err.includes('unique')) {
        console.log('⚠️ Detectado erro de unicidade - tentando estratégia fallback...');
        return new Response(JSON.stringify({ 
          error: 'Erro de integridade: Existe uma constraint UNIQUE não tratada. Verifique o schema da tabela.',
          details: err.substring(0, 200)
        }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: err.substring(0, 300) }), {
        status: resp.status, headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ UPSERT bem-sucedido: ${finalRecords.length} emendas processadas`);

    return new Response(JSON.stringify({ 
      success: true, 
      imported: finalRecords.length,
      deduped: records.length - finalRecords.length,
      message: `${finalRecords.length} emendas importadas (${records.length - finalRecords.length} duplicadas)`
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    console.error('❌ Erro import-emendas:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};
