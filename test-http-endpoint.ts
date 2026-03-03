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

const token = process.env.TEST_TOKEN || 'test-token';
const serverUrl = 'http://localhost:4000';

async function testAttributionEndpoint() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TESTE DO ENDPOINT /api/formalizacao/atribuir-tecnico');
  console.log('='.repeat(60) + '\n');

  try {
    // 1. Get a token first
    console.log('1️⃣ Obtendo token de autenticação...');
    const loginRes = await fetch(`${serverUrl}/api/health`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!loginRes.ok) {
      console.log('⚠️  Health check falhou, continuando com teste direto...');
    } else {
      console.log('✅ Servidor respondendo\n');
    }

    // 2. Call attribution endpoint
    const attributionPayload = {
      ids: [889], // ID da emenda com final 893
      usuario_id: 2, // ID de um técnico
      data_liberacao: '2026-03-02'
    };

    console.log('2️⃣ Chamando endpoint com payload:');
    console.log('   -', JSON.stringify(attributionPayload, null, 2));
    console.log('');

    const response = await fetch(`${serverUrl}/api/formalizacao/atribuir-tecnico`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(attributionPayload)
    });

    console.log(`3️⃣ Response status: ${response.status} ${response.statusText}`);
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('\n✅ SUCESSO!');
      console.log('Resposta recebida:', JSON.stringify(result, null, 2));
    } else {
      console.log('\n❌ ERRO:');
      console.log('Resposta:', JSON.stringify(result, null, 2));
    }

  } catch (error: any) {
    console.log('❌ Erro ao testar endpoint:');
    console.log('   ', error.message);
    console.log('\n⚠️  Certifique-se de que:');
    console.log('   1. O servidor está rodando em http://localhost:4000');
    console.log('   2. A conexão com Supabase está ativa');
    console.log('   3. Os dados de teste existem no banco');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Teste finalizado');
  console.log('='.repeat(60) + '\n');
}

testAttributionEndpoint().catch(console.error);
