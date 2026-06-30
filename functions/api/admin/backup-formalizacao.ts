// POST /api/admin/backup-formalizacao
// Cria um snapshot da tabela formalizacao em formalizacao_backup
// antes de qualquer operação de importação ou atualização em massa.
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
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/backup_formalizacao`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });

    const text = await resp.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }

    if (!resp.ok) {
      const message = (data && (data.message || data.error))
        ? String(data.message || data.error)
        : (text || resp.statusText);

      const hint = message.includes('backup_formalizacao')
        ? 'RPC não encontrada. Execute o SQL em sql/BACKUP_FORMALIZACAO.sql no Supabase antes de prosseguir.'
        : undefined;

      console.error('❌ Erro backup-formalizacao:', message);
      return new Response(JSON.stringify({ error: message, hint }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Backup da formalizacao criado: ${data?.rows ?? '?'} registros`);

    return new Response(JSON.stringify({
      success: true,
      rows: data?.rows ?? 0,
      timestamp: data?.timestamp ?? new Date().toISOString(),
      message: `Backup concluído: ${data?.rows ?? 0} registros salvos em formalizacao_backup`,
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    console.error('❌ Erro backup-formalizacao:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};
