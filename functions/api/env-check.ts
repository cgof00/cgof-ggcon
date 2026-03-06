export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;

  return new Response(JSON.stringify({
    status: 'environment-check',
    timestamp: new Date().toISOString(),
    environment_variables: {
      SUPABASE_URL: env.SUPABASE_URL ? '✅ Present' : '❌ Missing',
      SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY ? '✅ Present' : '❌ Missing',
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Present' : '❌ Missing'
    },
    all_env_keys: Object.keys(env),
    instructions: {
      if_missing: 'Variáveis precisam estar em wrangler.toml ou configuradas no Cloudflare Dashboard',
      wrangler_toml_location: 'A raiz do projeto',
      cloudflare_dashboard: 'Pages > Settings > Environment Variables'
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
