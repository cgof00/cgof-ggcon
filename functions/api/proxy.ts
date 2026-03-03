export const onRequest: PagesFunction = async (context) => {
  const { request } = context;
  const url = new URL(request.url);

  // Pegar parâmetros
  const targetPath = url.searchParams.get('path') || '';
  const method = request.method;

  if (!targetPath) {
    return new Response(JSON.stringify({ error: 'path required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const SUPABASE_URL = 'https://dvziqqcgjuidtkhoeqdc.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2emlxY2dqdWlkdGtwaG9lcWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTY0MDEsImV4cCI6MjA4NzY5MjQwMX0.Ck6FSoE-Ol1Te8dZ9qc4T9gGLKXukR-JsN3oK0M3iWE';

  // Construir URL do Supabase
  const targetUrl = `${SUPABASE_URL}${targetPath}`;

  try {
    console.log('🔄 Proxy:', targetUrl.substring(0, 80));

    // Preparar headers
    const headers = new Headers();
    headers.set('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
    headers.set('apikey', SUPABASE_ANON_KEY);
    headers.set('Content-Type', 'application/json');

    // Fazer requisição
    const response = await fetch(targetUrl, {
      method,
      headers,
      body: method !== 'GET' && method !== 'HEAD' ? await request.text() : undefined,
    });

    // Preparar resposta com CORS
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    responseHeaders.set('Content-Type', 'application/json');

    // Ler body
    const body = await response.text();

    console.log('✅ Response:', response.status);

    return new Response(body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({
        error: 'Proxy error',
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
