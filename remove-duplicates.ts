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

interface Formalizacao {
  id: number;
  emenda?: string | null;
  [key: string]: any;
}

async function removeDuplicates() {
  console.log('\n🔍 REMOVENDO DUPLICATAS - Por coluna de "emenda"\n');
  
  try {
    // 1. Buscar todos os registros
    console.log('1️⃣ Buscando todos os registros...');
    let allRecords: Formalizacao[] = [];
    let offset = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from("formalizacao")
        .select("*")
        .range(offset, offset + pageSize - 1);
      
      if (error) {
        console.error('❌ Erro ao buscar registros:', error);
        return;
      }
      
      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allRecords = allRecords.concat(data);
        console.log(`   ✓ Carregados ${allRecords.length} registros até agora...`);
        offset += pageSize;
      }
    }
    
    console.log(`✓ Total carregado: ${allRecords.length} registros\n`);
    
    // 2. Identificar duplicatas baseado na coluna "emenda"
    console.log('2️⃣ Identificando duplicatas por coluna "emenda"...');
    const seenEmendas = new Map<string | null, number[]>();
    const duplicates: number[] = [];
    
    allRecords.forEach((record) => {
      const emendaKey = record.emenda || 'NULL';
      if (!seenEmendas.has(emendaKey)) {
        seenEmendas.set(emendaKey, []);
      }
      seenEmendas.get(emendaKey)!.push(record.id);
    });
    
    // Encontrar IDs duplicados (manter o primeiro, deletar o resto)
    seenEmendas.forEach((ids, emenda) => {
      if (ids.length > 1) {
        console.log(`   Emenda "${emenda}": ${ids.length} registros encontrados`);
        // Adicionar todos EXCETO o primeiro à lista de deletar
        duplicates.push(...ids.slice(1));
      }
    });
    
    console.log(`✓ Total de linhas duplicadas encontradas: ${duplicates.length}\n`);
    
    if (duplicates.length === 0) {
      console.log('✅ Nenhuma duplicata encontrada!');
      return;
    }
    
    // 3. Perguntar confirmação
    console.log(`⚠️  AVISO: Serão deletados ${duplicates.length} registros`);
    console.log('Primeiros 10 IDs a deletar:', duplicates.slice(0, 10).join(', '));
    
    // 4. Deletar duplicatas em chunks
    console.log('\n3️⃣ Deletando registros duplicados...');
    const chunkSize = 100;
    let deletedCount = 0;
    
    for (let i = 0; i < duplicates.length; i += chunkSize) {
      const chunk = duplicates.slice(i, i + chunkSize);
      
      // Deletar usando operação em batch
      const { error: deleteError, count } = await supabase
        .from("formalizacao")
        .delete()
        .in("id", chunk);
      
      if (deleteError) {
        console.error(`❌ Erro ao deletar chunk ${i/chunkSize + 1}:`, deleteError);
      } else {
        deletedCount += count || chunk.length;
        console.log(`   ✓ Deletados ${count || chunk.length} registros (${i + chunk.length}/${duplicates.length})`);
      }
      
      // Wait a bit to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n✅ Processo concluído!`);
    console.log(`   📊 Total deletado: ${deletedCount} registros duplicados`);
    console.log(`   📊 Registros restantes: ${allRecords.length - deletedCount}`);
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

removeDuplicates().then(() => {
  console.log('\n✨ Script finalizado!\n');
  process.exit(0);
}).catch(error => {
  console.error('Erro:', error);
  process.exit(1);
});
