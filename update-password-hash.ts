import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurado');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePasswordHash() {
  try {
    console.log('📝 Atualizando hash da senha para afpereira@saude.sp.gov.br...');
    
    const newHash = "dc629bb06dd19df11511b2f25fff150d5f73832cae03151c1ce361bc2494d3eb";
    
    const { data, error } = await supabase
      .from('usuarios')
      .update({ senha_hash: newHash })
      .eq('email', 'afpereira@saude.sp.gov.br')
      .select();
    
    if (error) {
      console.error('❌ Erro ao atualizar:', error);
      process.exit(1);
    }
    
    console.log('✅ Hash atualizado com sucesso!');
    console.log('Linhas atualizadas:', data?.length);
    if (data && data.length > 0) {
      console.log('Usuário:', data[0].email);
    }
  } catch (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }
}

updatePasswordHash();
