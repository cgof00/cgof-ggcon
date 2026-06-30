// GET /api/admin/logs — Logs de auditoria completos do sistema (somente admin)
// Parâmetros:
//   ?tipo=auditoria    — log de atribuições por admin (tabela log_atribuicoes)
//     &data_inicio=YYYY-MM-DD  — filtro de data início
//     &data_fim=YYYY-MM-DD     — filtro de data fim
//     &admin=<nome>            — filtro por admin
//   ?busca=<nome>      filtra por nome de técnico (atual OU histórico)
//   ?tipo=todos        todas as demandas com técnico atual + histórico
//   ?tipo=atribuicoes  (padrão) — registros com reatribuição (historico_atribuicoes != [])
//   ?tipo=paula        — registros atribuídos a qualquer "Paula"
//   ?limit=<n>         limite de registros (padrão 300, max 1000)
//   ?offset=<n>        paginação

function verifyToken(token: string): any {
  try {
    const payload = atob(token);
    const decoded = JSON.parse(payload);
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch { return null; }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const SUPABASE_URL = env.SUPABASE_URL as string;
  const KEY = env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!SUPABASE_URL || !KEY)
    return new Response(JSON.stringify({ error: 'Env não configurado' }), { status: 500, headers: CORS });

  // Auth: somente admin
  const auth = request.headers.get('Authorization') || '';
  const decoded = verifyToken(auth.replace('Bearer ', ''));
  if (!decoded)
    return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: CORS });
  if (decoded.role !== 'admin')
    return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403, headers: CORS });

  if (request.method !== 'GET')
    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405, headers: CORS });

  const url = new URL(request.url);
  const busca = (url.searchParams.get('busca') || '').trim();
  const tipo = url.searchParams.get('tipo') || 'atribuicoes';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '300'), 1000);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const SELECT = 'id,demanda,emenda,tecnico,conferencista,data_liberacao,situacao_analise_demanda,historico_atribuicoes,parlamentar,conveniado,regional';
  const headers = {
    'Authorization': 'Bearer ' + KEY,
    'apikey': KEY,
    'Content-Type': 'application/json',
    'Prefer': 'count=exact',
    'Range': `${offset}-${offset + limit - 1}`,
  };

  try {
    let params: string;

    // ── MODO AUDITORIA: consulta tabela log_atribuicoes ───────────────────────
    if (tipo === 'auditoria') {
      const dataInicio = (url.searchParams.get('data_inicio') || '').trim();
      const dataFim    = (url.searchParams.get('data_fim')    || '').trim();
      const adminFiltro = (url.searchParams.get('admin')      || '').trim();

      let auditParams = `select=*&order=criado_em.desc&limit=${limit}&offset=${offset}`;
      if (dataInicio) auditParams += `&criado_em=gte.${dataInicio}T00:00:00`;
      if (dataFim)    auditParams += `&criado_em=lte.${dataFim}T23:59:59`;
      if (adminFiltro) auditParams += `&admin_nome=ilike.${encodeURIComponent('%' + adminFiltro + '%')}`;

      const auditResp = await fetch(
        `${SUPABASE_URL}/rest/v1/log_atribuicoes?${auditParams}`,
        { headers }
      );

      // Se a tabela não existe ou está vazia, usa formalizacao como fallback
      const auditOk = auditResp.ok;
      const auditData: any[] = auditOk ? await auditResp.json() : [];

      if (auditOk && auditData.length > 0) {
        const contentRange = auditResp.headers.get('content-range');
        const total = contentRange ? parseInt(contentRange.split('/')[1] || '0') : auditData.length;
        return new Response(JSON.stringify({ registros: auditData, total, tipo: 'auditoria' }), { status: 200, headers: CORS });
      }

      // Fallback: lê formalizacao e agrupa por tecnico + data_liberacao
      // (mostra distribuição atual — não tem info de qual admin atribuiu, pois é dado histórico)
      let fzParams = `select=id,demanda,tecnico,data_liberacao,regional&tecnico=not.is.null&order=tecnico.asc,data_liberacao.asc&limit=2000`;
      const fzResp = await fetch(`${SUPABASE_URL}/rest/v1/formalizacao?${fzParams}`, { headers });
      const fzData: any[] = fzResp.ok ? await fzResp.json() : [];

      // Agrupa por data_liberacao + tecnico e constrói registros no formato de log_atribuicoes
      const groupMap = new Map<string, any>();
      for (const row of fzData) {
        const tecnico = row.tecnico || '(sem técnico)';
        const data = row.data_liberacao || '(sem data)';
        const key = `${data}||${tecnico}`;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            id: key,
            admin_nome: '(dados anteriores ao log)',
            admin_role: 'admin',
            acao: 'atribuir',
            tecnico_novo: tecnico,
            data_liberacao: data,
            criado_em: null,
            demandas: [],
            _legacy: true,
          });
        }
        groupMap.get(key).demandas.push(row.demanda || String(row.id));
      }

      const legacyRows = Array.from(groupMap.values()).map(g => ({
        ...g,
        demanda: g.demandas.join(', '),
        _count: g.demandas.length,
      }));

      return new Response(JSON.stringify({ registros: legacyRows, total: legacyRows.length, tipo: 'auditoria', _legacy: true }), { status: 200, headers: CORS });
    }

    if (busca) {
      // Busca por nome: retorna registros onde o técnico ATUAL contém a busca
      // OU onde o histórico (serializado) contém a busca
      // Usamos duas queries e mesclamos no servidor
      const buscaEnc = encodeURIComponent(`%${busca}%`);

      const [respCurrent, respHistory] = await Promise.all([
        fetch(
          `${SUPABASE_URL}/rest/v1/formalizacao?select=${SELECT}&tecnico=ilike.${buscaEnc}&order=data_liberacao.asc.nullslast,id.asc&limit=${limit}`,
          { headers }
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/formalizacao?select=${SELECT}&historico_atribuicoes=not.eq.%5B%5D&order=id.desc&limit=2000`,
          { headers }
        ),
      ]);

      const current: any[] = respCurrent.ok ? await respCurrent.json() : [];
      const withHistory: any[] = respHistory.ok ? await respHistory.json() : [];

      const buscaNorm = busca.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

      // Filtra registros do histórico que mencionam a busca
      const fromHistory = withHistory.filter(r => {
        if (!Array.isArray(r.historico_atribuicoes)) return false;
        return r.historico_atribuicoes.some((h: any) => {
          const t = ((h.tecnico || '') + ' ' + (h.conferencista || ''))
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
          return t.includes(buscaNorm);
        });
      });

      // Merge sem duplicatas
      const seen = new Set(current.map((r: any) => r.id));
      const merged = [...current];
      for (const r of fromHistory) {
        if (!seen.has(r.id)) { seen.add(r.id); merged.push(r); }
      }

      return new Response(JSON.stringify({
        registros: merged.slice(0, limit),
        total: merged.length,
        busca,
        tipo: 'busca',
      }), { status: 200, headers: CORS });
    }

    if (tipo === 'todos') {
      // Todos os registros — visão completa de todas as atribuições
      params = `select=${SELECT}&order=data_liberacao.asc.nullslast,id.asc`;
    } else if (tipo === 'paula') {
      // Todos registros com técnico contendo "paula"
      const buscaEnc = encodeURIComponent('%paula%');
      params = `select=${SELECT}&tecnico=ilike.${buscaEnc}&order=data_liberacao.asc.nullslast,id.asc`;
    } else {
      // Default: registros que têm histórico de reatribuição
      params = `select=${SELECT}&historico_atribuicoes=not.eq.%5B%5D&order=data_liberacao.asc.nullslast,id.asc`;
    }

    const resp = await fetch(`${SUPABASE_URL}/rest/v1/formalizacao?${params}`, { headers });
    if (!resp.ok) {
      const err = await resp.text();
      return new Response(JSON.stringify({ error: 'Supabase error', detail: err }), { status: 502, headers: CORS });
    }

    const data: any[] = await resp.json();
    const contentRange = resp.headers.get('content-range');
    const total = contentRange ? parseInt(contentRange.split('/')[1] || '0') : data.length;

    return new Response(JSON.stringify({ registros: data, total, tipo }), { status: 200, headers: CORS });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Erro interno', detail: e?.message }), { status: 500, headers: CORS });
  }
};
