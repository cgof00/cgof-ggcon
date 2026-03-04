// Testa o hash para várias senhas
function hashPassword(password) {
  let hash = 0;
  const combined = password + 'salt';
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

const senhas = [
  'M@dmax2026',
  'senha123',
  '123456',
  'admin',
  'admin123',
  'karen',
  'teste',
  '1234',
  '12345',
  '12345678',
  'afpereira',
  'kdelfino',
];

for (const senha of senhas) {
  console.log(`Senha: ${senha}  =>  Hash: ${hashPassword(senha)}`);
}