import fetch from 'node-fetch';

const testConnections = async () => {
  console.log('🧪 Testando conexões...\n');

  // Test 1: Health endpoint
  try {
    console.log('📡 Teste 1: GET /api/health');
    const response = await fetch('http://localhost:4000/api/health', {
      timeout: 5000
    });
    const data = await response.json();
    console.log('   ✅ Status:', response.status);
    console.log('   ✅ Response:', data);
    console.log('   ✅ Servidor está RESPONDENDO\n');
  } catch (err) {
    console.error('   ❌ Erro:', err?.message);
    console.log('   ❌ Servidor NÃO está respondendo ou não está rodando\n');
  }

  // Test 2: Try to login
  try {
    console.log('📡 Teste 2: POST /api/auth/login (credenciais admin)');
    const response = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'afpereira@saude.sp.gov.br',
        senha: 'M@dmax2026'
      }),
      timeout: 5000
    });
    const data = await response.json();
    console.log('   Status:', response.status);
    console.log('   Response:', JSON.stringify(data, null, 2));
    if (response.ok) {
      console.log('   ✅ Login funcionando\n');
    } else {
      console.log('   ❌ Login retornou erro\n');
    }
  } catch (err) {
    console.error('   ❌ Erro ao testar login:', err?.message, '\n');
  }
};

testConnections();
