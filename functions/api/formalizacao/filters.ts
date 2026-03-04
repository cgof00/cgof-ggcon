export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;

  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ 
      error: 'Variáveis de ambiente não configuradas' 
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // GET /api/formalizacao/filters
  if (request.method === 'GET') {
    try {
      console.log('🎨 GET /api/formalizacao/filters');

      // Valores padrão para filtros (sem análise complexa)
      const response = {
        ano: ['2023', '2024', '2025', '2026'],
        regional: ['Araçatuba', 'Bauru', 'Campinas', 'Grande São Paulo', 'Marília', 'Presidente Prudente', 'Ribeirão Preto', 'São José do Rio Preto', 'Sorocaba'],
        situacao_analise_demanda: ['Aprovado', 'Reprovado', 'Em análise', 'Pendente'],
        parlamentar: ['Bruno Zambelli', 'Marta Costa', 'Ricardo Madalena', 'Vitão do Cachorão'],
        partido: ['MDB', 'PP', 'PSD', 'Republicanos', 'PT']
      };

      console.log(`✅ Filtros básicos retornados`);

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e: any) {
      console.error('❌ ERRO:', e);
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
};
