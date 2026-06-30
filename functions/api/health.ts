export const onRequest: PagesFunction = async (context) => {
  const supabaseUrl = context.env.SUPABASE_URL;
  const supabaseServiceKey = context.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = context.env.SUPABASE_ANON_KEY;
  const supabaseKey = supabaseServiceKey || supabaseAnonKey;

  return new Response(
    JSON.stringify({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      env: {
        SUPABASE_URL: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'NOT SET',
        SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? 'configured' : 'NOT SET',
        SUPABASE_ANON_KEY: supabaseAnonKey ? 'configured' : 'NOT SET',
        using: supabaseServiceKey ? 'service_role' : 'anon',
      }
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
};
