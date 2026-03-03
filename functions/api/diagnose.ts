export const onRequest: PagesFunction = async (context) => {
  const supabaseUrl = context.env.SUPABASE_URL;
  const supabaseKey = context.env.SUPABASE_SERVICE_ROLE_KEY;

  const diagnostics = {
    timestamp: new Date().toISOString(),
    env: {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlLength: supabaseUrl?.length || 0,
      keyLength: supabaseKey?.length || 0,
      urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 40) : 'NOT SET',
      keyPrefix: supabaseKey ? supabaseKey.substring(0, 20) : 'NOT SET',
    },
  };

  // Try to fetch from Supabase
  if (supabaseUrl && supabaseKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/usuarios?limit=0`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
      });

      diagnostics.supabaseApi = {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      };

      if (!response.ok) {
        const text = await response.text();
        diagnostics.supabaseError = text.substring(0, 200);
      }
    } catch (error) {
      diagnostics.fetchError = error instanceof Error ? error.message : String(error);
    }
  }

  return new Response(JSON.stringify(diagnostics, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
