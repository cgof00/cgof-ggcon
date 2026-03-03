import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
const envPath = path.join(__dirname, '.env.local');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  dotenv.config({ path: envPath });
} catch (err) {
  console.warn('⚠ .env.local não encontrado');
  dotenv.config();
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase não configurado');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('\n🔍 DIAGNÓSTICO DE FILTROS\n');
  
  // 1. Verificar dados totais
  console.log('1️⃣ Total de formalizações:');
  const { data: allData, error: allError } = await supabase
    .from("formalizacao")
    .select("id, ano")
    .limit(100);
  
  if (allError) {
    console.error('❌ Erro ao buscar dados:', allError);
  } else {
    console.log(`   ✓ Encontrados ${allData?.length || 0} registros`);
    if (allData && allData.length > 0) {
      const first = allData[0];
      console.log(`   ✓ Primeiro registro: ano = ${first.ano} (tipo: ${typeof first.ano})`);
    }
  }

  // 2. Verificar valores únicos de ano
  console.log('\n2️⃣ Valores únicos de ANO:');
  const { data: anosData, error: anosError } = await supabase
    .from("formalizacao")
    .select("ano")
    .not("ano", "is", null)
    .neq("ano", "");
  
  if (anosError) {
    console.error('❌ Erro ao buscar anos:', anosError);
  } else {
    const anosSet = new Set<string>();
    (anosData || []).forEach((row: any) => {
      const valor = row.ano;
      if (valor && valor.toString().trim() !== '') {
        anosSet.add(valor.toString());
      }
    });
    const anos = Array.from(anosSet).sort();
    console.log(`   ✓ Valores únicos: ${anos.join(', ')}`);
    console.log(`   ✓ Total de valores diferentes: ${anos.length}`);
  }

  // 3. Verificar registros com ano = 2019
  console.log('\n3️⃣ Registros com ANO = 2019:');
  const { data: ano2019, error: ano2019Error } = await supabase
    .from("formalizacao")
    .select("id, ano")
    .eq("ano", "2019");
  
  if (ano2019Error) {
    console.error('❌ Erro:', ano2019Error);
  } else {
    console.log(`   ✓ Encontrados ${ano2019?.length || 0} registros com ano = '2019' (texto)`);
  }

  // 4. Tenta com número
  const { data: ano2019Num, error: ano2019NumError } = await supabase
    .from("formalizacao")
    .select("id, ano")
    .eq("ano", 2019);
  
  if (ano2019NumError) {
    console.error('❌ Erro:', ano2019NumError);
  } else {
    console.log(`   ✓ Encontrados ${ano2019Num?.length || 0} registros com ano = 2019 (número)`);
  }

  // 5. Verificar como o filtro processa
  console.log('\n4️⃣ Simulando filtro backend:');
  const { data: filterData, error: filterError } = await supabase
    .from("formalizacao")
    .select("ano")
    .not("ano", "is", null)
    .neq("ano", "");
  
  if (!filterError && filterData) {
    const valoresSet = new Set<string>();
    (filterData || []).forEach((row: any) => {
      const valor = row.ano;
      if (valor && valor.toString().trim() !== '') {
        valoresSet.add(valor.toString());
      }
    });
    const anos = Array.from(valoresSet).sort();
    console.log(`   Valores processados: ${anos.slice(0, 5).join(', ')}`);
  }

  console.log('\n✅ Diagnóstico completo!\n');
}

diagnose().catch(console.error);
