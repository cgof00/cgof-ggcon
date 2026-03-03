import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local file manually
const envPath = path.join(__dirname, '.env.local');

try {
  const envContent = readFileSync(envPath, 'utf-8');
  console.log('✓ .env.local encontrado');
  dotenv.config({ path: envPath });
} catch (err) {
  console.warn('⚠ .env.local não encontrado');
  dotenv.config();
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl ? '✓ Configurada' : '❌ Não configurada');
console.log('Supabase Key:', supabaseKey ? '✓ Configurada (length: ' + supabaseKey.length + ')' : '❌ Não configurada');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('\n📊 Checking users in Supabase...\n');
  
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, email, nome, role, ativo, senha_hash')
      .order('id', { ascending: true });

    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️  No users found in database');
      return;
    }

    console.log(`Found ${data.length} user(s):\n`);
    data.forEach((user, i) => {
      console.log(`${i + 1}. Email: ${user.email}`);
      console.log(`   Nome: ${user.nome}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Ativo: ${user.ativo ? '✓ Sim' : '❌ Não'}`);
      console.log(`   Hash: ${user.senha_hash ? user.senha_hash.substring(0, 30) + '...' : 'NULL'}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkDatabase();
