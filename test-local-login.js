// Test login locally
const email = 'afpereira@saude.sp.gov.br';
const senha = 'M@dmax2026';

const body = JSON.stringify({ email, senha });

fetch('http://localhost:4000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body
})
  .then(r => r.json())
  .then(data => {
    console.log('Response:', JSON.stringify(data, null, 2));
  })
  .catch(err => console.error('Error:', err.message));
