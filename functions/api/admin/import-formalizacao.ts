// POST /api/admin/import-formalizacao
// Importa formalização via CSV - modo replace (apaga tudo e reinsere) ou append (só adiciona)
// Cada invocação recebe um batch do frontend (max 200 registros) = máx 2 subrequests
export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: 'Variáveis de ambiente não configuradas' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json() as { records: any[]; mode?: string };
    const { records, mode } = body;

    if (!Array.isArray(records) || records.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum registro enviado' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const validColumns = [
      "seq", "ano", "parlamentar", "partido", "emenda", "emendas_agregadoras", "demanda",
      "demandas_formalizacao", "numero_convenio", "classificacao_emenda_demanda", "tipo_formalizacao",
      "regional", "municipio", "conveniado", "objeto", "portfolio", "valor",
      "posicao_anterior", "situacao_demandas_sempapel", "area_estagio", "recurso", "tecnico",
      "data_liberacao", "area_estagio_situacao_demanda", "situacao_analise_demanda", "data_analise_demanda",
      "motivo_retorno_diligencia", "data_retorno_diligencia", "conferencista",
      "data_recebimento_demanda", "data_retorno", "observacao_motivo_retorno", "data_liberacao_assinatura_conferencista",
      "data_liberacao_assinatura", "falta_assinatura", "assinatura", "publicacao",
      "vigencia", "encaminhado_em", "concluida_em"
    ];

    // Filtrar e validar campos
    const filteredRecords = records.map((item: any) => {
      const filtered: any = {};
      for (const [key, val] of Object.entries(item)) {
        if (!validColumns.includes(key)) continue;
        if (val === undefined || val === null || val === '') continue;
        if (key === 'valor') {
          const cleanVal = String(val).replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
          const parsed = parseFloat(cleanVal);
          filtered[key] = isNaN(parsed) ? 0 : parsed;
        } else {
          filtered[key] = String(val).trim();
        }
      }
      return filtered;
    }).filter((r: any) => Object.keys(r).length > 0);

    // Se modo replace, apagar TODOS os registros com uma única chamada
    if (mode === 'replace') {
      const delResp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?id=gt.0`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'apikey': SUPABASE_KEY,
            'Prefer': 'return=minimal'
          }
        }
      );
      if (!delResp.ok) {
        const err = await delResp.text();
        return new Response(JSON.stringify({ error: `Erro ao apagar registros: ${err.substring(0, 300)}` }), {
          status: 500, headers: { 'Content-Type': 'application/json' }
        });
      }
      console.log('Todos os registros antigos apagados');
    }

    // Inserir o batch recebido em uma única chamada
    const insertResp = await fetch(
      `${SUPABASE_URL}/rest/v1/formalizacao`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(filteredRecords)
      }
    );

    if (!insertResp.ok) {
      const err = await insertResp.text();
      return new Response(JSON.stringify({ error: err.substring(0, 300) }), {
        status: insertResp.status, headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      count: filteredRecords.length,
      total: filteredRecords.length,
      errors: errors.length > 0 ? errors : undefined,
      message: mode === 'replace'
        ? `Tabela substituída: ${totalInserted} registros importados`
        : `${totalInserted} novos registros adicionados`
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    console.error('Erro import-formalizacao:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};
