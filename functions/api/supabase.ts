export const onRequest: PagesFunction = async (context) => {
  const { request } = context;
  const url = new URL(request.url);
  
  // Extrair path depois de /api/supabase/
  const pathMatch = url.pathname.match(/\/api\/supabase(.*)/);
  if (!pathMatch) {
    return new Response(JSON.stringify({ error: 'Invalid path' }), { status: 400 });
  }

  const proxyPath = pathMatch[1];
  const supabaseUrl = 'https://dvziqqcgjuidtkhoeqdc.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2emlxY2dqdWlkdGtpaG9lcWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTY0MDEsImV4cCI6MjA4NzY5MjQwMX0.Ck6FSoE-Ol1Te8dZ9qc4T9gGLKXukR-JsN3oK0M3iWE';

  // Construir URL do Supabase
  const supabaseRequestUrl = `${supabaseUrl}${proxyPath}${url.search}`;

  try {
    console.log('🔄 Proxying to:', supabaseRequestUrl.substring(0, 100));

    // Copiar headers e adicionar autenticação
    const headers = new Headers(request.headers);
    headers.set('Authorization', `Bearer ${supabaseAnonKey}`);
    headers.set('apikey', supabaseAnonKey);

    // Fazer requisição para Supabase
    const response = await fetch(supabaseRequestUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' ? await request.text() : undefined,
    });

    // Retornar resposta com CORS headers
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('❌ Proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Proxy failed', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
