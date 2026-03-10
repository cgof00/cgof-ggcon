/**
 * Script standalone para importar emendas do CSV diretamente no Supabase.
 * Bypassa o servidor Express para evitar problemas de timeout/405.
 * 
 * Uso: npx tsx import-emendas.ts
 */
// Permitir certificados auto-assinados em desenvolvimento
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Papa from "papaparse";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não encontradas em .env.local");
  process.exit(1);
}

console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Arquivo CSV
const CSV_PATH = path.join(__dirname, "emendas-import.csv");

// ── Mapeamento de colunas CSV → banco ──
const columnMapping: Record<string, string> = {
  "Detalhes da Demanda": "detalhes", "Natureza": "natureza",
  "Ano Referência": "ano_refer", "Ano Referencia": "ano_refer",
  "Código/Nº Emenda": "codigo_num", "Codigo/Nº Emenda": "codigo_num",
  "Nº Emenda Agregadora": "num_emenda", "Parecer LDO": "parecer_ld",
  "Situação Emenda": "situacao_e", "Situacao Emenda": "situacao_e",
  "Situação Demanda": "situacao_d", "Situacao Demanda": "situacao_d",
  "Data da Última Tramitação Emenda": "data_ult_e", "Data da Ultima Tramitacao Emenda": "data_ult_e",
  "Data da Última Tramitação Demanda": "data_ult_d", "Data da Ultima Tramitacao Demanda": "data_ult_d",
  "Nº da Indicação": "num_indicacao", "Nº da Indicacao": "num_indicacao",
  "Parlamentar": "parlamentar", "Partido": "partido",
  "Tipo Beneficiário": "tipo_beneficiario", "Tipo Beneficiario": "tipo_beneficiario",
  "Beneficiário": "beneficiario", "Beneficiario": "beneficiario",
  "CNPJ": "cnpj", "Município": "municipio", "Municipio": "municipio",
  "Objeto": "objeto",
  "Órgão Entidade/Responsável": "orgao_entidade", "Orgao Entidade/Responsavel": "orgao_entidade",
  "Regional": "regional",
  "Nº de Convênio": "num_convenio", "Nº de Convenio": "num_convenio",
  "Nº de Processo": "num_processo",
  "Assinatura": "data_assinatura",
  "Publicação": "data_publicacao", "Publicacao": "data_publicacao",
  "Agência": "agencia", "Agencia": "agencia", "Conta": "conta",
  "Valor": "valor", "Valor da Demanda": "valor_desembolsado",
  "Portfólio": "portfolio", "Portfolio": "portfolio",
  "Qtd. Dias na Etapa": "qtd_dias",
  "Vigência": "vigencia", "Vigencia": "vigencia",
  "Data da Primeira Notificação LOA Recebida pelo Beneficiário": "data_prorrogacao",
  "Data da Primeira Notificacao LOA Recebida pelo Beneficiario": "data_prorrogacao",
  "Dados Bancários": "dados_bancarios", "Dados Bancarios": "dados_bancarios",
  "Status do Pagamento": "status", "Data do Pagamento": "data_pagamento",
  "Nº do Código Único": "num_codigo", "Nº do Codigo Unico": "num_codigo",
  "Notas e Empenho": "notas_empenho", "Valor Total Empenho": "valor_total_empenhado",
  "Notas de Lançamento": "notas_liquidacao", "Notas de Lancamento": "notas_liquidacao",
  "Valor Total Lançamento": "valor_total_liquidado", "Valor Total Lancamento": "valor_total_liquidado",
  "Programações Desembolso": "programa", "Programacoes Desembolso": "programa",
  "Valor Total Programação Desembolso": "valor_total_pago", "Valor Total Programacao Desembolso": "valor_total_pago",
  "Ordem Bancária": "ordem_bancaria", "Ordem Bancaria": "ordem_bancaria",
  "Data pagamento Ordem Bancária": "data_paga", "Data pagamento Ordem Bancaria": "data_paga",
  "Valor Total Ordem Bancária": "valor_total_ordem_bancaria", "Valor Total Ordem Bancaria": "valor_total_ordem_bancaria"
};

const validColumns = new Set([
  'detalhes', 'natureza', 'ano_refer', 'codigo_num', 'num_emenda', 'parecer_ld',
  'situacao_e', 'situacao_d', 'data_ult_e', 'data_ult_d', 'num_indicacao',
  'parlamentar', 'partido', 'tipo_beneficiario', 'beneficiario', 'cnpj',
  'municipio', 'objeto', 'orgao_entidade', 'regional', 'num_convenio',
  'num_processo', 'data_assinatura', 'data_publicacao', 'agencia', 'conta',
  'valor', 'valor_desembolsado', 'portfolio', 'qtd_dias', 'vigencia',
  'data_prorrogacao', 'dados_bancarios', 'status', 'data_pagamento',
  'num_codigo', 'notas_empenho', 'valor_total_empenhado', 'notas_liquidacao',
  'valor_total_liquidado', 'programa', 'valor_total_pago', 'ordem_bancaria',
  'data_paga', 'valor_total_ordem_bancaria'
]);

const numericFields = new Set(['valor', 'valor_desembolsado', 'valor_total_empenhado', 'valor_total_liquidado', 'valor_total_pago', 'valor_total_ordem_bancaria']);

async function main() {
  console.log("📂 Lendo CSV:", CSV_PATH);
  
  let csvContent: string;
  try {
    csvContent = readFileSync(CSV_PATH, 'utf-8');
    // Remove BOM if present
    if (csvContent.charCodeAt(0) === 0xFEFF) {
      csvContent = csvContent.slice(1);
    }
  } catch (err) {
    console.error("❌ Erro ao ler arquivo CSV:", err);
    process.exit(1);
  }

  // Parse CSV
  const parseResult = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: 'greedy' as const,
    transformHeader: (header: string) => header.trim(),
  });

  const data = parseResult.data as any[];
  console.log(`📥 ${data.length} registros lidos do CSV`);
  console.log(`   Colunas CSV encontradas:`, Object.keys(data[0]).join(' | '));
  console.log(`   Exemplo primeiro registro:`, JSON.stringify(data[0]).substring(0, 500));

  if (data.length === 0) {
    console.error("❌ Arquivo CSV vazio");
    process.exit(1);
  }

  // ── PASSO 1: Mapear CSV para formato do banco ──
  console.log("🔄 Mapeando colunas CSV → banco...");
  const mappedItems: any[] = [];
  for (const item of data) {
    const mapped: any = {};
    let hasData = false;
    for (const csvKey of Object.keys(item)) {
      const dbKey = columnMapping[csvKey] || csvKey;
      if (!validColumns.has(dbKey)) continue;
      const val = item[csvKey];
      if (val === undefined || val === null || val === '') continue;
      hasData = true;
      if (numericFields.has(dbKey)) {
        const cleanVal = String(val).replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
        const parsed = parseFloat(cleanVal);
        mapped[dbKey] = isNaN(parsed) ? 0 : parsed;
      } else if (dbKey === 'qtd_dias') {
        const parsed = parseInt(String(val).replace(/\D/g, ''));
        mapped[dbKey] = (isNaN(parsed) || parsed > 2147483647) ? 0 : parsed;
      } else {
        mapped[dbKey] = String(val);
      }
    }
    if (hasData) mappedItems.push(mapped);
  }

  console.log(`📋 ${mappedItems.length} registros mapeados`);
  if (mappedItems.length > 0) {
    console.log(`   Chaves do primeiro registro mapeado:`, Object.keys(mappedItems[0]).join(', '));
    console.log(`   codigo_num do primeiro:`, mappedItems[0].codigo_num || '(VAZIO!)');
    console.log(`   Exemplo:`, JSON.stringify(mappedItems[0]).substring(0, 500));
    const withCodigo = mappedItems.filter(i => i.codigo_num && String(i.codigo_num).trim() !== '');
    console.log(`   Registros com codigo_num preenchido: ${withCodigo.length}/${mappedItems.length}`);
  }

  // ── PASSO 2: PROCV - buscar codigo_num existentes ──
  console.log("🔍 Buscando emendas existentes no banco (PROCV)...");
  const allExistingCodigos = new Set<string>();
  let dbOffset = 0;
  const batchSize = 2000;

  while (true) {
    let retries = 3;
    let existData: any[] | null = null;
    while (retries > 0) {
      const result = await supabase
        .from("emendas")
        .select("codigo_num")
        .not("codigo_num", "is", null)
        .range(dbOffset, dbOffset + batchSize - 1);
      if (result.error) {
        retries--;
        console.error(`  ⚠ Erro ao buscar codigos (tentativa ${3 - retries}/3):`, result.error.message);
        if (retries > 0) await new Promise(r => setTimeout(r, 3000));
      } else {
        existData = result.data;
        break;
      }
    }
    if (!existData) {
      console.error("❌ Falha ao consultar emendas existentes após 3 tentativas.");
      process.exit(1);
    }
    if (existData.length === 0) break;
    for (const row of existData) {
      if (row.codigo_num && String(row.codigo_num).trim() !== '') {
        allExistingCodigos.add(String(row.codigo_num).trim());
      }
    }
    console.log(`  📊 Lidos ${allExistingCodigos.size} códigos existentes...`);
    if (existData.length < batchSize) break;
    dbOffset += batchSize;
  }

  console.log(`✅ ${allExistingCodigos.size} emendas já existem no banco`);

  // ── PASSO 3: Filtrar somente emendas NOVAS ──
  const novosItems = mappedItems.filter(item => {
    const cod = item.codigo_num ? String(item.codigo_num).trim() : '';
    if (!cod) return false;
    return !allExistingCodigos.has(cod);
  });
  const skipped = mappedItems.length - novosItems.length;
  console.log(`🆕 ${novosItems.length} emendas NOVAS para importar (${skipped} já existiam ou sem código)`);

  if (novosItems.length === 0) {
    console.log("✅ Nenhuma emenda nova para importar. Todas já existem no banco.");
    return;
  }

  // ── PASSO 4: Inserir novas emendas em lotes de 100 ──
  console.log("📤 Inserindo novas emendas...");
  let emendasInserted = 0;
  const errors: string[] = [];
  const insertBatchSize = 100;

  for (let i = 0; i < novosItems.length; i += insertBatchSize) {
    const chunk = novosItems.slice(i, i + insertBatchSize);
    const batchNum = Math.floor(i / insertBatchSize) + 1;
    const totalBatches = Math.ceil(novosItems.length / insertBatchSize);

    let retries = 3;
    while (retries > 0) {
      const { data: insertData, error: insertError } = await supabase.from("emendas").insert(chunk).select("id");
      if (insertError) {
        retries--;
        console.error(`  ⚠ Lote ${batchNum}/${totalBatches} falhou (tentativa ${3 - retries}/3): ${insertError.message}`);
        if (retries > 0) await new Promise(r => setTimeout(r, 3000));
        else errors.push(`Lote ${batchNum}: ${insertError.message}`);
      } else {
        emendasInserted += insertData?.length || 0;
        if (batchNum % 10 === 0 || batchNum === totalBatches) {
          console.log(`  ✅ Lote ${batchNum}/${totalBatches} - Total inseridas: ${emendasInserted}`);
        }
        break;
      }
    }
    // Pequena pausa entre lotes para não sobrecarregar
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n📊 RESULTADO DA IMPORTAÇÃO:`);
  console.log(`   Emendas inseridas: ${emendasInserted}`);
  console.log(`   Emendas ignoradas (já existiam): ${skipped}`);
  if (errors.length > 0) {
    console.log(`   Erros: ${errors.length}`);
    for (const e of errors) console.log(`     - ${e}`);
  }

  // ── PASSO 5: Sincronizar novas emendas com formalização via num_convenio ──
  console.log("\n🔄 Sincronizando novas emendas com formalização (via nº convênio)...");
  const conveniosInseridos = novosItems
    .filter(it => it.num_convenio && String(it.num_convenio).trim() !== '')
    .map(it => String(it.num_convenio).trim());

  let formalizacaoUpdated = 0;
  let notInFormalizacao = 0;

  if (conveniosInseridos.length > 0) {
    const uniqueConvenios = [...new Set(conveniosInseridos)];
    console.log(`   ${uniqueConvenios.length} números de convênio únicos para comparar`);
    const formalizacoesEncontradas: any[] = [];

    for (let i = 0; i < uniqueConvenios.length; i += 100) {
      const batch = uniqueConvenios.slice(i, i + 100);
      const { data: formalizacoes, error: fError } = await supabase
        .from("formalizacao")
        .select("id, numero_convenio")
        .in("numero_convenio", batch);
      if (fError) {
        errors.push(`Buscar formalizações: ${fError.message}`);
      } else if (formalizacoes) {
        formalizacoesEncontradas.push(...formalizacoes);
      }
    }

    const formalizacaoMap = new Map<string, number[]>();
    for (const f of formalizacoesEncontradas) {
      const key = f.numero_convenio ? String(f.numero_convenio).trim() : '';
      if (!key) continue;
      if (!formalizacaoMap.has(key)) formalizacaoMap.set(key, []);
      formalizacaoMap.get(key)!.push(f.id);
    }

    console.log(`   ${formalizacoesEncontradas.length} formalizações encontradas com convênios correspondentes`);

    for (const emendaItem of novosItems) {
      const conv = emendaItem.num_convenio ? String(emendaItem.num_convenio).trim() : '';
      if (!conv) { notInFormalizacao++; continue; }
      const fIds = formalizacaoMap.get(conv);
      if (!fIds || fIds.length === 0) { notInFormalizacao++; continue; }

      const updateData: any = {};
      if (emendaItem.detalhes) updateData.demanda = emendaItem.detalhes;
      if (emendaItem.natureza) updateData.classificacao_emenda_demanda = emendaItem.natureza;
      if (emendaItem.ano_refer) updateData.ano = emendaItem.ano_refer;
      if (emendaItem.num_emenda) updateData.emendas_agregadoras = emendaItem.num_emenda;
      if (emendaItem.situacao_d) updateData.situacao_demandas_sempapel = emendaItem.situacao_d;
      if (emendaItem.parlamentar) updateData.parlamentar = emendaItem.parlamentar;
      if (emendaItem.partido) updateData.partido = emendaItem.partido;
      if (emendaItem.beneficiario) updateData.conveniado = emendaItem.beneficiario;
      if (emendaItem.municipio) updateData.municipio = emendaItem.municipio;
      if (emendaItem.objeto) updateData.objeto = emendaItem.objeto;
      if (emendaItem.regional) updateData.regional = emendaItem.regional;
      if (emendaItem.num_convenio) updateData.numero_convenio = emendaItem.num_convenio;
      if (emendaItem.valor !== undefined && emendaItem.valor !== null) updateData.valor = emendaItem.valor;
      if (emendaItem.portfolio) updateData.portfolio = emendaItem.portfolio;
      if (Object.keys(updateData).length === 0) continue;

      for (const fId of fIds) {
        const { error: updateError } = await supabase.from("formalizacao").update(updateData).eq("id", fId);
        if (updateError) {
          errors.push(`Formalização ${fId}: ${updateError.message}`);
        } else {
          formalizacaoUpdated++;
        }
      }
    }
  }

  console.log(`   Formalizações atualizadas: ${formalizacaoUpdated}`);
  console.log(`   Emendas sem formalização correspondente: ${notInFormalizacao}`);
  console.log(`\n✅ IMPORTAÇÃO CONCLUÍDA!`);
}

main().catch(err => {
  console.error("❌ Erro fatal:", err);
  process.exit(1);
});
