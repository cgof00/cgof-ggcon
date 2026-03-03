export const onRequest: PagesFunction = async (context) => {
  const supabaseUrl = context.env.SUPABASE_URL;
  const supabaseKey = context.env.SUPABASE_SERVICE_ROLE_KEY;

  const diagnostics: any = {
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
      // Test 1: Health check without auth
      console.log('Testing Supabase API without auth...');
      const noAuthResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      diagnostics.noAuthTest = {
        status: noAuthResponse.status,
        ok: noAuthResponse.ok,
      };

      // Test 2: With auth
      console.log('Testing Supabase API with auth...');
      const authResponse = await fetch(`${supabaseUrl}/rest/v1/usuarios?limit=0`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
        },
      });

      diagnostics.authTest = {
        status: authResponse.status,
        statusText: authResponse.statusText,
        ok: authResponse.ok,
        headers: Object.fromEntries(
          Array.from(authResponse.headers.entries()).map(([k, v]) => [
            k,
            k.toLowerCase().includes('auth') || k.toLowerCase().includes('key') 
              ? '***' 
              : v
          ])
        ),
      };

      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        diagnostics.error = errorText;
        diagnostics.errorLength = errorText.length;
        
        // Try to parse as JSON
        try {
          diagnostics.errorJson = JSON.parse(errorText);
        } catch {
          diagnostics.errorRaw = errorText.substring(0, 500);
        }
      }

      // Test 3: Try to query with specific format
      console.log('Testing usuarios table...');
      const queryUrl = `${supabaseUrl}/rest/v1/usuarios?select=id,email`;
      console.log('Query URL:', queryUrl);
      
      const tableResponse = await fetch(queryUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
      });

      diagnostics.tableTest = {
        status: tableResponse.status,
        ok: tableResponse.ok,
      };

      if (!tableResponse.ok) {
        const text = await tableResponse.text();
        diagnostics.tableError = text.substring(0, 300);
      }
    } catch (error) {
      diagnostics.fetchError = error instanceof Error ? error.message : String(error);
      diagnostics.fetchStack = error instanceof Error ? error.stack?.substring(0, 300) : undefined;
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
