import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env.local');

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

async function testAttribution() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TESTE DE ATRIBUIÇÃO');
  console.log('='.repeat(60) + '\n');

  // 1. Get ID of emenda with final 893
  const { data: emedas, error: findError } = await supabase
    .from('formalizacao')
    .select('id, demandas_formalizacao')
    .ilike('demandas_formalizacao', '%893')
    .limit(1);

  if (findError || !emedas || emedas.length === 0) {
    console.log('❌ Emenda não encontrada');
    return;
  }

  const recordId = emedas[0].id;
  const demandaId = emedas[0].demandas_formalizacao;
  console.log(`✅ Encontrada emenda: ID=${recordId}, Demanda=${demandaId}\n`);

  // 2. Get a técnico ID 
  const { data: users, error: userError } = await supabase
    .from('usuarios')
    .select('id, nome, email')
    .neq('id', 1)
    .limit(1);

  if (userError || !users || users.length === 0) {
    console.log('❌ Técnico não encontrado');
    return;
  }

  const tecnicoId = users[0].id;
  const tecnicoNome = users[0].nome;
  console.log(`✅ Técnico selecionado: ID=${tecnicoId}, Nome=${tecnicoNome}\n`);

  // 3. Try to update using the same logic as the endpoint
  const now = new Date();
  const dataLiberacao = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  
  console.log('📤 Tentando atribuir:');
  console.log(`   - ID: ${recordId}`);
  console.log(`   - Usuario ID: ${tecnicoId}`);
  console.log(`   - Técnico Nome: ${tecnicoNome}`);
  console.log(`   - Data: ${dataLiberacao}\n`);

  const { data: updateResult, error: updateError } = await supabase
    .from('formalizacao')
    .update({
      tecnico: tecnicoNome,
      usuario_atribuido_id: tecnicoId,
      data_liberacao: dataLiberacao,
      updated_at: new Date().toISOString()
    })
    .eq('id', recordId)
    .select('id, demandas_formalizacao, tecnico, data_liberacao, usuario_atribuido_id, updated_at');

  if (updateError) {
    console.log('❌ Erro ao atualizar:', updateError);
    console.log('   Message:', updateError.message);
    console.log('   Details:', updateError.details);
    return;
  }

  console.log('✅ UPDATE executado com sucesso\n');
  console.log('📊 Resultado:');
  if (updateResult && updateResult[0]) {
    const record = updateResult[0];
    console.log(`   - ID: ${record.id}`);
    console.log(`   - Técnico: ${record.tecnico}`);
    console.log(`   - Data Liberação: ${record.data_liberacao}`);
    console.log(`   - Usuario Atribuido ID: ${record.usuario_atribuido_id}`);
    console.log(`   - Updated At: ${record.updated_at}`);
  }

  // 4. Query again to verify persistence
  console.log('\n🔄 Consultando registro novamente para verificar persistência...\n');
  const { data: verifyResult, error: verifyError } = await supabase
    .from('formalizacao')
    .select('id, demandas_formalizacao, tecnico, data_liberacao, usuario_atribuido_id')
    .eq('id', recordId);

  if (verifyError) {
    console.log('❌ Erro ao verificar:', verifyError);
    return;
  }

  if (verifyResult && verifyResult[0]) {
    const record = verifyResult[0];
    console.log('✅ Registro após verificação:');
    console.log(`   - ID: ${record.id}`);
    console.log(`   - Demanda: ${record.demandas_formalizacao}`);
    console.log(`   - Técnico: ${record.tecnico}`);
    console.log(`   - Data Liberação: ${record.data_liberacao}`);
    console.log(`   - Usuario Atribuido ID: ${record.usuario_atribuido_id}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Teste concluído');
  console.log('='.repeat(60) + '\n');
}

testAttribution().catch(console.error);
