import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { hashPassword } from './src/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'emendas.db'));

console.log('\n📊 Checking users in local database...\n');

try {
  const users = db.prepare('SELECT id, email, nome, role, ativo FROM usuarios ORDER BY id').all();
  
  if (users.length === 0) {
    console.log('⚠️  No users found in database');
    console.log('\nCreating a test user...');
    
    // Criar um usuário de teste
    const testEmail = 'admin@test.com';
    const testPassword = 'Senha123!';
    const hashedPassword = hashPassword(testPassword);
    
    db.prepare(`
      INSERT INTO usuarios (email, nome, role, senha_hash, ativo)
      VALUES (?, ?, ?, ?, ?)
    `).run(testEmail, 'Admin Teste', 'admin', hashedPassword, 1);
    
    console.log(`✓ Test user created:`);
    console.log(`  Email: ${testEmail}`);
    console.log(`  Password: ${testPassword}`);
    console.log(`  Role: admin`);
  } else {
    console.log(`✓ Found ${users.length} user(s):`);
    users.forEach((user: any) => {
      console.log(`  - ${user.email} (${user.nome}) - Role: ${user.role} - Ativo: ${user.ativo ? 'Sim' : 'Não'}`);
    });
  }
} catch (error) {
  console.error('❌ Error:', error);
} finally {
  db.close();
}
