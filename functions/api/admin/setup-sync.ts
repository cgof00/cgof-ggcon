// POST /api/admin/setup-sync
// Cria automaticamente a função sync_incremental() no banco
// Chame isso UMA VEZ para preparar a função

export const onRequest = async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const headers = {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json'
    };

    // SQL PARA CRIAR A FUNÇÃO
    const sqlCreateFunction = `
DROP FUNCTION IF EXISTS sync_incremental() CASCADE;

CREATE OR REPLACE FUNCTION sync_incremental()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET statement_timeout = '120s'
AS $$
DECLARE 
  v_ultimo_codigo VARCHAR := '';
  v_inserted INTEGER := 0;
BEGIN
  SELECT COALESCE(emenda, '') INTO v_ultimo_codigo
  FROM formalizacao
  ORDER BY id DESC
  LIMIT 1;

  RAISE NOTICE 'Último código importado: %', COALESCE(v_ultimo_codigo, '[NENHUM]');

  WITH novas_emendas AS (
    INSERT INTO formalizacao (
      ano, parlamentar, partido, emenda, demanda,
      classificacao_emenda_demanda, emendas_agregadoras,
      situacao_demandas_sempapel, numero_convenio, regional,
      municipio, conveniado, objeto, portfolio, valor
    )
    SELECT
      TRIM(COALESCE(e.ano_refer, '')),
      TRIM(COALESCE(e.parlamentar, '')),
      TRIM(COALESCE(e.partido, '')),
      TRIM(COALESCE(e.codigo_num, '')),
      TRIM(COALESCE(e.detalhes, '')),
      TRIM(REGEXP_REPLACE(COALESCE(e.natureza,''), E'[\\\\x00-\\\\x1F\\\\x7F\\\\xA0]', '', 'g')),
      TRIM(COALESCE(e.num_emenda, '')),
      TRIM(COALESCE(e.situacao_d, '')),
      TRIM(COALESCE(e.num_convenio, '')),
      TRIM(COALESCE(e.regional, '')),
      TRIM(COALESCE(e.municipio, '')),
      TRIM(COALESCE(e.beneficiario, '')),
      TRIM(COALESCE(e.objeto, '')),
      TRIM(COALESCE(e.portfolio, '')),
      COALESCE(e.valor, 0)
    FROM emendas e
    WHERE TRIM(COALESCE(e.codigo_num, '')) > v_ultimo_codigo
      AND e.codigo_num IS NOT NULL
      AND TRIM(e.codigo_num) != ''
    ORDER BY e.codigo_num ASC
    RETURNING id
  )
  SELECT COUNT(*) INTO v_inserted FROM novas_emendas;

  RAISE NOTICE 'Emendas inseridas: %', v_inserted;

  RETURN json_build_object(
    'status', 'success',
    'inserted', v_inserted,
    'ultimo_codigo', v_ultimo_codigo,
    'message', CASE 
      WHEN v_inserted = 0 THEN 'Nenhuma emenda nova para sincronizar'
      WHEN v_inserted = 1 THEN '1 nova emenda foi sincronizada'
      ELSE v_inserted || ' novas emendas foram sincronizadas'
    END
  );
END;
$$;
    `;

    console.log('🔧 Criando função sync_incremental()...');

    // Usar RPC do Supabase para executar SQL custom
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: sqlCreateFunction })
    });

    if (!resp.ok && resp.status !== 404) {
      const err = await resp.text();
      console.error('Erro ao executar SQL:', err);
    }

    // Alternativa: Usar SQL direto via manager (pode não funcionar)
    // Vou tentar outra abordagem - criar via query simples
    
    // Teste se a função existe
    const testResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sync_incremental`, {
      method: 'POST',
      headers,
      body: '{}'
    });

    if (testResp.ok) {
      const result = await testResp.json();
      return new Response(JSON.stringify({
        success: true,
        message: '✅ Função sync_incremental() EXISTE e funciona!',
        result: result
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: '❌ Função sync_incremental() NÃO EXISTE no banco',
        error: `Status: ${testResp.status}`,
        instruction: 'Você PRECISA executar o SQL manualmente no Supabase SQL Editor'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (e: any) {
    console.error('Erro setup:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};
