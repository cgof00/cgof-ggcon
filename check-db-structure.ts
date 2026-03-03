import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

// Desabilitar verificação de certificado em desenvolvimento
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env.local');

// Load environment
try {
  const envContent = readFileSync(envPath, 'utf-8');
  dotenv.config({ path: envPath });
} catch (err) {
  console.warn('⚠ .env.local não encontrado');
  dotenv.config();
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 VERIFICAÇÃO DA ESTRUTURA DO BANCO');
  console.log('='.repeat(60) + '\n');

  // 1. Check if usuario_atribuido_id column exists
  console.log('1️⃣ Verificando se coluna usuario_atribuido_id existe...');
  try {
    const { data, error } = await supabase
      .from('formalizacao')
      .select('usuario_atribuido_id')
      .limit(1);
    
    if (error && error.message.includes('usuario_atribuido_id')) {
      console.log('❌ Coluna usuario_atribuido_id NÃO EXISTE');
      console.log('   Erro:', error.message);
    } else if (error) {
      console.log('⚠️  Erro ao verificar coluna:', error.message);
    } else {
      console.log('✅ Coluna usuario_atribuido_id EXISTE');
    }
  } catch (err: any) {
    console.log('❌ Erro:', err.message);
  }

  // 2. Check if tecnico column exists
  console.log('\n2️⃣ Verificando se coluna tecnico existe...');
  try {
    const { data, error } = await supabase
      .from('formalizacao')
      .select('tecnico')
      .limit(1);
    
    if (error && error.message.includes('tecnico')) {
      console.log('❌ Coluna tecnico NÃO EXISTE');
    } else if (error) {
      console.log('⚠️  Erro:', error.message);
    } else {
      console.log('✅ Coluna tecnico EXISTE');
    }
  } catch (err: any) {
    console.log('❌ Erro:', err.message);
  }

  // 3. Check data_liberacao column
  console.log('\n3️⃣ Verificando se coluna data_liberacao existe...');
  try {
    const { data, error } = await supabase
      .from('formalizacao')
      .select('data_liberacao')
      .limit(1);
    
    if (error && error.message.includes('data_liberacao')) {
      console.log('❌ Coluna data_liberacao NÃO EXISTE');
    } else if (error) {
      console.log('⚠️  Erro:', error.message);
    } else {
      console.log('✅ Coluna data_liberacao EXISTE');
      console.log('   Amostra:', data?.[0]);
    }
  } catch (err: any) {
    console.log('❌ Erro:', err.message);
  }

  // 4. Check sample record with final 893
  console.log('\n4️⃣ Procurando emenda com final 893...');
  try {
    const { data, error } = await supabase
      .from('formalizacao')
      .select('id, demandas_formalizacao, tecnico, data_liberacao, usuario_atribuido_id')
      .ilike('demandas_formalizacao', '%893')
      .limit(5);
    
    if (error) {
      console.log('❌ Erro:', error.message);
    } else if (!data || data.length === 0) {
      console.log('⚠️  Nenhuma emenda com final 893 encontrada');
    } else {
      console.log('✅ Encontrada(s):', data.length, 'emenda(s)');
      data.forEach(record => {
        console.log(`\n   ID: ${record.id}, Demanda: ${record.demandas_formalizacao}`);
        console.log(`   Técnico: ${record.tecnico || '(vazio)'}`);
        console.log(`   Data Liberação: ${record.data_liberacao || '(vazio)'}`);
        console.log(`   Usuario Atribuido ID: ${record.usuario_atribuido_id || '(vazio)'}`);
      });
    }
  } catch (err: any) {
    console.log('❌ Erro:', err.message);
  }

  // 5. Check if usuarios table has 'técnicos'
  console.log('\n5️⃣ Verificando usuários técnicos no banco...');
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, role')
      .limit(10);
    
    if (error) {
      console.log('❌ Erro:', error.message);
    } else {
      console.log('✅ Técnicos/Usuários encontrados:', data?.length || 0);
      data?.forEach(u => {
        console.log(`   - ${u.nome} (${u.email}) - Role: ${u.role}`);
      });
    }
  } catch (err: any) {
    console.log('❌ Erro:', err.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Verificação concluída');
  console.log('='.repeat(60) + '\n');
}

checkDatabase().catch(console.error);
