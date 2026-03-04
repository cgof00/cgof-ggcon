import crypto from 'crypto';

const senha = "M@dmax2026";
const hashEsperado = "dc629bb06dd19df11511b2f25fff150d5f73832cae03151c1ce361bc2494d3eb";

function hashPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(password)
    .digest('hex');
}

const hashCalculado = hashPassword(senha);

console.log('=== TESTE DE HASH ===\n');
console.log('Senha:', senha);
console.log('Hash calculado:', hashCalculado);
console.log('Hash esperado: ', hashEsperado);
console.log('\n✓ Batem?', hashCalculado === hashEsperado ? '✅ SIM!' : '❌ NÃO');

if (hashCalculado !== hashEsperado) {
  console.log('\n⚠️ Diferença encontrada!');
  console.log('Tamanho calculado:', hashCalculado.length);
  console.log('Tamanho esperado:', hashEsperado.length);
  
  // Compare character by character
  for (let i = 0; i < Math.max(hashCalculado.length, hashEsperado.length); i++) {
    if (hashCalculado[i] !== hashEsperado[i]) {
      console.log(`Posição ${i}: calculado="${hashCalculado[i]}" ≠ esperado="${hashEsperado[i]}"`);
    }
  }
}
