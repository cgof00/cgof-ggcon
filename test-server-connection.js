// Quick test file para verificar conexão com servidor
// Execute no console do browser: fetch('/api/health').then(r => r.text()).then(console.log)

async function testServer() {
  console.log('🔍 Testando conexão com servidor...\n');
  
  try {
    console.log('1️⃣ Testando /api/health (sem autenticação):');
    const health = await fetch('/api/health');
    console.log('Status:', health.status);
    console.log('OK:', health.ok);
    const healthText = await health.text();
    console.log('Response:', healthText);
  } catch(e) {
    console.error('❌ Erro:', e.message);
  }

  try {
    console.log('\n2️⃣ Testando /api/usuarios:');
    const token = localStorage.getItem('auth_token');
    const usuarios = await fetch('/api/usuarios', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Status:', usuarios.status);
    console.log('OK:', usuarios.ok);
  } catch(e) {
    console.error('❌ Erro:', e.message);
  }
}

// Execute: testServer()
