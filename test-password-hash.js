#!/usr/bin/env node

// Inline hash function
function hashPassword(password) {
  const salt = 'salt';
  let hash = 0;
  const combined = password + salt;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// Test what hashes our algorithm generates
const testPasswords = [
  'M@dmax2026',
  'admin123',
  'password',
  '123456',
  'Admin@123',
  'senha123',
];

console.log('🔐 Testing password hashes with our algorithm:\n');

testPasswords.forEach(pwd => {
  const hash = hashPassword(pwd);
  const match = hash === 'aa5d18ebb18feeebf6df0c2a58ed82439fb' ? '✅ MATCH!' : '❌ No match';
  console.log(`Password: "${pwd}" -> Hash: ${hash} ${match}`);
});

// Show what we SHOULD be using
const correctPassword = 'M@dmax2026';
const correctHash = hashPassword(correctPassword);
console.log('\n📝 To fix the user in Supabase, run this SQL:');
console.log('');
console.log(`UPDATE usuarios SET senha_hash = '${correctHash}' WHERE email = 'afpereira@saude.sp.gov.br';`);
console.log('');
console.log(`Then login with:`);
console.log(`Email: afpereira@saude.sp.gov.br`);
console.log(`Password: ${correctPassword}`);
