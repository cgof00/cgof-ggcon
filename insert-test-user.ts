import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dvziqqcgjuidtkhoeqdc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2emlxY2dqdWlkdGtwaG9lcWRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjExNjQwMSwiZXhwIjoyMDg3NjkyNDAxfQ.bAgun92X0530xUXg_Wa5hrCAkLL-P8O44usT8o2_Mr8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function insertUser() {
  const { data, error } = await supabase
    .from('usuarios')
    .insert({
      email: 'afpereira@saude.sp.gov.br',
      nome: 'A. Pereira',
      senha_hash: 'dc629bb06dd19df11511b2f25fff150d5f73832cae03151c1ce361bc2494d3eb',
      role: 'admin',
      ativo: true,
    })
    .select();

  if (error) {
    console.error('❌ Erro ao inserir usuário:', error);
  } else {
    console.log('✅ Usuário inserido com sucesso:', data);
  }
}

insertUser();
