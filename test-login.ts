import { hashPassword } from './src/auth.js';

async function testLogin() {
  const email = 'admin@gestor-emendas.com';
  const senha = 'admin123';

  console.log('🧪 Testing login endpoint...');
  console.log(`Email: ${email}`);
  console.log(`Password: ${senha}`);
  
  try {
    const response = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });

    console.log(`\n📊 Response Status: ${response.status} ${response.statusText}`);
    const data = await response.json();
    console.log('📝 Response Body:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✓ Login successful!');
      console.log('Token:', data.token);
      console.log('User:', JSON.stringify(data.user, null, 2));
    } else {
      console.log('\n✗ Login failed');
      console.log('Error:', data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testLogin();
