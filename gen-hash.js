import crypto from 'crypto';

const senha = 'M@dmax2026';
const hash = crypto.createHash('sha256').update(senha).digest('hex');

console.log('Password: ' + senha);
console.log('Hash: ' + hash);
