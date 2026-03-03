import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { hashPassword } from './src/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'emendas.db'));

console.log('\n🔧 Inicializando banco de dados...\n');

try {
  // Criar tabela usuarios se não existir
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      nome TEXT NOT NULL,
      role TEXT DEFAULT 'usuario',
      senha_hash TEXT NOT NULL,
      ativo BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('✓ Tabela usuarios criada/verificada');

  const testEmail = 'admin@test.com';
  const testPassword = 'Senha123!';
  
  // Verificar se the user já existe
  const existingUser = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(testEmail);
  
  if (!existingUser) {
    const hashedPassword = hashPassword(testPassword);
    
    db.prepare(`
      INSERT INTO usuarios (email, nome, role, senha_hash, ativo)
      VALUES (?, ?, ?, ?, ?)
    `).run(testEmail, 'Admin Teste', 'admin', hashedPassword, 1);

    console.log('✓ Usuário de teste criado com sucesso!');
  } else {
    console.log('ℹ️  Usuário de teste já existe');
  }
  
  console.log('\n📋 Credenciais de login:');
  console.log(`   Email: ${testEmail}`);
  console.log(`   Senha: ${testPassword}`);
  console.log('\n✅ Banco de dados initiado!\n');
  
} catch (error) {
  console.error('❌ Erro:', error);
  process.exit(1);
} finally {
  db.close();
}
