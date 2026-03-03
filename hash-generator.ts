// Script de Helper para Geração de Hash SHA256
// Use este arquivo para gerar o hash da senha do admin
// para inserir na tabela usuarios do Supabase

import crypto from 'crypto';

/**
 * Gera hash SHA256 de uma senha
 * @param senha - A senha em texto plano
 * @returns Hash SHA256 hexadecimal
 */
function gerarHashSenha(senha: string): string {
  return crypto
    .createHash('sha256')
    .update(senha)
    .digest('hex');
}

/**
 * Gera uma senha temporária segura
 * @returns Senha de 12 caracteres com números, letras minúsculas e maiúsculas
 */
function gerarSenhaTemporaria(): string {
  const minusculas = 'abcdefghijklmnopqrstuvwxyz';
  const maiusculas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numeros = '0123456789';
  const caracteres = minusculas + maiusculas + numeros;
  
  let senha = '';
  
  // Garantir pelo menos 1 número e 1 maiúscula
  senha += numeros[Math.floor(Math.random() * numeros.length)];
  senha += maiusculas[Math.floor(Math.random() * maiusculas.length)];
  
  // Preencher o resto
  for (let i = 0; i < 10; i++) {
    senha += caracteres[Math.floor(Math.random() * caracteres.length)];
  }
  
  // Embaralhar
  return senha
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

/**
 * Valida força de uma senha
 * @returns { isValida: boolean, mensagens: string[] }
 */
function validarForcaSenha(senha: string): { isValida: boolean; mensagens: string[] } {
  const mensagens: string[] = [];
  
  if (senha.length < 8) {
    mensagens.push('❌ Senha deve ter pelo menos 8 caracteres');
  }
  
  if (!/[a-z]/.test(senha)) {
    mensagens.push('❌ Deve conter letras minúsculas');
  }
  
  if (!/[A-Z]/.test(senha)) {
    mensagens.push('❌ Deve conter letras maiúsculas');
  }
  
  if (!/[0-9]/.test(senha)) {
    mensagens.push('❌ Deve conter números');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha)) {
    mensagens.push('⚠️ Recomendado incluir caracteres especiais: !@#$%^&*()');
  }
  
  return {
    isValida: mensagens.length === 0,
    mensagens: mensagens.length === 0 ? ['✅ Senha forte!'] : mensagens
  };
}

// ============================================
// MAIN - Exemplos de uso
// ============================================

if (require.main === module) {
  console.log('\n🔐 GERADOR DE HASH SHA256 - Sistema de Usuários\n');
  console.log('─'.repeat(60));
  
  // Exemplo 1: Hash para admin padrão
  console.log('\n1️⃣  Gerando hash para admin padrão:\n');
  const senhaAdmin = 'AdminSeguro2024!';
  const hashAdmin = gerarHashSenha(senhaAdmin);
  console.log(`   Senha: ${senhaAdmin}`);
  console.log(`   Hash:  ${hashAdmin}`);
  
  // Validar força
  const validacao = validarForcaSenha(senhaAdmin);
  console.log(`\n   Força da senha:`);
  validacao.mensagens.forEach(msg => console.log(`   ${msg}`));
  
  // Exemplo 2: Gerar senha temporária
  console.log('\n\n2️⃣  Gerando senha temporária:\n');
  const senhaTemp = gerarSenhaTemporaria();
  console.log(`   Senha: ${senhaTemp}`);
  console.log(`   Hash:  ${gerarHashSenha(senhaTemp)}`);
  
  // Exemplo 3: SQL UPDATE para Supabase
  console.log('\n\n3️⃣  SQL UPDATE para Supabase:\n');
  console.log(`   UPDATE usuarios SET`);
  console.log(`   senha_hash = '${hashAdmin}',`);
  console.log(`   updated_at = CURRENT_TIMESTAMP`);
  console.log(`   WHERE email = 'admin@seu-dominio.com';`);
  
  // Exemplo 4: Inserir novo usuário
  console.log('\n\n4️⃣  SQL INSERT para novo usuário:\n');
  const novaSenh = gerarSenhaTemporaria();
  console.log(`   INSERT INTO usuarios`);
  console.log(`   (email, nome, senha_hash, role, ativo, created_at, updated_at)`);
  console.log(`   VALUES (`);
  console.log(`     'novo.usuario@empresa.com',`);
  console.log(`     'Novo Usuário',`);
  console.log(`     '${gerarHashSenha(novaSenh)}',`);
  console.log(`     'usuario',`);
  console.log(`     true,`);
  console.log(`     CURRENT_TIMESTAMP,`);
  console.log(`     CURRENT_TIMESTAMP`);
  console.log(`   );`);
  console.log(`\n   ⚠️  Senha temporária: ${novaSenh}`);
  
  console.log('\n' + '─'.repeat(60));
  console.log('\n✅ Copie os comandos acima para o Supabase SQL Editor\n');
}

export { gerarHashSenha, gerarSenhaTemporaria, validarForcaSenha };
