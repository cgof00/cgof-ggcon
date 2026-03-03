import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
const envPath = path.join(__dirname, '.env.local');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  dotenv.config({ path: envPath });
} catch (err) {
  console.error('Erro ao carregar .env.local');
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL ou chave não configurada');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAdminUser() {
  try {
    console.log('🔍 Verificando usuário admin...');
    
    // Verificar se existe
    const { data: existing, error: checkError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', 'admin@gestor-emendas.com')
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Erro ao verificar:', checkError.message);
      process.exit(1);
    }

    const correctHash = '191ee6ac91907b3f6b8016b39925c6968926e04d0f9c61d40da7f568dd6ae6e7';

    if (existing) {
      console.log('✓ Usuário encontrado');
      console.log('  Hash atual:', existing.senha_hash.substring(0, 20) + '...');
      console.log('  Hash correto:', correctHash.substring(0, 20) + '...');
      
      if (existing.senha_hash === correctHash) {
        console.log('✅ Hash já está correto!');
        process.exit(0);
      }

      // Atualizar hash
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ senha_hash: correctHash })
        .eq('email', 'admin@gestor-emendas.com');

      if (updateError) {
        console.error('❌ Erro ao atualizar:', updateError.message);
        process.exit(1);
      }

      console.log('✅ Hash atualizado com sucesso!');
    } else {
      console.log('⚠️  Usuário não encontrado, criando...');
      
      // Criar novo usuário
      const { error: insertError } = await supabase
        .from('usuarios')
        .insert({
          email: 'admin@gestor-emendas.com',
          senha_hash: correctHash,
          nome: 'Administrador',
          role: 'admin',
          ativo: true,
        });

      if (insertError) {
        console.error('❌ Erro ao criar:', insertError.message);
        process.exit(1);
      }

      console.log('✅ Usuário admin criado com sucesso!');
    }

    console.log('\n📝 Credenciais:');
    console.log('   Email: admin@gestor-emendas.com');
    console.log('   Senha: admin123');
    console.log('\n✨ Agora você pode fazer login!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

fixAdminUser();
