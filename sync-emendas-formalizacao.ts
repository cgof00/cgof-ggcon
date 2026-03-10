/**
 * Script standalone para sincronizar emendas → formalização via numero_convenio.
 * Uso: npx tsx sync-emendas-formalizacao.ts
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

process.on('unhandledRejection', (reason: any) => {
  console.error('⚠ Unhandled rejection:', reason?.message || reason);
});

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("❌ Supabase vars missing"); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log("🔄 Sincronizando emendas → formalização (via nº convênio)...\n");

  // 1. Buscar todas as formalizações com numero_convenio
  console.log("📥 Buscando formalizações com numero_convenio...");
  const allFormalizacoes: any[] = [];
  let fOffset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("formalizacao")
      .select("id, numero_convenio, emenda")
      .not("numero_convenio", "is", null)
      .range(fOffset, fOffset + 999);
    if (error) { console.error("Erro:", error.message); break; }
    if (!data || data.length === 0) break;
    allFormalizacoes.push(...data);
    if (data.length < 1000) break;
    fOffset += 1000;
  }
  console.log(`   ${allFormalizacoes.length} formalizações com numero_convenio`);

  // Criar mapa numero_convenio → formalizacao_ids
  const fMap = new Map<string, number[]>();
  for (const f of allFormalizacoes) {
    const key = f.numero_convenio ? String(f.numero_convenio).trim() : '';
    if (!key) continue;
    if (!fMap.has(key)) fMap.set(key, []);
    fMap.get(key)!.push(f.id);
  }
  const convenioKeys = [...fMap.keys()];
  console.log(`   ${convenioKeys.length} números de convênio únicos\n`);

  // 2. Buscar emendas que correspondem
  console.log("📥 Buscando emendas correspondentes...");
  let updated = 0;
  let notFound = 0;
  const errors: string[] = [];

  for (let i = 0; i < convenioKeys.length; i += 50) {
    const batch = convenioKeys.slice(i, i + 50);
    
    try {
    let emendas: any[] | null = null;
    for (let retry = 0; retry < 3; retry++) {
      const { data, error: eErr } = await supabase
        .from("emendas")
        .select("*")
        .in("num_convenio", batch);
      if (eErr) { 
        console.error(`   ⚠ Erro batch ${Math.floor(i/100)+1} (tentativa ${retry+1}/3): ${eErr.message}`);
        if (retry < 2) await new Promise(r => setTimeout(r, 3000));
        else errors.push(eErr.message);
      } else {
        emendas = data;
        break;
      }
    }
    if (!emendas) continue;

    const emendaMap = new Map<string, any>();
    for (const e of emendas) {
      if (e.num_convenio) emendaMap.set(String(e.num_convenio).trim(), e);
    }

    for (const conv of batch) {
      const emenda = emendaMap.get(conv);
      if (!emenda) { notFound++; continue; }

      const fIds = fMap.get(conv);
      if (!fIds) continue;

      const updateData: any = {};
      if (emenda.detalhes) updateData.demanda = emenda.detalhes;
      if (emenda.natureza) updateData.classificacao_emenda_demanda = emenda.natureza;
      if (emenda.ano_refer) updateData.ano = emenda.ano_refer;
      if (emenda.num_emenda) updateData.emendas_agregadoras = emenda.num_emenda;
      if (emenda.situacao_d) updateData.situacao_demandas_sempapel = emenda.situacao_d;
      if (emenda.parlamentar) updateData.parlamentar = emenda.parlamentar;
      if (emenda.partido) updateData.partido = emenda.partido;
      if (emenda.beneficiario) updateData.conveniado = emenda.beneficiario;
      if (emenda.municipio) updateData.municipio = emenda.municipio;
      if (emenda.objeto) updateData.objeto = emenda.objeto;
      if (emenda.regional) updateData.regional = emenda.regional;
      if (emenda.num_convenio) updateData.numero_convenio = emenda.num_convenio;
      if (emenda.valor !== undefined && emenda.valor !== null) updateData.valor = emenda.valor;
      if (emenda.portfolio) updateData.portfolio = emenda.portfolio;
      if (Object.keys(updateData).length === 0) continue;

      for (const fId of fIds) {
        let retries = 2;
        while (retries >= 0) {
          const { error: uErr } = await supabase.from("formalizacao").update(updateData).eq("id", fId);
          if (uErr) { 
            if (retries > 0) { retries--; await new Promise(r => setTimeout(r, 1000)); }
            else { errors.push(`F#${fId}: ${uErr.message}`); break; }
          } else { updated++; break; }
        }
      }
    }

    if ((i + 50) % 500 === 0 || i + 50 >= convenioKeys.length) {
      console.log(`   Processados ${Math.min(i + 50, convenioKeys.length)}/${convenioKeys.length} convênios — ${updated} formalizações atualizadas`);
    }
    // Pausa entre batches para evitar rate limit
    await new Promise(r => setTimeout(r, 300));
    } catch (batchErr: any) {
      console.error(`   ⚠ Erro no batch ${Math.floor(i/100)+1}: ${batchErr.message}`);
      errors.push(`Batch ${Math.floor(i/100)+1}: ${batchErr.message}`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  console.log(`\n📊 RESULTADO DA SINCRONIZAÇÃO:`);
  console.log(`   Formalizações atualizadas: ${updated}`);
  console.log(`   Convênios sem emenda correspondente: ${notFound}`);
  if (errors.length > 0) {
    console.log(`   Erros: ${errors.length}`);
    for (const e of errors.slice(0, 10)) console.log(`     - ${e}`);
  }
  console.log(`\n✅ SINCRONIZAÇÃO CONCLUÍDA!`);
}

main().catch(err => { console.error("❌ Erro fatal:", err); process.exit(1); });
