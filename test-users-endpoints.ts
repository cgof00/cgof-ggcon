// Script de Teste para Validar Endpoints CRUD de Usuários
// Execute com: npx ts-node test-users-endpoints.ts

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4000';

interface TestResult {
  endpoint: string;
  method: string;
  status: string;
  expected: number;
  actual: number;
  passed: boolean;
  response?: any;
  error?: string;
}

const results: TestResult[] = [];

// Estado global do teste
let adminToken = '';
let userId = 0;
let userToken = '';

/**
 * Função auxiliar para fazer requests
 */
async function request(
  method: string,
  endpoint: string,
  body?: any,
  token?: string
): Promise<{ status: number; data: any }> {
  try {
    const options: any = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();

    return {
      status: response.status,
      data,
    };
  } catch (error: any) {
    throw new Error(`Request failed: ${error.message}`);
  }
}

/**
 * Registra resultado do teste
 */
function logResult(
  endpoint: string,
  method: string,
  expected: number,
  actual: number,
  response?: any,
  error?: string
) {
  const passed = actual === expected;
  results.push({
    endpoint,
    method,
    status: passed ? '✅' : '❌',
    expected,
    actual,
    passed,
    response,
    error,
  });
  
  console.log(`\n${passed ? '✅' : '❌'} ${method} ${endpoint}`);
  console.log(`   Expected: ${expected}, Got: ${actual}`);
  if (error) console.log(`   Error: ${error}`);
  if (response?.message) console.log(`   Message: ${response.message}`);
}

/**
 * Testes Principais
 */
async function runTests() {
  console.log('🧪 Iniciando testes de endpoints CRUD de usuários\n');
  console.log('═'.repeat(60));

  // ============================================
  // 1. LOGIN - Obter token de admin
  // ============================================
  console.log('\n\n📋 TESTE 1: Login (Admin)');
  console.log('─'.repeat(60));

  try {
    const res = await request('POST', '/api/login', {
      email: 'admin@seu-dominio.com',
      senha: 'AdminSeguro2024!',
    });

    logResult('/api/login', 'POST', 200, res.status, res.data);

    if (res.status === 200 && res.data.token) {
      adminToken = res.data.token;
      console.log('✅ Token obtido com sucesso');
    } else {
      console.log('❌ Não foi possível obter token');
      process.exit(1);
    }
  } catch (error: any) {
    logResult('/api/login', 'POST', 200, 500, undefined, error.message);
    process.exit(1);
  }

  // ============================================
  // 2. GET USUARIOS - Listar todos os usuários
  // ============================================
  console.log('\n\n📋 TESTE 2: Listar Usuários');
  console.log('─'.repeat(60));

  try {
    const res = await request('GET', '/api/usuarios', undefined, adminToken);
    logResult('/api/usuarios', 'GET', 200, res.status, res.data);

    if (res.status === 200 && Array.isArray(res.data)) {
      console.log(`✅ Total de usuários: ${res.data.length}`);
    }
  } catch (error: any) {
    logResult('/api/usuarios', 'GET', 200, 500, undefined, error.message);
  }

  // ============================================
  // 3. CREATE USUARIO - Criar novo usuário
  // ============================================
  console.log('\n\n📋 TESTE 3: Criar Novo Usuário');
  console.log('─'.repeat(60));

  const timestamp = Date.now();
  const newUserEmail = `teste.user.${timestamp}@empresa.com`;

  try {
    const res = await request(
      'POST',
      '/api/admin/usuarios',
      {
        email: newUserEmail,
        nome: 'Usuário Teste',
        role: 'usuario',
      },
      adminToken
    );

    logResult('/api/admin/usuarios', 'POST', 201, res.status, res.data);

    if (res.status === 201 && res.data.usuario?.id) {
      userId = res.data.usuario.id;
      userToken = Buffer.from(
        JSON.stringify({
          userId,
          email: newUserEmail,
          role: 'usuario',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
        })
      ).toString('base64');
      console.log(`✅ Usuário criado: ID ${userId}`);
      console.log(`✅ Email: ${newUserEmail}`);
      console.log(`✅ Senha temporária: ${res.data.senhaTemporaria}`);
    }
  } catch (error: any) {
    logResult('/api/admin/usuarios', 'POST', 201, 500, undefined, error.message);
  }

  // ============================================
  // 4. UPDATE USUARIO - Atualizar usuário
  // ============================================
  console.log('\n\n📋 TESTE 4: Atualizar Usuário');
  console.log('─'.repeat(60));

  if (userId) {
    try {
      const res = await request(
        'PUT',
        `/api/usuarios/${userId}`,
        {
          nome: 'Usuário Teste Atualizado',
          role: 'admin',
        },
        adminToken
      );

      logResult(`/api/usuarios/${userId}`, 'PUT', 200, res.status, res.data);

      if (res.status === 200) {
        console.log(`✅ Usuário atualizado`);
        console.log(`   Novo nome: ${res.data.usuario?.nome}`);
        console.log(`   Novo role: ${res.data.usuario?.role}`);
      }
    } catch (error: any) {
      logResult(
        `/api/usuarios/${userId}`,
        'PUT',
        200,
        500,
        undefined,
        error.message
      );
    }
  }

  // ============================================
  // 5. GET USUARIOS (USER) - Usuário padrão não pode acessar
  // ============================================
  console.log('\n\n📋 TESTE 5: Verificar Acesso de Usuário Padrão');
  console.log('─'.repeat(60));

  // Criar novo usuário padrão (não admin) para este teste
  const timestamp2 = Date.now();
  const standardUserEmail = `teste.standard.${timestamp2}@empresa.com`;

  try {
    // Criar usuário padrão
    const createRes = await request(
      'POST',
      '/api/admin/usuarios',
      {
        email: standardUserEmail,
        nome: 'Usuário Padrão Teste',
        role: 'usuario',
      },
      adminToken
    );

    if (createRes.status === 201) {
      const standardUserToken = Buffer.from(
        JSON.stringify({
          userId: createRes.data.usuario.id,
          email: standardUserEmail,
          role: 'usuario',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
        })
      ).toString('base64');

      // Tentar acessar /api/usuarios com token de usuário padrão
      const res = await request('GET', '/api/usuarios', undefined, standardUserToken);
      logResult(
        '/api/usuarios (como usuário padrão)',
        'GET',
        403,
        res.status,
        res.data
      );

      if (res.status === 403) {
        console.log('✅ Acesso negado corretamente para usuário padrão');
      }
    }
  } catch (error: any) {
    console.log(`❌ Erro ao testar acesso: ${error.message}`);
  }

  // ============================================
  // 6. DELETE USUARIO - Soft delete
  // ============================================
  console.log('\n\n📋 TESTE 6: Deletar Usuário (Soft Delete)');
  console.log('─'.repeat(60));

  if (userId) {
    try {
      const res = await request(
        'DELETE',
        `/api/admin/usuarios/${userId}`,
        undefined,
        adminToken
      );

      logResult(`/api/admin/usuarios/${userId}`, 'DELETE', 200, res.status, res.data);

      if (res.status === 200) {
        console.log(`✅ Usuário desativado`);
        console.log(`   Status: ${res.data.usuario?.ativo ? 'Ativo' : 'Inativo'}`);
      }
    } catch (error: any) {
      logResult(
        `/api/admin/usuarios/${userId}`,
        'DELETE',
        200,
        500,
        undefined,
        error.message
      );
    }
  }

  // ============================================
  // 7. FORMALIZACAO COM FILTRO - Testar filtro por tecnico
  // ============================================
  console.log('\n\n📋 TESTE 7: Filtro de Acesso em Formalizações');
  console.log('─'.repeat(60));

  try {
    const adminRes = await request(
      'GET',
      '/api/formalizacao',
      undefined,
      adminToken
    );
    console.log(`\n📊 Resultados como ADMIN:`);
    if (adminRes.status === 200) {
      console.log(`   Total de registros: ${Array.isArray(adminRes.data) ? adminRes.data.length : 'N/A'}`);
      logResult('/api/formalizacao (admin)', 'GET', 200, adminRes.status);
    } else {
      logResult('/api/formalizacao (admin)', 'GET', 200, adminRes.status, adminRes.data);
    }
  } catch (error: any) {
    logResult(
      '/api/formalizacao (admin)',
      'GET',
      200,
      500,
      undefined,
      error.message
    );
  }

  // ============================================
  // Resumo dos Testes
  // ============================================
  console.log('\n\n');
  console.log('═'.repeat(60));
  console.log('📊 RESUMO DOS TESTES');
  console.log('═'.repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const percentage = ((passed / total) * 100).toFixed(1);

  console.log(`\n✅ Passou: ${passed}/${total} (${percentage}%)\n`);

  results.forEach((r) => {
    console.log(`${r.status} ${r.method.padEnd(6)} ${r.endpoint.padEnd(40)} [${r.expected} → ${r.actual}]`);
  });

  console.log('\n' + '═'.repeat(60));
  if (passed === total) {
    console.log('🎉 TODOS OS TESTES PASSARAM!');
  } else {
    console.log(`⚠️  ${total - passed} teste(s) falharam`);
  }
  console.log('═'.repeat(60) + '\n');
}

// Executar testes
runTests().catch(console.error);
