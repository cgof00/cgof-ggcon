var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/admin/usuarios/[id]/senha.ts
function verifyToken(token) {
  try {
    const payload = atob(token);
    const decoded = JSON.parse(payload);
    if (decoded.exp < Math.floor(Date.now() / 1e3)) return null;
    return decoded;
  } catch {
    return null;
  }
}
__name(verifyToken, "verifyToken");
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashPassword, "hashPassword");
var onRequest = /* @__PURE__ */ __name(async (context) => {
  const { request, env, params } = context;
  const id = params.id;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Vari\xE1veis de ambiente n\xE3o configuradas" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Token n\xE3o fornecido" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const decoded = verifyToken(authHeader.slice(7));
  if (!decoded) {
    return new Response(JSON.stringify({ error: "Token inv\xE1lido ou expirado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (decoded.role !== "admin") {
    return new Response(JSON.stringify({ error: "Acesso negado" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (request.method === "PUT") {
    try {
      const body = await request.json();
      const { senha } = body;
      if (!senha || senha.trim().length < 6) {
        return new Response(JSON.stringify({ error: "Senha deve ter no m\xEDnimo 6 caracteres" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      const senhaHash = await hashPassword(senha);
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/usuarios?id=eq.${id}&select=id,email,nome`,
        {
          method: "PATCH",
          headers: {
            "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
          },
          body: JSON.stringify({
            senha_hash: senhaHash,
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          })
        }
      );
      if (!resp.ok) {
        const err = await resp.text();
        return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
          status: resp.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      const data = await resp.json();
      const usuario = Array.isArray(data) ? data[0] : data;
      return new Response(JSON.stringify({
        success: true,
        message: `Senha alterada com sucesso para ${usuario?.email || "usu\xE1rio"}`
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" }
  });
}, "onRequest");

// api/admin/usuarios/[id].ts
function verifyToken2(token) {
  try {
    const payload = atob(token);
    const decoded = JSON.parse(payload);
    if (decoded.exp < Math.floor(Date.now() / 1e3)) return null;
    return decoded;
  } catch {
    return null;
  }
}
__name(verifyToken2, "verifyToken");
async function hashPassword2(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashPassword2, "hashPassword");
var onRequest2 = /* @__PURE__ */ __name(async (context) => {
  const { request, env, params } = context;
  const id = params.id;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Vari\xE1veis de ambiente n\xE3o configuradas" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Token n\xE3o fornecido" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const decoded = verifyToken2(authHeader.slice(7));
  if (!decoded) {
    return new Response(JSON.stringify({ error: "Token inv\xE1lido ou expirado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (decoded.role !== "admin") {
    return new Response(JSON.stringify({ error: "Acesso negado" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (request.method === "DELETE") {
    try {
      const body = await request.json();
      const { senha } = body;
      if (!senha) {
        return new Response(JSON.stringify({ error: "Senha \xE9 obrigat\xF3ria para deletar um usu\xE1rio" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      const adminResp = await fetch(
        `${SUPABASE_URL}/rest/v1/usuarios?id=eq.${decoded.id || decoded.userId}&select=senha_hash`,
        {
          headers: {
            "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json"
          }
        }
      );
      if (!adminResp.ok) {
        return new Response(JSON.stringify({ error: "Erro ao verificar credenciais" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      const adminData = await adminResp.json();
      const admin = Array.isArray(adminData) ? adminData[0] : adminData;
      if (!admin) {
        return new Response(JSON.stringify({ error: "Admin n\xE3o encontrado" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      const senhaHash = await hashPassword2(senha);
      if (senhaHash !== admin.senha_hash) {
        return new Response(JSON.stringify({ error: "Senha incorreta" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/usuarios?id=eq.${id}&select=id,email,nome,role,ativo`,
        {
          method: "PATCH",
          headers: {
            "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
          },
          body: JSON.stringify({ ativo: false, updated_at: (/* @__PURE__ */ new Date()).toISOString() })
        }
      );
      if (!resp.ok) {
        const err = await resp.text();
        return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
          status: resp.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      const data = await resp.json();
      const usuario = Array.isArray(data) ? data[0] : data;
      return new Response(JSON.stringify({ message: "Usu\xE1rio deletado com sucesso", usuario }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" }
  });
}, "onRequest");

// api/formalizacao/page/[pageNum].ts
var onRequest3 = /* @__PURE__ */ __name(async (context) => {
  const { request, env, params } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({
      error: "Vari\xE1veis de ambiente n\xE3o configuradas"
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  if (request.method === "GET") {
    try {
      const pageNum = parseInt(params.pageNum) || 0;
      const pageSize = 500;
      const offset = pageNum * pageSize;
      console.log(`\u{1F4C4} GET /api/formalizacao/page/${pageNum} (offset: ${offset}, size: ${pageSize})`);
      const dataResp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?order=created_at.desc&limit=${pageSize}&offset=${offset}`,
        {
          headers: {
            "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json"
          }
        }
      );
      if (!dataResp.ok) {
        const err = await dataResp.text();
        return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
          status: dataResp.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      const data = await dataResp.json();
      const countResp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?select=id`,
        {
          headers: {
            "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
            "Prefer": "count=exact"
          }
        }
      );
      let total = 0;
      if (countResp.ok) {
        const contentRange = countResp.headers.get("content-range");
        if (contentRange) {
          const parts = contentRange.split("/");
          total = parseInt(parts[1]) || 0;
        }
      }
      console.log(`\u2705 P\xE1gina ${pageNum}: ${data?.length || 0} registros`);
      return new Response(JSON.stringify({
        data: Array.isArray(data) ? data : [],
        total,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      console.error("\u274C ERRO:", e);
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" }
  });
}, "onRequest");

// api/admin/backup-formalizacao.ts
var onRequest4 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: "Vari\xE1veis de ambiente n\xE3o configuradas" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/backup_formalizacao`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: "{}"
    });
    const text = await resp.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!resp.ok) {
      const message = data && (data.message || data.error) ? String(data.message || data.error) : text || resp.statusText;
      const hint = message.includes("backup_formalizacao") ? "RPC n\xE3o encontrada. Execute o SQL em sql/BACKUP_FORMALIZACAO.sql no Supabase antes de prosseguir." : void 0;
      console.error("\u274C Erro backup-formalizacao:", message);
      return new Response(JSON.stringify({ error: message, hint }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    console.log(`\u2705 Backup da formalizacao criado: ${data?.rows ?? "?"} registros`);
    return new Response(JSON.stringify({
      success: true,
      rows: data?.rows ?? 0,
      timestamp: data?.timestamp ?? (/* @__PURE__ */ new Date()).toISOString(),
      message: `Backup conclu\xEDdo: ${data?.rows ?? 0} registros salvos em formalizacao_backup`
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("\u274C Erro backup-formalizacao:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequest");

// api/admin/import-emendas.ts
var onRequest5 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: "Vari\xE1veis de ambiente n\xE3o configuradas" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const body = await request.json();
    let records = body.records;
    if (!Array.isArray(records) || records.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum registro enviado" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const validRecords = records.filter((r) => r.codigo_num && String(r.codigo_num).trim() !== "");
    const deduped = /* @__PURE__ */ new Map();
    for (const rec of validRecords) {
      const key = String(rec.codigo_num).trim();
      deduped.set(key, rec);
    }
    const finalRecords = Array.from(deduped.values());
    if (finalRecords.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum registro v\xE1lido ap\xF3s valida\xE7\xE3o (codigo_num vazio)" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    console.log(`\u{1F4E5} Import Emendas: ${records.length} original \u2192 ${finalRecords.length} ap\xF3s deduplica\xE7\xE3o local`);
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/emendas?on_conflict=codigo_num`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "apikey": SUPABASE_KEY,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates,return=minimal"
        },
        body: JSON.stringify(finalRecords)
      }
    );
    if (!resp.ok) {
      const err = await resp.text();
      console.error("\u274C Erro upsert emendas:", err.substring(0, 500));
      if (err.includes("duplicate") || err.includes("unique")) {
        console.log("\u26A0\uFE0F Detectado erro de unicidade - tentando estrat\xE9gia fallback...");
        return new Response(JSON.stringify({
          error: "Erro de integridade: Existe uma constraint UNIQUE n\xE3o tratada. Verifique o schema da tabela.",
          details: err.substring(0, 200)
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ error: err.substring(0, 300) }), {
        status: resp.status,
        headers: { "Content-Type": "application/json" }
      });
    }
    console.log(`\u2705 UPSERT bem-sucedido: ${finalRecords.length} emendas processadas`);
    return new Response(JSON.stringify({
      success: true,
      imported: finalRecords.length,
      deduped: records.length - finalRecords.length,
      message: `${finalRecords.length} emendas importadas (${records.length - finalRecords.length} duplicadas)`
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("\u274C Erro import-emendas:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequest");

// api/admin/import-formalizacao.ts
var onRequest6 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: "Vari\xE1veis de ambiente n\xE3o configuradas" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const body = await request.json();
    const { records, mode } = body;
    if (!Array.isArray(records) || records.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum registro enviado" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const validColumns = [
      "seq",
      "ano",
      "parlamentar",
      "partido",
      "emenda",
      "emendas_agregadoras",
      "demanda",
      "demandas_formalizacao",
      "numero_convenio",
      "classificacao_emenda_demanda",
      "tipo_formalizacao",
      "regional",
      "municipio",
      "conveniado",
      "objeto",
      "portfolio",
      "valor",
      "posicao_anterior",
      "situacao_demandas_sempapel",
      "area_estagio",
      "recurso",
      "tecnico",
      "data_liberacao",
      "area_estagio_situacao_demanda",
      "situacao_analise_demanda",
      "data_analise_demanda",
      "motivo_retorno_diligencia",
      "data_retorno_diligencia",
      "conferencista",
      "data_recebimento_demanda",
      "data_retorno",
      "observacao_motivo_retorno",
      "data_liberacao_assinatura_conferencista",
      "data_liberacao_assinatura",
      "falta_assinatura",
      "assinatura",
      "publicacao",
      "vigencia",
      "encaminhado_em",
      "concluida_em"
    ];
    const filteredRecords = records.map((item) => {
      const filtered = {};
      for (const [key, val] of Object.entries(item)) {
        if (!validColumns.includes(key)) continue;
        if (val === void 0 || val === null || val === "") continue;
        if (key === "valor") {
          const cleanVal = String(val).replace(/\s/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
          const parsed = parseFloat(cleanVal);
          filtered[key] = isNaN(parsed) ? 0 : parsed;
        } else {
          filtered[key] = String(val).trim();
        }
      }
      return filtered;
    }).filter((r) => Object.keys(r).length > 0);
    if (mode === "replace") {
      const delResp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?id=gt.0`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "apikey": SUPABASE_KEY,
            "Prefer": "return=minimal"
          }
        }
      );
      if (!delResp.ok) {
        const err = await delResp.text();
        return new Response(JSON.stringify({ error: `Erro ao apagar registros: ${err.substring(0, 300)}` }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
      console.log("Todos os registros antigos apagados");
    }
    const insertResp = await fetch(
      `${SUPABASE_URL}/rest/v1/formalizacao`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "apikey": SUPABASE_KEY,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify(filteredRecords)
      }
    );
    if (!insertResp.ok) {
      const err = await insertResp.text();
      return new Response(JSON.stringify({ error: err.substring(0, 300) }), {
        status: insertResp.status,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({
      count: filteredRecords.length,
      total: filteredRecords.length,
      errors: errors.length > 0 ? errors : void 0,
      message: mode === "replace" ? `Tabela substitu\xEDda: ${totalInserted} registros importados` : `${totalInserted} novos registros adicionados`
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("Erro import-formalizacao:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequest");

// api/admin/setup-sync.ts
var onRequest7 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const headers = {
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "apikey": SUPABASE_KEY,
      "Content-Type": "application/json"
    };
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

  RAISE NOTICE '\xDAltimo c\xF3digo importado: %', COALESCE(v_ultimo_codigo, '[NENHUM]');

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
    console.log("\u{1F527} Criando fun\xE7\xE3o sync_incremental()...");
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: sqlCreateFunction })
    });
    if (!resp.ok && resp.status !== 404) {
      const err = await resp.text();
      console.error("Erro ao executar SQL:", err);
    }
    const testResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sync_incremental`, {
      method: "POST",
      headers,
      body: "{}"
    });
    if (testResp.ok) {
      const result = await testResp.json();
      return new Response(JSON.stringify({
        success: true,
        message: "\u2705 Fun\xE7\xE3o sync_incremental() EXISTE e funciona!",
        result
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: "\u274C Fun\xE7\xE3o sync_incremental() N\xC3O EXISTE no banco",
        error: `Status: ${testResp.status}`,
        instruction: "Voc\xEA PRECISA executar o SQL manualmente no Supabase SQL Editor"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  } catch (e) {
    console.error("Erro setup:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequest");

// api/admin/sync-emendas.ts
var onRequest8 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: "Vari\xE1veis de ambiente n\xE3o configuradas" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
  const headers = {
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "apikey": SUPABASE_KEY,
    "Content-Type": "application/json"
  };
  async function callBatch(p_offset, p_limit) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 24e3);
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sync_emendas_formalizacao_batch`, {
      method: "POST",
      headers,
      body: JSON.stringify({ p_offset, p_limit }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(err.substring(0, 400));
    }
    return resp.json();
  }
  __name(callBatch, "callBatch");
  try {
    let p_offset = 0;
    let p_limit = 5e3;
    try {
      const body = await request.json();
      if (typeof body?.offset === "number") p_offset = body.offset;
      if (typeof body?.limit === "number") p_limit = body.limit;
    } catch {
    }
    console.log(`\u{1F504} Sync batch: offset=${p_offset}, limit=${p_limit}`);
    const result = await callBatch(p_offset, p_limit);
    console.log("\u2705 Batch conclu\xEDdo:", result);
    let emendasCleaned = false;
    if (!result?.has_more) {
      try {
        const truncResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/truncate_emendas_staging`, {
          method: "POST",
          headers,
          body: "{}"
        });
        if (truncResp.ok) {
          emendasCleaned = true;
          console.log("\u{1F9F9} Staging truncado ap\xF3s \xFAltimo lote (espa\xE7o liberado)");
        } else {
          const deleteResp = await fetch(`${SUPABASE_URL}/rest/v1/emendas?id=gte.0`, {
            method: "DELETE",
            headers: { ...headers, "Prefer": "return=minimal" }
          });
          if (deleteResp.ok) emendasCleaned = true;
        }
      } catch (cleanErr) {
        console.warn("\u26A0\uFE0F Erro ao limpar staging:", cleanErr.message);
      }
    }
    return new Response(JSON.stringify({
      success: true,
      result: {
        updated: result?.updated || 0,
        inserted: result?.inserted || 0,
        staging_count: result?.total || 0,
        has_more: result?.has_more ?? false,
        offset: result?.offset ?? p_offset,
        limit: result?.limit ?? p_limit,
        total: result?.total || 0,
        formalizacao_count: result?.formalizacao_count ?? null,
        emendas_cleaned: emendasCleaned
      }
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("\u274C Erro sync-emendas:", e);
    const isTimeout = e?.name === "AbortError" || (e?.message || "").includes("aborted");
    const errorMsg = isTimeout ? "Timeout no lote de sincroniza\xE7\xE3o (>24s). Tente reduzir o tamanho do lote." : e.message;
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequest");

// api/admin/update-area-estagio.ts
var onRequest9 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: "Vari\xE1veis de ambiente n\xE3o configuradas" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
  const authHeader = request.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "N\xE3o autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const headers = {
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "apikey": SUPABASE_KEY,
    "Content-Type": "application/json"
  };
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55e3);
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/update_area_estagio_from_sempapel`, {
      method: "POST",
      headers,
      body: "{}",
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(err.substring(0, 400));
    }
    const result = await resp.json();
    console.log("\u2705 PROCX area_estagio:", result);
    return new Response(JSON.stringify({
      success: true,
      updated: result?.updated || 0,
      message: result?.message || "Conclu\xEDdo"
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("\u274C Erro update-area-estagio:", e);
    const isTimeout = e?.name === "AbortError" || (e?.message || "").includes("aborted");
    return new Response(JSON.stringify({
      error: isTimeout ? "Timeout (>55s). Execute SELECT update_area_estagio_from_sempapel() diretamente no Supabase SQL Editor." : e.message
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}, "onRequest");

// api/admin/update-formalizacao-campos.ts
var onRequest10 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  const YEARS = [2023, 2024, 2025, 2026];
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: "Vari\xE1veis de ambiente n\xE3o configuradas" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const body = await request.json();
    const { records } = body;
    if (!Array.isArray(records) || records.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum registro enviado" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const rpcResp = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/update_formalizacao_campos_batch`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "apikey": SUPABASE_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ records, years: YEARS })
      }
    );
    const text = await rpcResp.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!rpcResp.ok) {
      const message = data && (data.message || data.error) ? String(data.message || data.error) : text || rpcResp.statusText;
      const hint = message.includes("update_formalizacao_campos_batch") ? "RPC n\xE3o encontrada (ou schema cache desatualizado). No Supabase, execute o SQL em sql/RPC_UPDATE_FORMALIZACAO_CAMPOS_BATCH.sql e depois rode: select pg_notify('pgrst', 'reload schema'); (ou aguarde 1\u20132 min) e tente novamente." : void 0;
      return new Response(JSON.stringify({ error: message, hint }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({
      updated: data?.updated || 0,
      notFound: data?.notFound || 0,
      skippedYear: data?.skippedYear || 0,
      total: data?.total ?? records.length,
      filtered: data?.filtered,
      years: data?.years || YEARS,
      message: `${data?.updated || 0} registros atualizados | ${data?.notFound || 0} emendas n\xE3o encontradas | ${data?.skippedYear || 0} fora de ${YEARS.join(", ")}`
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("Erro update-formalizacao-campos:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequest");

// api/admin/usuarios.ts
function verifyToken3(token) {
  try {
    const payload = atob(token);
    const decoded = JSON.parse(payload);
    if (decoded.exp < Math.floor(Date.now() / 1e3)) return null;
    return decoded;
  } catch {
    return null;
  }
}
__name(verifyToken3, "verifyToken");
async function hashPassword3(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashPassword3, "hashPassword");
var onRequest11 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Vari\xE1veis de ambiente n\xE3o configuradas" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Token n\xE3o fornecido" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const decoded = verifyToken3(authHeader.slice(7));
  if (!decoded) {
    return new Response(JSON.stringify({ error: "Token inv\xE1lido ou expirado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (decoded.role !== "admin") {
    return new Response(JSON.stringify({ error: "Acesso negado" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (request.method === "POST") {
    try {
      const body = await request.json();
      const { email, nome, role, senha } = body;
      if (!email || !nome) {
        return new Response(JSON.stringify({ error: "Email e nome s\xE3o obrigat\xF3rios" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (role && !["admin", "usuario"].includes(role)) {
        return new Response(JSON.stringify({ error: "Role inv\xE1lido - deve ser 'admin' ou 'usuario'" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      let senhaTemp = senha;
      if (!senhaTemp) {
        senhaTemp = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 3).toUpperCase() + Math.random().toString(36).substring(2, 3).toUpperCase();
      }
      const senhaHash = await hashPassword3(senhaTemp);
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          nome,
          role: role || "usuario",
          senha_hash: senhaHash,
          ativo: true,
          created_at: (/* @__PURE__ */ new Date()).toISOString(),
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        })
      });
      if (!resp.ok) {
        const err = await resp.text();
        if (err.includes("duplicate") || err.includes("unique")) {
          return new Response(JSON.stringify({ error: "Este email j\xE1 est\xE1 cadastrado" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
          status: resp.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      const data = await resp.json();
      const usuario = Array.isArray(data) ? data[0] : data;
      return new Response(JSON.stringify({
        usuario,
        senhaTemporaria: senhaTemp,
        aviso: !senha ? "Compartilhe a senha tempor\xE1ria com o usu\xE1rio." : "Usu\xE1rio criado com a senha fornecida."
      }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" }
  });
}, "onRequest");

// api/auth/change-password.ts
function verifyToken4(token) {
  try {
    const payload = atob(token);
    const decoded = JSON.parse(payload);
    if (decoded.exp < Math.floor(Date.now() / 1e3)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}
__name(verifyToken4, "verifyToken");
async function hashPassword4(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashPassword4, "hashPassword");
var onRequest12 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type"
      }
    });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Token n\xE3o fornecido" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const token = authHeader.slice(7);
  const decoded = verifyToken4(token);
  if (!decoded) {
    return new Response(JSON.stringify({ error: "Token inv\xE1lido ou expirado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body inv\xE1lido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const { senhaAtual, novaSenha } = body;
  if (!senhaAtual || !novaSenha) {
    return new Response(JSON.stringify({ error: "Senha atual e nova senha s\xE3o obrigat\xF3rias" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (novaSenha.trim().length < 6) {
    return new Response(JSON.stringify({ error: "Nova senha deve ter no m\xEDnimo 6 caracteres" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: "Configura\xE7\xE3o do servidor incompleta" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  const userId = decoded.id ?? decoded.userId;
  if (!userId) {
    return new Response(JSON.stringify({ error: "Token inv\xE1lido: sem ID de usu\xE1rio" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const fetchResp = await fetch(
    `${supabaseUrl}/rest/v1/usuarios?id=eq.${userId}&select=id,senha_hash`,
    {
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "apikey": supabaseKey,
        "Content-Type": "application/json"
      }
    }
  );
  if (!fetchResp.ok) {
    const errText = await fetchResp.text();
    console.error("\u274C Supabase fetch error:", fetchResp.status, errText);
    return new Response(JSON.stringify({ error: "Erro ao buscar usu\xE1rio" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  const users = await fetchResp.json();
  if (!Array.isArray(users) || users.length === 0) {
    return new Response(JSON.stringify({ error: "Usu\xE1rio n\xE3o encontrado" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  const user = users[0];
  const hashAtual = await hashPassword4(senhaAtual);
  if (hashAtual !== user.senha_hash) {
    return new Response(JSON.stringify({ error: "Senha atual incorreta" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const novoHash = await hashPassword4(novaSenha);
  const updateResp = await fetch(
    `${supabaseUrl}/rest/v1/usuarios?id=eq.${userId}`,
    {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "apikey": supabaseKey,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        senha_hash: novoHash,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      })
    }
  );
  if (!updateResp.ok) {
    const errText = await updateResp.text();
    console.error("\u274C Supabase update error:", updateResp.status, errText);
    return new Response(JSON.stringify({ error: "Erro ao atualizar senha" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  console.log(`\u2705 Senha alterada para userId=${userId}`);
  return new Response(JSON.stringify({ message: "Senha alterada com sucesso" }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}, "onRequest");

// api/auth/login.ts
var onRequest13 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  console.log("DEBUG: env keys =", Object.keys(env));
  console.log("DEBUG: SUPABASE_URL =", env.SUPABASE_URL ? "defined" : "undefined");
  console.log("DEBUG: SUPABASE_SERVICE_ROLE_KEY =", env.SUPABASE_SERVICE_ROLE_KEY ? "defined" : "undefined");
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("\u274C Missing env variables");
    return new Response(JSON.stringify({
      error: "Vari\xE1veis de ambiente n\xE3o configuradas no Cloudflare",
      debug: {
        SUPABASE_URL: SUPABASE_URL ? "present" : "MISSING",
        SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY ? "present" : "MISSING",
        env_keys: Object.keys(env)
      }
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  async function hashPassword5(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
  }
  __name(hashPassword5, "hashPassword");
  if (request.method === "GET" && url.pathname === "/api/auth/ping") {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (request.method === "POST" && url.pathname === "/api/auth/login") {
    try {
      const body = await request.json();
      const email = body.email || "";
      const senha = body.senha || "";
      if (!email || !senha) {
        return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      const emailLower = email.toLowerCase();
      const hashCalc = await hashPassword5(senha);
      console.log(`\u{1F510} Login attempt: ${email}`);
      console.log(`   Hash calculado: ${hashCalc}`);
      const resp = await fetch(SUPABASE_URL + "/rest/v1/usuarios?select=*", {
        headers: {
          "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json"
        }
      });
      if (!resp.ok) {
        const errText = await resp.text();
        console.error(`\u274C Supabase error: ${resp.status}`);
        return new Response(JSON.stringify({
          error: `API error: ${errText.substring(0, 200)}`
        }), { status: resp.status, headers: { "Content-Type": "application/json" } });
      }
      const users = await resp.json();
      const user = Array.isArray(users) ? users.find((u) => u.email && u.email.toLowerCase() === emailLower) : null;
      if (!user) {
        console.log("\u274C User not found");
        return new Response(JSON.stringify({ error: "Email ou senha incorretos" }), { status: 401, headers: { "Content-Type": "application/json" } });
      }
      console.log(`\u2713 User found: ${user.email}`);
      console.log(`   Hash armazenado: ${user.senha_hash}`);
      if (hashCalc !== user.senha_hash) {
        console.log("\u274C Hash mismatch");
        return new Response(JSON.stringify({ error: "Email ou senha incorretos" }), { status: 401, headers: { "Content-Type": "application/json" } });
      }
      console.log(`\u2705 Login successful for ${user.email}`);
      const token = btoa(JSON.stringify({
        id: user.id,
        email: user.email,
        role: user.role,
        exp: Math.floor(Date.now() / 1e3) + 86400
      }));
      return new Response(JSON.stringify({
        token,
        user: { id: user.id, email: user.email, nome: user.nome, role: user.role }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      console.error("\u274C Exception:", e);
      return new Response(JSON.stringify({ error: `Exception: ${e.message}` }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
  return new Response("Not found", { status: 404 });
}, "onRequest");

// api/auth/me.ts
function verifyToken5(token) {
  try {
    let payload;
    if (typeof Buffer !== "undefined") {
      payload = Buffer.from(token, "base64").toString("utf-8");
    } else {
      payload = atob(token);
    }
    const decoded = JSON.parse(payload);
    if (decoded.exp < Math.floor(Date.now() / 1e3)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}
__name(verifyToken5, "verifyToken");
var onRequest14 = /* @__PURE__ */ __name(async (context) => {
  const { request } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization"
      }
    });
  }
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Token n\xE3o fornecido" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.slice(7);
    const decoded = verifyToken5(token);
    if (!decoded) {
      return new Response(
        JSON.stringify({ error: "Token inv\xE1lido ou expirado" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const supabaseUrl = context.env.SUPABASE_URL;
    const supabaseKey = context.env.SUPABASE_ANON_KEY || context.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Configura\xE7\xE3o do servidor incompleta" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    const queryUrl = `${supabaseUrl}/rest/v1/usuarios?id=eq.${decoded.id}&select=id,email,nome,role,ativo`;
    const response = await fetch(queryUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("\u274C Supabase API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar usu\xE1rio" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    const usuarios = await response.json();
    if (!Array.isArray(usuarios) || usuarios.length === 0) {
      return new Response(
        JSON.stringify({ error: "Usu\xE1rio n\xE3o encontrado" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const usuario = usuarios[0];
    if (!usuario.ativo) {
      return new Response(
        JSON.stringify({ error: "Usu\xE1rio inativo" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({
        user: {
          id: usuario.id,
          email: usuario.email,
          nome: usuario.nome,
          role: usuario.role
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  } catch (error) {
    console.error("\u274C Auth check error:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao validar sess\xE3o" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}, "onRequest");

// api/cache/refresh.ts
var onRequest15 = /* @__PURE__ */ __name(async (context) => {
  const { request } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  return new Response(JSON.stringify({
    success: true,
    message: "Cache refresh n\xE3o necess\xE1rio no Cloudflare (client-side cache)"
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}, "onRequest");

// api/debug/status.ts
var onRequest16 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({
      error: "Vari\xE1veis de ambiente n\xE3o configuradas",
      env_keys: Object.keys(env)
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  try {
    const testResp = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?select=count()&limit=1`, {
      headers: {
        "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json"
      }
    });
    const userTest = await testResp.text();
    const formalResp = await fetch(`${SUPABASE_URL}/rest/v1/formalizacao?select=id&limit=1`, {
      headers: {
        "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
        "Prefer": "count=exact"
      }
    });
    const contentRange = formalResp.headers.get("content-range");
    let formalCount = 0;
    if (contentRange) {
      const parts = contentRange.split("/");
      formalCount = parseInt(parts[1]) || 0;
    }
    return new Response(JSON.stringify({
      status: "OK",
      supabase_url: SUPABASE_URL ? "\u2713" : "\u2717",
      supabase_key: SUPABASE_SERVICE_ROLE_KEY ? "\u2713" : "\u2717",
      usuarios_response: userTest.substring(0, 500),
      usuarios_status: testResp.status,
      formalizacao_count: formalCount,
      endpoints: {
        login: "POST /api/auth/login",
        usuarios: "GET /api/usuarios",
        formalizacao: "GET /api/formalizacao",
        tecnicos: "GET /api/formalizacao/tecnicos"
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: e.message,
      stack: e.stack
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}, "onRequest");

// api/debug/warmup-cache.ts
var onRequest17 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL || "https://dvziqcgjuidtkihoeqdc.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2emlxY2dqdWlkdGtwaG9lcWRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjExNjQwMSwiZXhwIjoyMDg3NjkyNDAxfQ.bAgun92X0530xUXg_Wa5hrCAkLL-P8O44usT8o2_Mr8";
  if (request.method === "POST") {
    try {
      const startTime = Date.now();
      const countResp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?select=id`,
        {
          headers: {
            "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
            "Prefer": "count=exact"
          }
        }
      );
      let recordCount = 0;
      if (countResp.ok) {
        const countHeader = countResp.headers.get("content-range");
        if (countHeader) {
          const parts = countHeader.split("/");
          recordCount = parseInt(parts[1]) || 0;
        }
      }
      if (recordCount > 0) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/formalizacao?select=*&limit=100&order=created_at.desc`,
          {
            headers: {
              "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
              "apikey": SUPABASE_SERVICE_ROLE_KEY,
              "Content-Type": "application/json"
            }
          }
        );
      }
      const durationMs = Date.now() - startTime;
      return new Response(JSON.stringify({
        status: "success",
        records: recordCount,
        durationMs
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
  return new Response("Method not allowed", { status: 405 });
}, "onRequest");

// api/formalizacao/atribuir-conferencista.ts
var onRequest18 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Vari\xE1veis de ambiente n\xE3o configuradas" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const body = await request.json();
    const { ids, usuario_id, data_recebimento_demanda } = body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return new Response(JSON.stringify({ error: "IDs n\xE3o s\xE3o v\xE1lidos" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const validIds = ids.filter((id) => {
      const num = parseInt(id, 10);
      return !isNaN(num) && num > 0;
    });
    if (validIds.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum ID v\xE1lido fornecido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (!usuario_id) {
      return new Response(JSON.stringify({ error: "ID do usu\xE1rio inv\xE1lido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (!data_recebimento_demanda || !/^\d{4}-\d{2}-\d{2}$/.test(data_recebimento_demanda)) {
      return new Response(JSON.stringify({ error: "Data em formato inv\xE1lido (use YYYY-MM-DD)" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const userResp = await fetch(
      `${SUPABASE_URL}/rest/v1/usuarios?select=id,nome,email&id=eq.${usuario_id}`,
      {
        headers: {
          "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json"
        }
      }
    );
    if (!userResp.ok) {
      return new Response(JSON.stringify({ error: "Erro ao buscar conferencista" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const usuarios = await userResp.json();
    if (!usuarios || usuarios.length === 0) {
      return new Response(JSON.stringify({ error: "Conferencista n\xE3o encontrado" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const conferencista = usuarios[0];
    const idsFilter = validIds.map((id) => `${id}`).join(",");
    const updateResp = await fetch(
      `${SUPABASE_URL}/rest/v1/formalizacao?id=in.(${idsFilter})`,
      {
        method: "PATCH",
        headers: {
          "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          conferencista: conferencista.nome,
          data_recebimento_demanda,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        })
      }
    );
    if (!updateResp.ok) {
      const err = await updateResp.text();
      return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const updatedData = await updateResp.json();
    return new Response(JSON.stringify({
      message: "Conferencista atribu\xEDdo com sucesso",
      updated: updatedData?.length || 0,
      conferencista: conferencista.nome,
      updatedRecords: updatedData || [],
      success: true
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("\u274C ERRO:", e);
    return new Response(JSON.stringify({ error: e.message, success: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequest");

// api/formalizacao/atribuir-tecnico.ts
var onRequest19 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Vari\xE1veis de ambiente n\xE3o configuradas" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const body = await request.json();
    const { ids, usuario_id, data_liberacao } = body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return new Response(JSON.stringify({ error: "IDs n\xE3o s\xE3o v\xE1lidos" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const validIds = ids.filter((id) => {
      const num = parseInt(id, 10);
      return !isNaN(num) && num > 0;
    });
    if (validIds.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum ID v\xE1lido fornecido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (!usuario_id) {
      return new Response(JSON.stringify({ error: "ID do usu\xE1rio inv\xE1lido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (!data_liberacao || !/^\d{4}-\d{2}-\d{2}$/.test(data_liberacao)) {
      return new Response(JSON.stringify({ error: "Data em formato inv\xE1lido (use YYYY-MM-DD)" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const userResp = await fetch(
      `${SUPABASE_URL}/rest/v1/usuarios?select=id,nome,email&id=eq.${usuario_id}`,
      {
        headers: {
          "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json"
        }
      }
    );
    if (!userResp.ok) {
      return new Response(JSON.stringify({ error: "Erro ao buscar t\xE9cnico" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const usuarios = await userResp.json();
    if (!usuarios || usuarios.length === 0) {
      return new Response(JSON.stringify({ error: "T\xE9cnico n\xE3o encontrado" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const tecnico = usuarios[0];
    const idsFilter = validIds.map((id) => `${id}`).join(",");
    const updateResp = await fetch(
      `${SUPABASE_URL}/rest/v1/formalizacao?id=in.(${idsFilter})`,
      {
        method: "PATCH",
        headers: {
          "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          tecnico: tecnico.nome,
          usuario_atribuido_id: usuario_id,
          data_liberacao,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        })
      }
    );
    if (!updateResp.ok) {
      const err = await updateResp.text();
      return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const updatedData = await updateResp.json();
    return new Response(JSON.stringify({
      message: "T\xE9cnico atribu\xEDdo com sucesso",
      updated: updatedData?.length || 0,
      tecnico: tecnico.nome,
      updatedRecords: updatedData || [],
      success: true
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("\u274C ERRO:", e);
    return new Response(JSON.stringify({ error: e.message, success: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequest");

// api/formalizacao/filters.ts
var onRequest20 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({
      error: "Vari\xE1veis de ambiente n\xE3o configuradas"
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  if (request.method === "GET") {
    try {
      console.log("\u{1F3A8} GET /api/formalizacao/filters");
      const response = {
        ano: ["2023", "2024", "2025", "2026"],
        regional: ["Ara\xE7atuba", "Bauru", "Campinas", "Grande S\xE3o Paulo", "Mar\xEDlia", "Presidente Prudente", "Ribeir\xE3o Preto", "S\xE3o Jos\xE9 do Rio Preto", "Sorocaba"],
        situacao_analise_demanda: ["Aprovado", "Reprovado", "Em an\xE1lise", "Pendente"],
        parlamentar: ["Bruno Zambelli", "Marta Costa", "Ricardo Madalena", "Vit\xE3o do Cachor\xE3o"],
        partido: ["MDB", "PP", "PSD", "Republicanos", "PT"]
      };
      console.log(`\u2705 Filtros b\xE1sicos retornados`);
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      console.error("\u274C ERRO:", e);
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" }
  });
}, "onRequest");

// api/formalizacao/filters-cascata.ts
var SUPABASE_MAX_LIMIT = 1e3;
async function fetchAllRecordsForFilters(supabaseUrl, serviceRoleKey, fields, totalExpected = 37352) {
  const BATCH_SIZE = SUPABASE_MAX_LIMIT;
  const numBatches = Math.ceil(totalExpected / BATCH_SIZE);
  const fieldsList = fields.join(",");
  console.log(`\u{1F504} Fetching ${totalExpected} records para filtros em ${numBatches} batches...`);
  const promises = [];
  for (let i = 0; i < numBatches; i++) {
    const offset = i * BATCH_SIZE;
    promises.push(
      fetch(
        `${supabaseUrl}/rest/v1/formalizacao?select=${fieldsList}&order=id.asc&limit=${BATCH_SIZE}&offset=${offset}`,
        {
          headers: {
            "Authorization": "Bearer " + serviceRoleKey,
            "apikey": serviceRoleKey,
            "Content-Type": "application/json"
          }
        }
      ).then(async (resp) => {
        if (!resp.ok) {
          const err = await resp.text();
          console.error(`\u274C Batch ${i} failed:`, err.substring(0, 100));
          return [];
        }
        const data = await resp.json();
        console.log(`\u2705 Batch ${i} (offset ${offset}): ${Array.isArray(data) ? data.length : 0} registros`);
        return Array.isArray(data) ? data : [];
      })
    );
  }
  const batches = await Promise.all(promises);
  const allRecords = batches.flat();
  console.log(`\u{1F389} Total de registros carregados para filtros: ${allRecords.length}`);
  return allRecords;
}
__name(fetchAllRecordsForFilters, "fetchAllRecordsForFilters");
var onRequest21 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({
      error: "Vari\xE1veis de ambiente n\xE3o configuradas"
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  const url = new URL(request.url);
  if (request.method === "GET") {
    try {
      console.log("\u{1F3A8} GET /api/formalizacao/filters-cascata");
      const startTime = Date.now();
      const validFilterFields = [
        "ano",
        "demandas_formalizacao",
        "area_estagio",
        "recurso",
        "tecnico",
        "situacao_analise_demanda",
        "area_estagio_situacao_demanda",
        "conferencista",
        "falta_assinatura",
        "publicacao",
        "vigencia",
        "parlamentar",
        "partido",
        "regional",
        "municipio",
        "conveniado",
        "objeto",
        "data_liberacao",
        "data_analise_demanda",
        "data_recebimento_demanda",
        "data_retorno",
        "encaminhado_em",
        "concluida_em"
      ];
      const records = await fetchAllRecordsForFilters(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, validFilterFields);
      const result = {};
      const filterMaps = /* @__PURE__ */ new Map();
      for (const campo of validFilterFields) {
        filterMaps.set(campo, /* @__PURE__ */ new Set());
      }
      if (Array.isArray(records)) {
        for (const record of records) {
          for (const campo of validFilterFields) {
            const valor = record[campo];
            if (valor && String(valor).trim() !== "" && String(valor) !== "\u2014") {
              filterMaps.get(campo)?.add(String(valor).trim());
            }
          }
        }
      }
      for (const [campo, valoresSet] of filterMaps) {
        result[campo] = Array.from(valoresSet).sort();
      }
      const duration = Date.now() - startTime;
      console.log(`\u2705 Filtros prontos em ${duration}ms com ${Object.keys(result).length} campos`);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      console.error("\u274C ERRO:", e);
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" }
  });
}, "onRequest");

// api/formalizacao/liberar-assinatura.ts
var onRequest22 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Vari\xE1veis de ambiente n\xE3o configuradas" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const body = await request.json();
    const { ids, data_liberacao_assinatura } = body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return new Response(JSON.stringify({ error: "IDs n\xE3o s\xE3o v\xE1lidos" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const validIds = ids.filter((id) => {
      const num = parseInt(id, 10);
      return !isNaN(num) && num > 0;
    });
    if (validIds.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum ID v\xE1lido fornecido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (!data_liberacao_assinatura || !/^\d{4}-\d{2}-\d{2}$/.test(data_liberacao_assinatura)) {
      return new Response(JSON.stringify({ error: "Data em formato inv\xE1lido (use YYYY-MM-DD)" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const idsFilter = validIds.map((id) => `${id}`).join(",");
    const updateResp = await fetch(
      `${SUPABASE_URL}/rest/v1/formalizacao?id=in.(${idsFilter})`,
      {
        method: "PATCH",
        headers: {
          "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          data_liberacao_assinatura,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        })
      }
    );
    if (!updateResp.ok) {
      const err = await updateResp.text();
      return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const updatedData = await updateResp.json();
    return new Response(JSON.stringify({
      message: "Registros liberados para assinatura com sucesso",
      updated: updatedData?.length || 0,
      updatedRecords: updatedData || [],
      success: true
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("\u274C ERRO liberar-assinatura:", e);
    return new Response(JSON.stringify({ error: e.message, success: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequest");

// api/formalizacao/remover-conferencista.ts
var onRequest23 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Vari\xE1veis de ambiente n\xE3o configuradas" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const body = await request.json();
    const { ids } = body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return new Response(JSON.stringify({ error: "IDs n\xE3o s\xE3o v\xE1lidos" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const validIds = ids.filter((id) => {
      const num = parseInt(id, 10);
      return !isNaN(num) && num > 0;
    });
    if (validIds.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum ID v\xE1lido fornecido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const idsFilter = validIds.map((id) => `${id}`).join(",");
    const updateResp = await fetch(
      `${SUPABASE_URL}/rest/v1/formalizacao?id=in.(${idsFilter})`,
      {
        method: "PATCH",
        headers: {
          "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          conferencista: null,
          data_recebimento_demanda: null,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        })
      }
    );
    if (!updateResp.ok) {
      const err = await updateResp.text();
      return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const updatedData = await updateResp.json();
    return new Response(JSON.stringify({
      message: "Atribui\xE7\xE3o de conferencista removida com sucesso",
      updated: updatedData?.length || 0,
      success: true
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("\u274C ERRO:", e);
    return new Response(JSON.stringify({ error: e.message, success: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequest");

// api/formalizacao/remover-tecnico.ts
var onRequest24 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Vari\xE1veis de ambiente n\xE3o configuradas" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const body = await request.json();
    const { ids } = body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return new Response(JSON.stringify({ error: "IDs n\xE3o s\xE3o v\xE1lidos" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const validIds = ids.filter((id) => {
      const num = parseInt(id, 10);
      return !isNaN(num) && num > 0;
    });
    if (validIds.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum ID v\xE1lido fornecido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const idsFilter = validIds.map((id) => `${id}`).join(",");
    const updateResp = await fetch(
      `${SUPABASE_URL}/rest/v1/formalizacao?id=in.(${idsFilter})`,
      {
        method: "PATCH",
        headers: {
          "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          tecnico: null,
          usuario_atribuido_id: null,
          data_liberacao: null,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        })
      }
    );
    if (!updateResp.ok) {
      const err = await updateResp.text();
      return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const updatedData = await updateResp.json();
    return new Response(JSON.stringify({
      message: "Atribui\xE7\xE3o removida com sucesso",
      updated: updatedData?.length || 0,
      success: true
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("\u274C ERRO:", e);
    return new Response(JSON.stringify({ error: e.message, success: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequest");

// api/formalizacao/search.ts
var onRequest25 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({
      error: "Vari\xE1veis de ambiente n\xE3o configuradas"
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  if (request.method === "GET") {
    try {
      const search = url.searchParams.get("q") || "";
      const pageParam = url.searchParams.get("page") || "0";
      const limitParam = url.searchParams.get("limit") || "100";
      const page = parseInt(pageParam);
      const limit = parseInt(limitParam);
      const offset = page * limit;
      console.log(`\u{1F50D} GET /api/formalizacao/search - q: "${search}", page: ${page}`);
      let query = `/rest/v1/formalizacao?order=created_at.desc&limit=${limit}&offset=${offset}`;
      if (search) {
        const searchFilter = `or=(parlamentar.ilike.*${search}*,conveniado.ilike.*${search}*,objeto.ilike.*${search}*)`;
        query = `/rest/v1/formalizacao?${searchFilter}&order=created_at.desc&limit=${limit}&offset=${offset}`;
      }
      const dataResp = await fetch(SUPABASE_URL + query, {
        headers: {
          "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json"
        }
      });
      if (!dataResp.ok) {
        const err = await dataResp.text();
        return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
          status: dataResp.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      const data = await dataResp.json();
      const countQuery = search ? `/rest/v1/formalizacao?${`or=(parlamentar.ilike.*${search}*,conveniado.ilike.*${search}*,objeto.ilike.*${search}*)`}&select=id` : `/rest/v1/formalizacao?select=id`;
      const countResp = await fetch(SUPABASE_URL + countQuery, {
        headers: {
          "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
          "Prefer": "count=exact"
        }
      });
      let total = 0;
      if (countResp.ok) {
        const contentRange = countResp.headers.get("content-range");
        if (contentRange) {
          const parts = contentRange.split("/");
          total = parseInt(parts[1]) || 0;
        }
      }
      console.log(`\u2705 ${data?.length || 0} registros encontrados de ${total}`);
      return new Response(JSON.stringify({
        data: Array.isArray(data) ? data : [],
        total,
        page,
        limit,
        search
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      console.error("\u274C ERRO:", e);
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" }
  });
}, "onRequest");

// api/formalizacao/tecnicos.ts
var onRequest26 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({
      error: "Vari\xE1veis de ambiente n\xE3o configuradas"
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  if (request.method === "GET") {
    try {
      console.log("\u{1F50D} GET /api/formalizacao/tecnicos");
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/usuarios?select=id,nome,email,role&ativo=eq.true&order=nome.asc`,
        {
          headers: {
            "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json"
          }
        }
      );
      if (!resp.ok) {
        const err = await resp.text();
        console.error(`\u274C Supabase error: ${resp.status} - ${err.substring(0, 200)}`);
        return new Response(JSON.stringify({ error: `Supabase error: ${err.substring(0, 200)}` }), {
          status: resp.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      const data = await resp.json();
      console.log(`\u2705 ${data?.length || 0} t\xE9cnicos encontrados`);
      return new Response(JSON.stringify({
        tecnicos: Array.isArray(data) ? data : []
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      console.error("\u274C ERRO:", e);
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
  return new Response("Method not allowed", { status: 405 });
}, "onRequest");

// api/formalizacao/[id].ts
var onRequest27 = /* @__PURE__ */ __name(async (context) => {
  const { request, env, params } = context;
  const id = params.id;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Vari\xE1veis de ambiente n\xE3o configuradas" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId) || parsedId <= 0) {
    return new Response(JSON.stringify({ error: "ID inv\xE1lido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (request.method === "PUT") {
    try {
      const body = await request.json();
      delete body["id"];
      delete body["created_at"];
      const cleanBody = {};
      for (const [key, value] of Object.entries(body)) {
        if (value === "" || value === null || value === void 0) {
          cleanBody[key] = null;
        } else {
          cleanBody[key] = value;
        }
      }
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?id=eq.${parsedId}`,
        {
          method: "PATCH",
          headers: {
            "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
          },
          body: JSON.stringify(cleanBody)
        }
      );
      if (!resp.ok) {
        const err = await resp.text();
        console.error(`\u274C Supabase PATCH error: ${resp.status} - ${err.substring(0, 300)}`);
        return new Response(JSON.stringify({ error: "Erro ao atualizar registro", details: err.substring(0, 200) }), {
          status: resp.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      const updated = await resp.json();
      console.log(`\u2705 Registro ${parsedId} atualizado`);
      return new Response(JSON.stringify(Array.isArray(updated) ? updated[0] : updated), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      console.error("\u274C ERRO PUT:", e);
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (request.method === "DELETE") {
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?id=eq.${parsedId}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json"
          }
        }
      );
      if (!resp.ok) {
        const err = await resp.text();
        return new Response(JSON.stringify({ error: "Erro ao deletar registro" }), {
          status: resp.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (request.method === "GET") {
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?id=eq.${parsedId}&limit=1`,
        {
          headers: {
            "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json"
          }
        }
      );
      if (!resp.ok) {
        return new Response(JSON.stringify({ error: "Erro ao buscar registro" }), {
          status: resp.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      const data = await resp.json();
      if (!Array.isArray(data) || data.length === 0) {
        return new Response(JSON.stringify({ error: "Registro n\xE3o encontrado" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify(data[0]), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" }
  });
}, "onRequest");

// api/usuarios/[id].ts
function verifyToken6(token) {
  try {
    const payload = atob(token);
    const decoded = JSON.parse(payload);
    if (decoded.exp < Math.floor(Date.now() / 1e3)) return null;
    return decoded;
  } catch {
    return null;
  }
}
__name(verifyToken6, "verifyToken");
var onRequest28 = /* @__PURE__ */ __name(async (context) => {
  const { request, env, params } = context;
  const id = params.id;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Vari\xE1veis de ambiente n\xE3o configuradas" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Token n\xE3o fornecido" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const decoded = verifyToken6(authHeader.slice(7));
  if (!decoded) {
    return new Response(JSON.stringify({ error: "Token inv\xE1lido ou expirado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (decoded.role !== "admin") {
    return new Response(JSON.stringify({ error: "Acesso negado" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (request.method === "PUT") {
    try {
      const body = await request.json();
      const { role, ativo, nome, email } = body;
      console.log(`\u270F\uFE0F PUT /api/usuarios/${id} - Updates:`, { role, ativo, nome, email });
      const updateData = {
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (role !== void 0) updateData.role = role;
      if (ativo !== void 0) updateData.ativo = ativo;
      if (nome !== void 0) updateData.nome = nome;
      if (email !== void 0) updateData.email = email.toLowerCase().trim();
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/usuarios?id=eq.${id}&select=id,email,nome,role,ativo,created_at,updated_at`,
        {
          method: "PATCH",
          headers: {
            "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
          },
          body: JSON.stringify(updateData)
        }
      );
      if (!resp.ok) {
        const err = await resp.text();
        console.error("\u274C Erro Supabase:", err);
        return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
          status: resp.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      const data = await resp.json();
      const usuario = Array.isArray(data) ? data[0] : data;
      console.log(`\u2705 Usu\xE1rio ${id} atualizado`);
      return new Response(JSON.stringify({ success: true, usuario }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      console.error("\u274C ERRO PUT:", e);
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" }
  });
}, "onRequest");

// api/diagnose.ts
var onRequest29 = /* @__PURE__ */ __name(async (context) => {
  const supabaseUrl = context.env.SUPABASE_URL;
  const supabaseServiceKey = context.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = context.env.SUPABASE_ANON_KEY;
  const supabaseKey = supabaseAnonKey || supabaseServiceKey;
  const diagnostics = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    env: {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasAnonKey: !!supabaseAnonKey,
      usingKey: supabaseAnonKey ? "anon" : "service_role",
      // Show which is being used
      urlLength: supabaseUrl?.length || 0,
      keyLength: supabaseKey?.length || 0,
      urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 40) : "NOT SET",
      keyPrefix: supabaseKey ? supabaseKey.substring(0, 20) : "NOT SET"
    }
  };
  if (supabaseUrl && supabaseKey) {
    try {
      console.log("Testing Supabase API without auth...");
      const noAuthResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      diagnostics.noAuthTest = {
        status: noAuthResponse.status,
        ok: noAuthResponse.ok
      };
      console.log("Testing Supabase API with auth...");
      const authResponse = await fetch(`${supabaseUrl}/rest/v1/usuarios?limit=0`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json"
        }
      });
      diagnostics.authTest = {
        status: authResponse.status,
        statusText: authResponse.statusText,
        ok: authResponse.ok
      };
      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        diagnostics.error = errorText;
        try {
          diagnostics.errorJson = JSON.parse(errorText);
        } catch {
          diagnostics.errorRaw = errorText.substring(0, 500);
        }
      } else {
        diagnostics.success = "\u2705 Supabase API responding correctly!";
      }
      console.log("Testing usuarios table...");
      const queryUrl = `${supabaseUrl}/rest/v1/usuarios?select=id,email&limit=1`;
      const tableResponse = await fetch(queryUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json"
        }
      });
      diagnostics.tableTest = {
        status: tableResponse.status,
        ok: tableResponse.ok
      };
      if (tableResponse.ok) {
        diagnostics.tableData = await tableResponse.json();
      } else {
        const text = await tableResponse.text();
        diagnostics.tableError = text.substring(0, 300);
      }
    } catch (error) {
      diagnostics.fetchError = error instanceof Error ? error.message : String(error);
    }
  }
  return new Response(JSON.stringify(diagnostics, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}, "onRequest");

// api/env-check.ts
var onRequest30 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  return new Response(JSON.stringify({
    status: "environment-check",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    environment_variables: {
      SUPABASE_URL: env.SUPABASE_URL ? "\u2705 Present" : "\u274C Missing",
      SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY ? "\u2705 Present" : "\u274C Missing",
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY ? "\u2705 Present" : "\u274C Missing"
    },
    all_env_keys: Object.keys(env),
    instructions: {
      if_missing: "Vari\xE1veis precisam estar em wrangler.toml ou configuradas no Cloudflare Dashboard",
      wrangler_toml_location: "A raiz do projeto",
      cloudflare_dashboard: "Pages > Settings > Environment Variables"
    }
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}, "onRequest");

// api/formalizacao.ts
var onRequest31 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Vari\xE1veis de ambiente n\xE3o configuradas" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  if (request.method === "GET") {
    try {
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "1000"), 5e4);
      const offset = parseInt(url.searchParams.get("offset") || "0");
      console.log(`\u{1F4E5} GET /api/formalizacao - limit=${limit}, offset=${offset}`);
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/formalizacao?select=*&order=id.asc`,
        {
          headers: {
            "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
            "Range": `${offset}-${offset + limit - 1}`,
            "Prefer": "count=exact"
          }
        }
      );
      if (!resp.ok && resp.status !== 206) {
        const err = await resp.text();
        console.error(`\u274C Supabase error: ${resp.status} - ${err.substring(0, 200)}`);
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      const data = await resp.json();
      console.log(`\u2705 Retornados: ${Array.isArray(data) ? data.length : 0} registros de formalizacao`);
      return new Response(JSON.stringify(Array.isArray(data) ? data : []), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      console.error("\u274C ERRO:", e);
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" }
  });
}, "onRequest");

// api/health.ts
var onRequest32 = /* @__PURE__ */ __name(async (context) => {
  const supabaseUrl = context.env.SUPABASE_URL;
  const supabaseServiceKey = context.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = context.env.SUPABASE_ANON_KEY;
  const supabaseKey = supabaseServiceKey || supabaseAnonKey;
  return new Response(
    JSON.stringify({
      status: "OK",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      env: {
        SUPABASE_URL: supabaseUrl ? supabaseUrl.substring(0, 30) + "..." : "NOT SET",
        SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? "configured" : "NOT SET",
        SUPABASE_ANON_KEY: supabaseAnonKey ? "configured" : "NOT SET",
        using: supabaseServiceKey ? "service_role" : "anon"
      }
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    }
  );
}, "onRequest");

// api/usuarios.ts
function verifyToken7(token) {
  try {
    const payload = atob(token);
    const decoded = JSON.parse(payload);
    if (decoded.exp < Math.floor(Date.now() / 1e3)) return null;
    return decoded;
  } catch {
    return null;
  }
}
__name(verifyToken7, "verifyToken");
var onRequest33 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({
      error: "Vari\xE1veis de ambiente n\xE3o configuradas"
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Token n\xE3o fornecido" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const decoded = verifyToken7(authHeader.slice(7));
  if (!decoded) {
    return new Response(JSON.stringify({ error: "Token inv\xE1lido ou expirado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (decoded.role !== "admin") {
    return new Response(JSON.stringify({ error: "Acesso negado" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (request.method === "GET") {
    try {
      console.log("\u{1F465} GET /api/usuarios");
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/usuarios?select=id,email,nome,role,ativo,created_at,updated_at&order=created_at.desc`,
        {
          headers: {
            "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json"
          }
        }
      );
      if (!resp.ok) {
        const err = await resp.text();
        return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
          status: resp.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      const data = await resp.json();
      console.log(`\u2705 ${data?.length || 0} usu\xE1rios encontrados`);
      return new Response(JSON.stringify(Array.isArray(data) ? data : []), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      console.error("\u274C ERRO:", e);
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (request.method === "POST") {
    try {
      const body = await request.json();
      const { email, nome, role, ativo } = body;
      if (!email || !nome) {
        return new Response(JSON.stringify({ error: "Email e nome s\xE3o obrigat\xF3rios" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      console.log(`\u{1F4DD} POST /api/usuarios - email: ${email}`);
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/usuarios`,
        {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email,
            nome,
            role: role || "usuario",
            ativo: ativo !== false,
            senha_hash: ""
            // Será definida depois
          })
        }
      );
      if (!resp.ok) {
        const err = await resp.text();
        return new Response(JSON.stringify({ error: err.substring(0, 200) }), {
          status: resp.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      const data = await resp.json();
      console.log(`\u2705 Usu\xE1rio criado: ${email}`);
      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      console.error("\u274C ERRO:", e);
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" }
  });
}, "onRequest");

// ../.wrangler/tmp/pages-3NwTEN/functionsRoutes-0.4830172019252381.mjs
var routes = [
  {
    routePath: "/api/admin/usuarios/:id/senha",
    mountPath: "/api/admin/usuarios/:id",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/api/admin/usuarios/:id",
    mountPath: "/api/admin/usuarios",
    method: "",
    middlewares: [],
    modules: [onRequest2]
  },
  {
    routePath: "/api/formalizacao/page/:pageNum",
    mountPath: "/api/formalizacao/page",
    method: "",
    middlewares: [],
    modules: [onRequest3]
  },
  {
    routePath: "/api/admin/backup-formalizacao",
    mountPath: "/api/admin",
    method: "",
    middlewares: [],
    modules: [onRequest4]
  },
  {
    routePath: "/api/admin/import-emendas",
    mountPath: "/api/admin",
    method: "",
    middlewares: [],
    modules: [onRequest5]
  },
  {
    routePath: "/api/admin/import-formalizacao",
    mountPath: "/api/admin",
    method: "",
    middlewares: [],
    modules: [onRequest6]
  },
  {
    routePath: "/api/admin/setup-sync",
    mountPath: "/api/admin",
    method: "",
    middlewares: [],
    modules: [onRequest7]
  },
  {
    routePath: "/api/admin/sync-emendas",
    mountPath: "/api/admin",
    method: "",
    middlewares: [],
    modules: [onRequest8]
  },
  {
    routePath: "/api/admin/update-area-estagio",
    mountPath: "/api/admin",
    method: "",
    middlewares: [],
    modules: [onRequest9]
  },
  {
    routePath: "/api/admin/update-formalizacao-campos",
    mountPath: "/api/admin",
    method: "",
    middlewares: [],
    modules: [onRequest10]
  },
  {
    routePath: "/api/admin/usuarios",
    mountPath: "/api/admin",
    method: "",
    middlewares: [],
    modules: [onRequest11]
  },
  {
    routePath: "/api/auth/change-password",
    mountPath: "/api/auth",
    method: "",
    middlewares: [],
    modules: [onRequest12]
  },
  {
    routePath: "/api/auth/login",
    mountPath: "/api/auth",
    method: "",
    middlewares: [],
    modules: [onRequest13]
  },
  {
    routePath: "/api/auth/me",
    mountPath: "/api/auth",
    method: "",
    middlewares: [],
    modules: [onRequest14]
  },
  {
    routePath: "/api/cache/refresh",
    mountPath: "/api/cache",
    method: "",
    middlewares: [],
    modules: [onRequest15]
  },
  {
    routePath: "/api/debug/status",
    mountPath: "/api/debug",
    method: "",
    middlewares: [],
    modules: [onRequest16]
  },
  {
    routePath: "/api/debug/warmup-cache",
    mountPath: "/api/debug",
    method: "",
    middlewares: [],
    modules: [onRequest17]
  },
  {
    routePath: "/api/formalizacao/atribuir-conferencista",
    mountPath: "/api/formalizacao",
    method: "",
    middlewares: [],
    modules: [onRequest18]
  },
  {
    routePath: "/api/formalizacao/atribuir-tecnico",
    mountPath: "/api/formalizacao",
    method: "",
    middlewares: [],
    modules: [onRequest19]
  },
  {
    routePath: "/api/formalizacao/filters",
    mountPath: "/api/formalizacao",
    method: "",
    middlewares: [],
    modules: [onRequest20]
  },
  {
    routePath: "/api/formalizacao/filters-cascata",
    mountPath: "/api/formalizacao",
    method: "",
    middlewares: [],
    modules: [onRequest21]
  },
  {
    routePath: "/api/formalizacao/liberar-assinatura",
    mountPath: "/api/formalizacao",
    method: "",
    middlewares: [],
    modules: [onRequest22]
  },
  {
    routePath: "/api/formalizacao/remover-conferencista",
    mountPath: "/api/formalizacao",
    method: "",
    middlewares: [],
    modules: [onRequest23]
  },
  {
    routePath: "/api/formalizacao/remover-tecnico",
    mountPath: "/api/formalizacao",
    method: "",
    middlewares: [],
    modules: [onRequest24]
  },
  {
    routePath: "/api/formalizacao/search",
    mountPath: "/api/formalizacao",
    method: "",
    middlewares: [],
    modules: [onRequest25]
  },
  {
    routePath: "/api/formalizacao/tecnicos",
    mountPath: "/api/formalizacao",
    method: "",
    middlewares: [],
    modules: [onRequest26]
  },
  {
    routePath: "/api/formalizacao/:id",
    mountPath: "/api/formalizacao",
    method: "",
    middlewares: [],
    modules: [onRequest27]
  },
  {
    routePath: "/api/usuarios/:id",
    mountPath: "/api/usuarios",
    method: "",
    middlewares: [],
    modules: [onRequest28]
  },
  {
    routePath: "/api/diagnose",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest29]
  },
  {
    routePath: "/api/env-check",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest30]
  },
  {
    routePath: "/api/formalizacao",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest31]
  },
  {
    routePath: "/api/health",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest32]
  },
  {
    routePath: "/api/usuarios",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest33]
  }
];

// ../../../AppData/Roaming/npm/node_modules/wrangler/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../AppData/Roaming/npm/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
