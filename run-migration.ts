import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurada');
  console.error('   Configure as variáveis de ambiente no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runMigration() {
  try {
    console.log('🔄 Executando migração para adicionar usuario_atribuido_id...\n');

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'add-usuario-atribuido-column.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📝 SQL a executar:\n', sqlContent);
    console.log('\n🔄 Executando...\n');

    // Executar cada comando SQL
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--'));

    for (const command of commands) {
      try {
        console.log(`⏳ Executando: ${command.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: command });

        if (error) {
          console.error(`❌ Erro: ${error.message}`);
          // Continuar com próximo comando
        } else {
          console.log(`✅ Sucesso`);
        }
      } catch (e: any) {
        console.error(`⚠️  ${e.message}`);
      }
    }

    console.log('\n✅ Migração concluída!');
  } catch (error) {
    console.error('❌ Erro ao executar migração:', error);
    process.exit(1);
  }
}

runMigration();
