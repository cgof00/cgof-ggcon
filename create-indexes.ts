import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
const envPath = path.join(__dirname, '.env.local');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  dotenv.config({ path: envPath });
} catch (err) {
  console.warn('⚠ .env.local não encontrado');
  dotenv.config();
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase não configurado');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createIndexes() {
  console.log('\n🗂️ CRIANDO ÍNDICES PARA MELHORAR PERFORMANCE\n');
  
  try {
    // Listar os campos que precisam de índices para filtros
    const indexes = [
      { table: 'formalizacao', column: 'ano' },
      { table: 'formalizacao', column: 'area_estagio' },
      { table: 'formalizacao', column: 'recurso' },
      { table: 'formalizacao', column: 'tecnico' },
      { table: 'formalizacao', column: 'situacao_analise' },
      { table: 'formalizacao', column: 'area_estagio_situacao' },
      { table: 'formalizacao', column: 'conferencista' },
      { table: 'formalizacao', column: 'falta_assinatura' },
      { table: 'formalizacao', column: 'publicacao' },
      { table: 'formalizacao', column: 'vigencia' },
      { table: 'formalizacao', column: 'parlamentar' },
      { table: 'formalizacao', column: 'partido' },
      { table: 'formalizacao', column: 'regional' },
      { table: 'formalizacao', column: 'municipio' },
      { table: 'formalizacao', column: 'conveniado' },
      { table: 'formalizacao', column: 'data_liberacao' },
      { table: 'formalizacao', column: 'data_analise' },
      { table: 'formalizacao', column: 'data_recebimento' },
      { table: 'formalizacao', column: 'data_retorno' },
      { table: 'emendas', column: 'parlamentar' },
      { table: 'emendas', column: 'beneficiario' },
      { table: 'emendas', column: 'objeto' },
    ];
    
    console.log('📋 Índices a criar:');
    indexes.forEach((idx, i) => {
      console.log(`   ${i + 1}. ${idx.table}.${idx.column}`);
    });
    console.log('');
    
    // RPC SQL para criar os índices
    // OBS: Você precisa executar isso manualmente no Supabase SQL editor com uma conta admin
    console.log('📝 SCRIPT SQL PARA EXECUTAR NO SUPABASE (SQL Editor):\n');
    console.log('-- Copie e execute este SQL no https://supabase.com/dashboard/project/_/sql');
    console.log('-- Na aba "SQL Editor" do seu projeto Supabase\n');
    
    let sqlScript = '';
    
    // Índices para formalizacao
    sqlScript += '-- Índices para tabela formalizacao\n';
    sqlScript += 'CREATE INDEX IF NOT EXISTS idx_formalizacao_ano ON public.formalizacao (ano);\n';
    sqlScript += 'CREATE INDEX IF NOT EXISTS idx_formalizacao_area_estagio ON public.formalizacao (area_estagio);\n';
    sqlScript += 'CREATE INDEX IF NOT EXISTS idx_formalizacao_recurso ON public.formalizacao (recurso);\n';
    sqlScript += 'CREATE INDEX IF NOT EXISTS idx_formalizacao_tecnico ON public.formalizacao (tecnico);\n';
    sqlScript += 'CREATE INDEX IF NOT EXISTS idx_formalizacao_situacao ON public.formalizacao (situacao_analise);\n';
    sqlScript += 'CREATE INDEX IF NOT EXISTS idx_formalizacao_area_sit ON public.formalizacao (area_estagio_situacao);\n';
    sqlScript += 'CREATE INDEX IF NOT EXISTS idx_formalizacao_conferencista ON public.formalizacao (conferencista);\n';
    sqlScript += 'CREATE INDEX IF NOT EXISTS idx_formalizacao_falta_assinatura ON public.formalizacao (falta_assinatura);\n';
    sqlScript += 'CREATE INDEX IF NOT EXISTS idx_formalizacao_publicacao ON public.formalizacao (publicacao);\n';
    sqlScript += 'CREATE INDEX IF NOT EXISTS idx_formalizacao_vigencia ON public.formalizacao (vigencia);\n';
    sqlScript += 'CREATE INDEX IF NOT EXISTS idx_formalizacao_parlamentar ON public.formalizacao (parlamentar);\n';
    sqlScript += 'CREATE INDEX IF NOT EXISTS idx_formalizacao_partido ON public.formalizacao (partido);\n';
    sqlScript += 'CREATE INDEX IF NOT EXISTS idx_formalizacao_regional ON public.formalizacao (regional);\n';
    sqlScript += 'CREATE INDEX IF NOT EXISTS idx_formalizacao_municipio ON public.formalizacao (municipio);\n';
    sqlScript += 'CREATE INDEX IF NOT EXISTS idx_formalizacao_conveniado ON public.formalizacao (conveniado);\n';
    sqlScript += 'CREATE INDEX IF NOT EXISTS idx_formalizacao_data_liberacao ON public.formalizacao (data_liberacao);\n';
    sqlScript += 'CREATE INDEX IF NOT EXISTS idx_formalizacao_data_analise ON public.formalizacao (data_analise);\n';
    sqlScript += 'CREATE INDEX IF NOT EXISTS idx_formalizacao_data_recebimento ON public.formalizacao (data_recebimento);\n';
    sqlScript += 'CREATE INDEX IF NOT EXISTS idx_formalizacao_data_retorno ON public.formalizacao (data_retorno);\n';
    sqlScript += '\n';
    
    // Índices para emendas
    sqlScript += '-- Índices para tabela emendas\n';
    sqlScript += 'CREATE INDEX IF NOT EXISTS idx_emendas_parlamentar ON public.emendas (parlamentar);\n';
    sqlScript += 'CREATE INDEX IF NOT EXISTS idx_emendas_beneficiario ON public.emendas (beneficiario);\n';
    sqlScript += 'CREATE INDEX IF NOT EXISTS idx_emendas_objeto ON public.emendas (objeto);\n';
    sqlScript += '\n';
    
    // Índices compostos úteis
    sqlScript += '-- Índices compostos para queries mais complexas\n';
    sqlScript += 'CREATE INDEX IF NOT EXISTS idx_formalizacao_ano_situacao ON public.formalizacao (ano, situacao_analise);\n';
    sqlScript += 'CREATE INDEX IF NOT EXISTS idx_formalizacao_ano_tecnico ON public.formalizacao (ano, tecnico);\n';
    
    console.log(sqlScript);
    
    console.log('\n📌 INSTRUÇÕES:');
    console.log('1. Acesse seu dashboard Supabase: https://supabase.com/dashboard');
    console.log('2. Selecione seu projeto');
    console.log('3. Vá para "SQL Editor" no menu lateral');
    console.log('4. Crie uma nova query');
    console.log('5. Cole o SQL acima');
    console.log('6. Clique em "Run" para executar');
    console.log('\n⏱️  Isso pode levar alguns minutos dependendo do tamanho dos dados.\n');
    
    // Salvar o script em um arquivo
    const fs = require('fs');
    fs.writeFileSync(
      path.join(__dirname, 'create-indexes.sql'),
      sqlScript,
      'utf-8'
    );
    console.log('✅ Script SQL salvo em: create-indexes.sql');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

createIndexes().then(() => {
  console.log('\n✨ Arquivo SQL gerado! Execute no Supabase SQL Editor.\n');
  process.exit(0);
}).catch(error => {
  console.error('Erro:', error);
  process.exit(1);
});
