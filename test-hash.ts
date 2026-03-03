import crypto from 'crypto';

const password = 'admin123';
const salt = 'salt';

// Hash with salt
const hash1 = crypto.createHash('sha256').update(password + salt).digest('hex');
console.log('Hash com "admin123" + "salt":', hash1);

// Hash from DB
const expected = '191ee6ac91907b3f6b8016b39925c6968926e04d0f9c61d40da7f568dd6ae6e7';
console.log('Hash no banco:             ', expected);
console.log('Hashes batem?', hash1 === expected ? '✅ SIM' : '❌ NÃO');
