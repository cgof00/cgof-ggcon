import crypto from 'crypto';

function hashPassword(password: string, salt: string = 'salt'): string {
  return crypto
    .createHash('sha256')
    .update(password + salt)
    .digest('hex');
}

console.log('🔐 Password Hash Calculator\n');

const password = 'admin123';
const saltDefault = 'salt';
const saltFromEnv = process.env.PASSWORD_SALT || 'salt';

console.log('Password:', password);
console.log('Salt (env or default):', saltFromEnv);
console.log('');

const hash1 = hashPassword(password, saltDefault);
console.log('Hash with default salt "salt":', hash1);

const hash2 = hashPassword(password, saltFromEnv);
console.log('Hash with env salt:', hash2);

console.log('\nDatabase has hash starting with: 191ee6ac91907b3f6b8016b39925c6...');
console.log('');

if (hash1.startsWith('191ee6ac91907b3f6b8016b39925c6')) {
  console.log('✓ Hash matches with default salt!');
} else if (hash2.startsWith('191ee6ac91907b3f6b8016b39925c6')) {
  console.log('✓ Hash matches with env salt!');
} else {
  console.log('❌ Hash does not match!');
  console.log('\nTrying different possible salts...');
  
  const salts = ['', 'salt123', 'admin123', 'emendas', 'gestor', 'password'];
  for (const s of salts) {
    const h = hashPassword(password, s);
    if (h.startsWith('191ee6ac91907b3f6b8016b39925c6')) {
      console.log(`✓ Found matching salt: "${s}"`);
      console.log(`  Full hash: ${h}`);
      break;
    }
  }
}
