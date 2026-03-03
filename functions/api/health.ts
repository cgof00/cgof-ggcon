export const onRequest: PagesFunction = async (context) => {
  const supabaseUrl = context.env.SUPABASE_URL;
  const supabaseKey = context.env.SUPABASE_SERVICE_ROLE_KEY;

  return new Response(
    JSON.stringify({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      env: {
        SUPABASE_URL: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'NOT SET',
        SUPABASE_SERVICE_ROLE_KEY: supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'NOT SET',
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
