import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function diagnose() {
  try {
    console.log('\n🔍 DIAGNÓSTICO DO BANCO DE DADOS\n');
    console.log('='.repeat(60));

    // 1. Verificar coluna usuario_atribuido_id
    console.log('\n1️⃣ Verificando coluna usuario_atribuido_id...');
    const { data: columns, error: colError } = await supabase
      .from('formalizacao')
      .select('usuario_atribuido_id')
      .limit(1);

    if (colError) {
      if (colError.message.includes('usuario_atribuido_id')) {
        console.log('❌ COLUNA NÃO EXISTE!');
        console.log('   Execute a migração: add-usuario-atribuido-column.sql');
        console.log('   Acesse: Supabase > SQL Editor > New Query');
      } else {
        console.log('❌ Outro erro:', colError.message);
      }
    } else {
      console.log('✅ Coluna existe');
    }

    // 2. Contar registros por tabela
    console.log('\n2️⃣ Contando registros...');
    const { count: formalizacaoCount } = await supabase
      .from('formalizacao')
      .select('*', { count: 'exact', head: true });
    console.log(`   Formalizações: ${formalizacaoCount || 'erro'}`);

    const { count: usuariosCount } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true });
    console.log(`   Usuários: ${usuariosCount || 'erro'}`);

    // 3. Buscar últimas atribuições
    console.log('\n3️⃣ Últimas atribuições (usuario_atribuido_id preenchido)...');
    const { data: atribuidas, error: atribError } = await supabase
      .from('formalizacao')
      .select('id, seq, tecnico, usuario_atribuido_id, updated_at')
      .not('usuario_atribuido_id', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (atribError) {
      console.log('❌ Erro ao buscar:', atribError.message);
    } else if (atribuidas && atribuidas.length > 0) {
      console.log(`✅ ${atribuidas.length} formalizações com técnico atribuído:`);
      atribuidas.forEach((f: any) => {
        console.log(`   - ID ${f.id}: "${f.seq}" | tecnico="${f.tecnico}" | usuario_id=${f.usuario_atribuido_id}`);
      });
    } else {
      console.log('⚠️  Nenhuma formalização com técnico atribuído yet');
    }

    // 4. Verificar índices
    console.log('\n4️⃣ Verificando índices de performance...');
    console.log('⏳ (Indices são críticos para velocidade com 37k+ registros)');

    const { data: indexInfo } = await supabase.rpc('get_table_indexes', { table_name: 'formalizacao' }).catch(() => ({ data: null }));
    if (indexInfo) {
      console.log('✅ Índices encontrados:', indexInfo);
    } else {
      console.log('⚠️  Resposta em branco (verificar console do Supabase)');
    }

    // 5. Performance test
    console.log('\n5️⃣ Teste de Performance...');
    const startSmall = Date.now();
    const { data: smallTest } = await supabase
      .from('formalizacao')
      .select('id, ano, tecnico')
      .limit(100);
    const smallTime = Date.now() - startSmall;
    console.log(`   100 registros: ${smallTime}ms`);

    const startLarge = Date.now();
    const { data: largeTest } = await supabase
      .from('formalizacao')
      .select('id, ano, tecnico')
      .limit(500);
    const largeTime = Date.now() - startLarge;
    console.log(`   500 registros: ${largeTime}ms`);

    if (largeTime > 2000) {
      console.log('   ⚠️  LENTO! (>2s para 500 registros)');
      console.log('   → Falta de índices ou conexão lenta');
    } else if (largeTime > 500) {
      console.log('   ⚠️  Moderado (500ms-2s)');
    } else {
      console.log('   ✅ Rápido (<500ms)');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📋 RECOMENDAÇÕES:\n');
    
    if (colError?.message.includes('usuario_atribuido_id')) {
      console.log('1. ⚠️  URGENTE: Execute a migração SQL para criar usuario_atribuido_id');
      console.log('2. Vá para: Supabase Dashboard > SQL Editor');
      console.log('3. Copie e execute: add-usuario-atribuido-column.sql\n');
    }

    console.log('4. Adicione mais índices para performance (ver PERFORMANCE_OPTIMIZATION.md)');
    console.log('5. Use paginação no frontend (já implementada)');
    console.log('6. Implemente cache agressivo\n');

  } catch (error) {
    console.error('❌ Erro crítico:', error);
  }
}

diagnose();
