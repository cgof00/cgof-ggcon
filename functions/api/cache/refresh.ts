export const onRequest: PagesFunction = async (context) => {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  // No-op on Cloudflare: client handles its own cache
  return new Response(JSON.stringify({
    success: true,
    message: 'Cache refresh não necessário no Cloudflare (client-side cache)'
  }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
};
