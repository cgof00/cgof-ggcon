// Teste de hash para senha do afpereira@saude.sp.gov.br
function hashPassword(password) {
  let hash = 0;
  const combined = password + 'salt';
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

const senha = 'M@dmax2026';
console.log('Senha:', senha);
console.log('Hash:', hashPassword(senha));