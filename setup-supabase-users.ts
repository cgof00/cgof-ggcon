import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import { hashPassword } from "./src/auth.js";

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

// Permitir certificados auto-assinados em desenvolvimento
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl ? '✓ Configurada' : '❌ Não configurada');
console.log('Supabase Key:', supabaseKey ? '✓ Configurada (length: ' + supabaseKey.length + ')' : '❌ Não configurada');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupUsers() {
  console.log('\n🔧 Configurando usuários no Supabase...\n');
  
  try {
    // Verificar usuários existentes
    const { data: existingUsers, error: fetchError } = await supabase
      .from('usuarios')
      .select('id, email, nome, role, ativo')
      .order('id', { ascending: true });

    if (fetchError) {
      console.error('❌ Erro ao buscar usuários:', fetchError);
      return;
    }

    console.log(`✓ Found ${existingUsers?.length || 0} existing user(s):`);
    existingUsers?.forEach((user: any) => {
      console.log(`  - ${user.email} (${user.nome}) - Role: ${user.role} - Ativo: ${user.ativo ? 'Sim' : 'Não'}`);
    });

    // Criar usuários padrão se não existirem
    const testUsers = [
      {
        email: 'admin@test.com',
        nome: 'Admin Teste',
        role: 'admin',
        password: 'Senha123!'
      },
      {
        email: 'intermediario@test.com',
        nome: 'Intermediário Teste',
        role: 'intermediario',
        password: 'Senha123!'
      },
      {
        email: 'usuario@test.com',
        nome: 'Usuário Teste',
        role: 'usuario',
        password: 'Senha123!'
      }
    ];

    console.log('\n📝 Adicionando usuários de teste...\n');

    for (const testUser of testUsers) {
      const userExists = existingUsers?.some((u: any) => u.email === testUser.email);

      if (!userExists) {
        const hashedPassword = hashPassword(testUser.password);
        
        const { data, error } = await supabase
          .from('usuarios')
          .insert([
            {
              email: testUser.email,
              nome: testUser.nome,
              role: testUser.role,
              senha_hash: hashedPassword,
              ativo: true
            }
          ])
          .select();

        if (error) {
          console.error(`❌ Erro ao criar usuário ${testUser.email}:`, error);
        } else {
          console.log(`✓ Usuário criado: ${testUser.email}`);
          console.log(`  Nome: ${testUser.nome}`);
          console.log(`  Role: ${testUser.role}`);
          console.log(`  Senha: ${testUser.password}`);
        }
      } else {
        console.log(`ℹ️  Usuário ${testUser.email} já existe`);
      }
    }

    console.log('\n✅ Setup concluído!\n');
    console.log('📋 Credenciais de login disponíveis:');
    console.log('   Email: admin@test.com | Senha: Senha123! | Role: admin');
    console.log('   Email: intermediario@test.com | Senha: Senha123! | Role: intermediario');
    console.log('   Email: usuario@test.com | Senha: Senha123! | Role: usuario\n');

  } catch (error) {
    console.error('❌ Erro geral:', error);
    process.exit(1);
  }
}

setupUsers();
