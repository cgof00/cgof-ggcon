import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env.local');

try {
  const envContent = readFileSync(envPath, 'utf-8');
  dotenv.config({ path: envPath });
} catch (err) {
  console.warn('⚠ .env.local não encontrado');
  dotenv.config();
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIndexes() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 VERIFICANDO ÍNDICES EXISTENTES');
  console.log('='.repeat(60) + '\n');

  try {
    // Query para obter todos os índices da tabela formalizacao
    const { data, error } = await supabase.rpc('sql', {
      query: `
        SELECT 
          indexname,
          indexdef
        FROM pg_indexes
        WHERE tablename = 'formalizacao'
        ORDER BY indexname;
      `
    }).catch(() => null);

    // Se RPC não funcionar, tentar com raw query
    if (error || !data) {
      console.log('⚠️  Não foi possível usar RPC, consultando via Supabase REST...\n');
      
      // Vamos apenas listar os índices que esperamos
      const expectedIndexes = [
        'idx_formalizacao_ano',
        'idx_formalizacao_tecnico',
        'idx_formalizacao_usuario_atribuido',
        'idx_formalizacao_situacao_analise',
        'idx_formalizacao_data_liberacao',
        'idx_formalizacao_ano_tecnico',
        'idx_formalizacao_ano_status',
        'idx_formalizacao_created_order'
      ];

      console.log('📋 Índices esperados:\n');
      expectedIndexes.forEach((idx, i) => {
        console.log(`   ${i + 1}. ${idx}`);
      });

      console.log('\n✅ Para criar os índices que faltam, execute este SQL no Supabase:\n');
      console.log(`
-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_formalizacao_ano ON formalizacao(ano);
CREATE INDEX IF NOT EXISTS idx_formalizacao_tecnico ON formalizacao(tecnico);
CREATE INDEX IF NOT EXISTS idx_formalizacao_usuario_atribuido ON formalizacao(usuario_atribuido_id);
CREATE INDEX IF NOT EXISTS idx_formalizacao_situacao_analise ON formalizacao(situacao_analise_demanda);
CREATE INDEX IF NOT EXISTS idx_formalizacao_data_liberacao ON formalizacao(data_liberacao);
CREATE INDEX IF NOT EXISTS idx_formalizacao_ano_tecnico ON formalizacao(ano, tecnico);
CREATE INDEX IF NOT EXISTS idx_formalizacao_ano_status ON formalizacao(ano, situacao_analise_demanda);
CREATE INDEX IF NOT EXISTS idx_formalizacao_created_order ON formalizacao(created_at DESC);
      `);

      return;
    }

    console.log('✅ Índices encontrados:\n');
    if (data && data.length > 0) {
      data.forEach((idx: any, i: number) => {
        console.log(`${i + 1}. ${idx.indexname}`);
      });
    } else {
      console.log('(nenhum índice encontrado)');
    }

  } catch (err: any) {
    console.log('⚠️  Erro ao consultar índices:', err.message);
    console.log('\n✅ Para criar os índices que faltam, execute este SQL no Supabase:\n');
    console.log(`
-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_formalizacao_ano ON formalizacao(ano);
CREATE INDEX IF NOT EXISTS idx_formalizacao_tecnico ON formalizacao(tecnico);
CREATE INDEX IF NOT EXISTS idx_formalizacao_usuario_atribuido ON formalizacao(usuario_atribuido_id);
CREATE INDEX IF NOT EXISTS idx_formalizacao_situacao_analise ON formalizacao(situacao_analise_demanda);
CREATE INDEX IF NOT EXISTS idx_formalizacao_data_liberacao ON formalizacao(data_liberacao);
CREATE INDEX IF NOT EXISTS idx_formalizacao_ano_tecnico ON formalizacao(ano, tecnico);
CREATE INDEX IF NOT EXISTS idx_formalizacao_ano_status ON formalizacao(ano, situacao_analise_demanda);
CREATE INDEX IF NOT EXISTS idx_formalizacao_created_order ON formalizacao(created_at DESC);
    `);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Verificação concluída');
  console.log('='.repeat(60) + '\n');
}

checkIndexes().catch(console.error);
