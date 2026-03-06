import express from "express";
import { createServer as createViteServer } from "vite";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import https from "https";
import { hashPassword, verifyPassword, generateToken, verifyToken } from "./src/auth.ts";

// Permitir certificados auto-assinados em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local file manually (apenas em desenvolvimento)
const envPath = path.join(__dirname, '.env.local');
console.log('Procurando .env.local em:', envPath);

try {
  const envContent = readFileSync(envPath, 'utf-8');
  console.log('✓ Arquivo .env.local encontrado');
  dotenv.config({ path: envPath });
} catch (err) {
  console.warn('⚠ .env.local não encontrado - em produção, usando variáveis do sistema');
}

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERRO FATAL: SUPABASE_URL ou SUPABASE_KEY não configurados!');
  console.error('❌ Configure as variáveis de ambiente no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Supabase conectado com banco de dados REAL');
console.log('   URL:', supabaseUrl);


async function startServer() {
const app = express();
  const PORT = 4000;

  // ⚡ Cache em memória para dados (muito mais rápido)
  let formalizacaoCache: any[] | null = null;
  let formalizacaoCacheTimestamp = 0;
  let isCachingFormalizacao = false;
  
  let filterCache: Record<string, string[]> | null = null;
  let filterCacheTimestamp = 0;
  
  // Cache para filtros por role com TTL
  let filtersCache: Record<string, { data: Record<string, string[]>, timestamp: number }> = {};
  
  const FORMALIZACAO_CACHE_TTL = 10 * 60 * 1000; // 10 minutos
  const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

  app.use(compression({ level: 6, threshold: 1024 })); // Comprimir respostas > 1KB
  app.use(express.json({ limit: '200mb' }));
  app.use(express.urlencoded({ limit: '200mb', extended: true }));

  // ✅ Health check - sem autenticação, responde imediatamente
  app.get("/api/health", (req, res) => {
    console.log('🏥 GET /api/health - Respondendo...');
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  // Log de status do Supabase
  console.log('\n--- STATUS DA CONEXÃO SUPABASE ---');
  console.log('Supabase URL:', supabaseUrl ? '✓ Configurada' : '✗ NÃO CONFIGURADA');
  console.log('Supabase URL Value:', supabaseUrl);
  console.log('Supabase Key:', supabaseKey ? '✓ Configurada' : '✗ NÃO CONFIGURADA');
  console.log('Supabase Key Length:', supabaseKey?.length || 0);
  console.log('Supabase Client:', supabase ? '✓ Conectado' : '✗ NÃO CONECTADO');
  console.log('');
  
  if (!supabase) {
    console.error('❌ ERRO: Supabase não foi inicializado!');
    console.error('Verifique se as variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão no .env.local');
  } else {
    console.log('✓ Supabase cliente criado com sucesso');
  }
  
  if (supabaseUrl) {
    if (supabaseUrl.includes('supabase.com/dashboard')) {
      console.error('❌ ERRO CRÍTICO: Você configurou a URL do Dashboard em vez da URL da API!');
    } else if (!supabaseUrl.startsWith('https://')) {
      console.warn('⚠ AVISO: A URL do Supabase deve começar com https://');
    } else {
      console.log('✓ URL do Supabase válida');
    }
  }

  // API Routes
  app.get("/api/status", (req, res) => {
    res.json({
      supabase: !!supabase,
      url: !!supabaseUrl && supabaseUrl.trim() !== "",
      key: !!supabaseKey && supabaseKey.trim() !== "",
      env: process.env.NODE_ENV
    });
  });

  // 🔧 Endpoint de DEBUG
  app.get("/api/debug/cache", async (req, res) => {
    try {
      const now = Date.now();
      const cacheAge = formalizacaoCache ? Math.round((now - formalizacaoCacheTimestamp) / 1000) : null;
      const isCaching = isCachingFormalizacao;

      // Contar registros no banco
      const { count: totalInDb } = await supabase
        .from("formalizacao")
        .select("*", { count: "exact", head: true });

      res.json({
        cache: {
          status: formalizacaoCache ? 'READY' : 'EMPTY',
          records: formalizacaoCache?.length || 0,
          ageSeconds: cacheAge,
          ttlSeconds: Math.round(FORMALIZACAO_CACHE_TTL / 1000),
          isCaching,
          canServe: !!formalizacaoCache
        },
        database: {
          totalRecords: totalInDb,
          pageSize: 1000
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 🚀 Endpoint para pré-carregar cache na inicialização
  app.post("/api/debug/warmup-cache", async (req, res) => {
    try {
      console.log('\n🔥 WARMUP: Pré-carregando cache de formalizações...');
      const start = Date.now();
      
      const data = await getAllFormalizacoes();
      
      const duration = Date.now() - start;
      res.json({
        success: true,
        message: `Cache aquecido com ${data.length} registros em ${duration}ms`,
        records: data.length,
        durationMs: duration
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Middleware para verificar autenticação
  const authMiddleware = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
    req.user = decoded;
    next();
  };

  // 🧹 Página de limpeza de dados
  app.get("/cleanup", (req, res) => {
    try {
      const cleanupFile = path.join(process.cwd(), 'cleanup.html');
      if (fs.existsSync(cleanupFile)) {
        const html = fs.readFileSync(cleanupFile, 'utf-8');
        res.type('text/html').send(html);
      } else {
        res.status(404).send('Arquivo cleanup.html não encontrado');
      }
    } catch (error) {
      res.status(500).send('Erro ao servir página de cleanup');
    }
  });

  // Endpoints de Autenticação
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, senha } = req.body;
      console.log('\n🔐 POST /api/auth/login');
      console.log('  Email:', email);
      console.log('  Senha recebida:', senha);

      if (supabase) {
        console.log('  Consultando Supabase...');
        
        let data = null, error = null;
        let tentativas = 0;
        const maxTentativas = 2;
        
        while (tentativas < maxTentativas) {
          try {
            const resultado = await supabase
              .from("usuarios")
              .select("id, email, nome, role, senha_hash, ativo")
              .ilike("email", email)
              .single();
            
            data = resultado.data;
            error = resultado.error;
            
            if (!error) {
              console.log('✅ Query Supabase bem-sucedida');
              break; // Sucesso, sair do loop
            }
            
            tentativas++;
            if (tentativas < maxTentativas) {
              console.log(`  ⏳ Tentativa ${tentativas} falhou (${error?.message}), tentando de novo...`);
              await new Promise(r => setTimeout(r, 1000)); // Espera 1s e tenta novamente
            } else {
              console.log(`  ⏳ Última tentativa ${tentativas} falhou`);
            }
          } catch (e) {
            console.log(`  ⚠️ Catch exception em tentativa ${tentativas + 1}:`, String(e));
            error = e;
            tentativas++;
            if (tentativas < maxTentativas) {
              console.log(`  ⏳ Tentando novamente...`);
              await new Promise(r => setTimeout(r, 1000));
            }
          }
        }

        // Se falhou e foi erro de DNS, usar mock
        if (error && error?.message?.includes?.('ENOTFOUND') || error?.details?.includes?.('ENOTFOUND')) {
          console.log('⚠️ Erro de DNS detectado - tentando com mock local...');
          const { createClientMock } = await import("./supabase-mock.ts");
          const supabaseMock = createClientMock();
          
          const { data: dataMock, error: errorMock } = await supabaseMock
            .from("usuarios")
            .select("id, email, nome, role, senha_hash, ativo")
            .ilike("email", email)
            .single();
          
          if (errorMock) {
            console.log('❌ Também falhou no mock:', errorMock.message);
            return res.status(401).json({ error: "Email ou senha inválidos" });
          }
          
          data = dataMock;
          error = null;
          console.log('✅ Mock respondeu com sucesso - usando dados locais');
        } else if (error) {
          console.log('❌ ERRO DETALHADO na query Supabase:');
          console.log('   Message:', error.message);
          console.log('   Code:', error.code);
          console.log('   Details:', error.details);
          return res.status(401).json({ error: "Email ou senha inválidos" });
        }
        

        if (!data) {
          console.log('❌ Usuário não encontrado');
          return res.status(401).json({ error: "Email ou senha inválidos" });
        }

        console.log('✓ Usuário encontrado:', data.email);
        console.log('  Hash no banco:', data.senha_hash);
        
        if (!data.ativo) {
          console.log('❌ Usuário inativo');
          return res.status(401).json({ error: "Usuário desativado" });
        }

        const hashCalculado = hashPassword(senha);
        console.log('  Hash calculado:', hashCalculado);
        console.log('  Batem?', hashCalculado === data.senha_hash ? '✅ SIM!' : '❌ NÃO');
        
        if (!verifyPassword(senha, data.senha_hash)) {
          console.log('❌ Senha incorreta - hash não bate');
          return res.status(401).json({ error: "Email ou senha inválidos" });
        }

        const token = generateToken(data.id, data.email, data.role);
        console.log('✓ Login bem-sucedido:', data.email, '- Role:', data.role);
        return res.json({
          token,
          user: {
            id: data.id,
            email: data.email,
            nome: data.nome,
            role: data.role,
          },
        });
      }

      res.status(500).json({ error: "Supabase não configurado" });
    } catch (error) {
      console.error('❌ Erro em /api/auth/login:', error);
      res.status(500).json({ error: "Erro ao fazer login", details: String(error) });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, senha, nome, role } = req.body;
      console.log('\n📝 POST /api/auth/register - Email:', email);

      if (!email || !senha || !nome) {
        return res.status(400).json({ error: "Email, senha e nome são obrigatórios" });
      }

      if (supabase) {
        const senhaHash = hashPassword(senha);

        const { data, error } = await supabase
          .from("usuarios")
          .insert({
            email,
            senha_hash: senhaHash,
            nome,
            role: role || 'usuario',
            ativo: true,
          })
          .select("id, email, nome, role")
          .single();

        if (error) {
          console.error('❌ Erro ao registrar:', error);
          return res.status(400).json({ error: error.message || "Erro ao registrar usuário" });
        }

        const token = generateToken(data.id, data.email, data.role);
        console.log('✓ Usuário registrado:', data.email, '- Role:', data.role);
        return res.status(201).json({
          token,
          user: {
            id: data.id,
            email: data.email,
            nome: data.nome,
            role: data.role,
          },
        });
      }

      res.status(500).json({ error: "Supabase não configurado" });
    } catch (error) {
      console.error('❌ Erro em /api/auth/register:', error);
      res.status(500).json({ error: "Erro ao registrar", details: String(error) });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: any, res) => {
    try {
      console.log('\n👤 GET /api/auth/me - User:', req.user.email);
      res.json({ user: req.user });
    } catch (error) {
      console.error('❌ Erro em /api/auth/me:', error);
      res.status(500).json({ error: "Erro ao obter usuário" });
    }
  });

  // Lista de usuários (apenas para admin)
  app.get("/api/usuarios", authMiddleware, async (req: any, res) => {
    try {
      console.log('\n👥 GET /api/usuarios - User:', req.user.email, 'Role:', req.user.role);

      if (req.user.role !== 'admin') {
        console.log('❌ Acesso negado - user role:', req.user.role);
        return res.status(403).json({ error: "Acesso negado" });
      }

      if (!supabase) {
        console.log('⚠️ Supabase não está configurado');
        return res.json([]);
      }

      const { data, error } = await supabase
        .from("usuarios")
        .select("id, email, nome, role, ativo, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error('❌ Erro Supabase:', error);
        throw error;
      }

      console.log('✅ Usuários obtidos:', data?.length || 0);
      return res.json(data || []);
    } catch (error) {
      console.error('❌ Erro em /api/usuarios:', error);
      res.status(500).json({ error: "Erro ao buscar usuários", details: String(error) });
    }
  });

  // Atualizar usuário (admin)
  app.put("/api/usuarios/:id", authMiddleware, async (req: any, res) => {
    try {
      console.log('\n' + '='.repeat(60));
      console.log('✏️ INICIANDO PUT /api/usuarios/:id');
      console.log('='.repeat(60));
      
      const { id } = req.params;
      const { role, ativo, nome } = req.body;

      console.log('✅ 1️⃣ Parâmetros extraídos:');
      console.log('   - ID:', id);
      console.log('   - Updates:', { role, ativo, nome });
      console.log('   - User role:', req.user.role);

      if (req.user.role !== 'admin') {
        console.log('❌ Usuário não é admin');
        return res.status(403).json({ error: "Acesso negado" });
      }

      console.log('✅ 2️⃣ Usuário é admin');

      if (!id) {
        console.log('❌ ID não fornecido');
        return res.status(400).json({ error: "ID do usuário é obrigatório" });
      }

      console.log('✅ 3️⃣ ID validado');

      if (!supabase) {
        console.log('❌ Supabase não configurado');
        return res.status(500).json({ error: "Supabase não configurado" });
      }

      console.log('✅ 4️⃣ Supabase conectado');

      // Preparar objeto com apenas campos que podem ser atualizados
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString()
      };

      if (role !== undefined) updateData.role = role;
      if (ativo !== undefined) updateData.ativo = ativo;
      if (nome !== undefined) updateData.nome = nome;

      console.log('✅ 5️⃣ Dados de atualização preparados:', updateData);
      console.log('✅ 6️⃣ Iniciando UPDATE no Supabase...');

      const { data, error } = await supabase
        .from("usuarios")
        .update(updateData)
        .eq("id", parseInt(id))
        .select("id, email, nome, role, ativo, created_at, updated_at")
        .single();

      console.log('✅ 7️⃣ UPDATE completado');

      if (error) {
        console.error('❌ 8️⃣ Erro Supabase na resposta:', error);
        return res.status(400).json({ error: error.message || "Erro ao atualizar usuário" });
      }

      console.log('✅ 8️⃣ Sem erros no Supabase');
      console.log('✅ 9️⃣ Usuário atualizado:', data?.email);
      console.log('📤 🔟 Enviando resposta 200...');
      
      return res.json({ success: true, usuario: data });
    } catch (error) {
      console.error('❌ ⚠️ ERRO CAPTURADO em /api/usuarios PUT:', error);
      console.error('   Tipo:', error?.constructor?.name);
      console.error('   Mensagem:', error?.message);
      console.error('   Stack:', error?.stack);
      res.status(500).json({ error: "Erro ao atualizar usuário", details: String(error) });
    }
  });

  // Criar novo usuário (apenas admin)
  app.post("/api/admin/usuarios", authMiddleware, async (req: any, res) => {
    try {
      console.log('\n' + '='.repeat(60));
      console.log('🟢 INICIANDO POST /api/admin/usuarios');
      console.log('='.repeat(60));
      console.log('⏰ Timestamp:', new Date().toISOString());
      console.log('👤 User role:', req.user.role);
      console.log('📦 Request body:', JSON.stringify(req.body));
      
      const { email, nome, role, senha } = req.body;

      console.log('\n✅ 1️⃣ Parâmetros extraídos:');
      console.log('   - Email:', email);
      console.log('   - Nome:', nome);
      console.log('   - Role:', role);
      console.log('   - Senha fornecida:', !!senha);

      if (req.user.role !== 'admin') {
        console.log('❌ Usuário não é admin');
        return res.status(403).json({ error: "Acesso negado" });
      }

      console.log('✅ 2️⃣ Usuário é admin');

      if (!email || !nome) {
        console.log('❌ Email ou nome faltando');
        return res.status(400).json({ error: "Email e nome são obrigatórios" });
      }

      console.log('✅ 3️⃣ Email e nome validados');

      if (!['admin', 'usuario'].includes(role || 'usuario')) {
        console.log('❌ Role inválido');
        return res.status(400).json({ error: "Role inválido - deve ser 'admin' ou 'usuario'" });
      }

      console.log('✅ 4️⃣ Role validado');

      if (!supabase) {
        console.log('❌ Supabase não configurado');
        return res.status(500).json({ error: "Supabase não configurado" });
      }

      console.log('✅ 5️⃣ Supabase conectado');

      // Se senha foi fornecida, usar; caso contrário gerar senha aleatória
      let senhaTemp = senha;
      if (!senhaTemp) {
        senhaTemp = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 3).toUpperCase() + Math.random().toString(36).substring(2, 3).toUpperCase();
      }
      const senhaHash = hashPassword(senhaTemp);

      console.log('✅ 6️⃣ Senha gerada/fornecida:', senhaTemp.substring(0, 3) + '****');
      console.log('   - Hash:', senhaHash.substring(0, 10) + '...');

      console.log('✅ 7️⃣ Iniciando INSERT no Supabase...');
      const { data, error } = await supabase
        .from("usuarios")
        .insert({
          email: email.toLowerCase().trim(),
          nome,
          role: role || 'usuario',
          senha_hash: senhaHash,
          ativo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select("id, email, nome, role, ativo, created_at")
        .single();

      console.log('✅ 8️⃣ INSERT completado');

      if (error) {
        console.error('❌ 9️⃣ Erro Supabase na resposta:', error);
        if (error.message?.includes('duplicate')) {
          return res.status(400).json({ error: "Este email já está cadastrado" });
        }
        return res.status(400).json({ error: error.message || "Erro ao criar usuário" });
      }

      console.log('✅ 9️⃣ Sem erros no Supabase');
      console.log('✅ 🔟 Usuário criado com sucesso:', data?.email, '- Role:', data?.role);
      console.log('📤 11️⃣ Enviando resposta 201...');
      
      const responseData = {
        usuario: data,
        senhaTemporaria: senhaTemp,
        aviso: !senha ? "Compartilhe a senha temporária com o usuário. Ele deverá trocá-la no primeiro login." : "Usuário criado com sucesso com a senha fornecida."
      };
      
      console.log('📤 Resposta:', JSON.stringify(responseData));
      return res.status(201).json(responseData);
    } catch (error) {
      console.error('❌ ⚠️ ERRO CAPTURADO em /api/admin/usuarios POST:', error);
      console.error('   Tipo:', error?.constructor?.name);
      console.error('   Mensagem:', error?.message);
      console.error('   Stack:', error?.stack);
      res.status(500).json({ error: "Erro ao criar usuário", details: String(error) });
    }
  });

  // Deletar usuário (apenas admin)
  app.delete("/api/admin/usuarios/:id", authMiddleware, async (req: any, res) => {
    try {
      console.log('\n' + '='.repeat(60));
      console.log('🗑️ INICIANDO DELETE /api/admin/usuarios/:id');
      console.log('='.repeat(60));
      
      const { id } = req.params;
      const { senha } = req.body;

      console.log('✅ 1️⃣ Parâmetros extraídos:');
      console.log('   - ID:', id);
      console.log('   - User role:', req.user.role);
      console.log('   - Senha fornecida:', !!senha);

      if (req.user.role !== 'admin') {
        console.log('❌ Usuário não é admin');
        return res.status(403).json({ error: "Acesso negado" });
      }

      console.log('✅ 2️⃣ Usuário é admin');

      if (!id) {
        console.log('❌ ID não fornecido');
        return res.status(400).json({ error: "ID do usuário é obrigatório" });
      }

      if (!senha) {
        console.log('❌ Senha não fornecida');
        return res.status(400).json({ error: "Senha é obrigatória para deletar um usuário" });
      }

      console.log('✅ 3️⃣ ID e Senha validados');

      if (!supabase) {
        console.log('❌ Supabase não configurado');
        return res.status(500).json({ error: "Supabase não configurado" });
      }

      console.log('✅ 4️⃣ Supabase conectado');

      // Verificar se a senha do admin está correta
      console.log('✅ 5️⃣ Verificando senha do admin...');
      const { data: adminData, error: adminError } = await supabase
        .from("usuarios")
        .select("senha_hash")
        .eq("id", req.user.id)
        .single();

      if (adminError || !adminData) {
        console.error('❌ Erro ao buscar dados do admin:', adminError);
        return res.status(400).json({ error: "Erro ao verificar credenciais" });
      }

      // Verificar a senha usando bcrypt
      const senhasMatch = await bcrypt.compare(senha, adminData.senha_hash);
      if (!senhasMatch) {
        console.log('❌ Senha do admin incorreta');
        return res.status(401).json({ error: "Senha incorreta" });
      }

      console.log('✅ 6️⃣ Senha do admin validada com sucesso');

      // Soft delete - apenas marcar como inativo
      console.log('✅ 7️⃣ Iniciando UPDATE no Supabase...');
      console.log('   Query: usuarios.update({ativo: false}).eq("id", ' + id + ')');
      
      const { data, error } = await supabase
        .from("usuarios")
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq("id", parseInt(id))
        .select("id, email, nome, role, ativo")
        .single();

      console.log('✅ 8️⃣ UPDATE completado');

      if (error) {
        console.error('❌ 9️⃣ Erro Supabase na resposta:', error);
        return res.status(400).json({ error: error.message || "Erro ao deletar usuário" });
      }

      console.log('✅ 9️⃣ Sem erros no Supabase');
      console.log('✅ 🔟 Usuário desativado:', data?.email);
      console.log('📤 1️⃣1️⃣ Enviando resposta 200...');
      
      return res.status(200).json({
        message: "Usuário deletado com sucesso",
        usuario: data
      });
    } catch (error) {
      console.error('❌ ⚠️ ERRO CAPTURADO em /api/admin/usuarios DELETE:', error);
      console.error('   Tipo:', error?.constructor?.name);
      console.error('   Mensagem:', error?.message);
      console.error('   Stack:', error?.stack);
      res.status(500).json({ error: "Erro ao deletar usuário", details: String(error) });
    }
  });

  // Alterar senha de usuário (apenas admin)
  app.put("/api/admin/usuarios/:id/senha", authMiddleware, async (req: any, res) => {
    try {
      console.log('\n' + '='.repeat(60));
      console.log('🔐 INICIANDO PUT /api/admin/usuarios/:id/senha');
      console.log('='.repeat(60));
      
      const { id } = req.params;
      const { senha } = req.body;

      console.log('✅ 1️⃣ Parâmetros extraídos:');
      console.log('   - ID:', id);
      console.log('   - Senha fornecida:', !!senha);
      console.log('   - User role:', req.user.role);

      if (req.user.role !== 'admin') {
        console.log('❌ Usuário não é admin');
        return res.status(403).json({ error: "Acesso negado" });
      }

      console.log('✅ 2️⃣ Usuário é admin');

      if (!id) {
        console.log('❌ ID não fornecido');
        return res.status(400).json({ error: "ID do usuário é obrigatório" });
      }

      console.log('✅ 3️⃣ ID validado');

      if (!senha || senha.trim().length < 6) {
        console.log('❌ Senha inválida');
        return res.status(400).json({ error: "Senha deve ter no mínimo 6 caracteres" });
      }

      console.log('✅ 4️⃣ Senha validada');

      if (!supabase) {
        console.log('❌ Supabase não configurado');
        return res.status(500).json({ error: "Supabase não configurado" });
      }

      console.log('✅ 5️⃣ Supabase conectado');

      const senhaHash = hashPassword(senha);
      console.log('✅ 6️⃣ Senha hasheada');

      console.log('✅ 7️⃣ Iniciando UPDATE no Supabase...');
      console.log('   Query: usuarios.update().eq("id", ' + id + ')');
      
      const { data, error } = await supabase
        .from("usuarios")
        .update({ 
          senha_hash: senhaHash, 
          updated_at: new Date().toISOString() 
        })
        .eq("id", parseInt(id))
        .select("id, email, nome, role, ativo")
        .single();

      console.log('✅ 8️⃣ UPDATE completado');

      if (error) {
        console.error('❌ 9️⃣ Erro Supabase na resposta:', error);
        return res.status(400).json({ error: error.message || "Erro ao alterar senha" });
      }

      console.log('✅ 9️⃣ Sem erros no Supabase');
      console.log('✅ 🔟 Senha alterada para:', data?.email);
      console.log('📤 11️⃣ Enviando resposta 200...');
      
      return res.status(200).json({
        message: "Senha alterada com sucesso",
        usuario: data
      });
    } catch (error) {
      console.error('❌ ⚠️ ERRO CAPTURADO em /api/admin/usuarios/:id/senha:', error);
      console.error('   Tipo:', error?.constructor?.name);
      console.error('   Mensagem:', error?.message);
      console.error('   Stack:', error?.stack);
      res.status(500).json({ error: "Erro ao alterar senha", details: String(error) });
    }
  });

  app.get("/api/emendas", authMiddleware, async (req: any, res) => {
    try {
      console.log('\n📥 GET /api/emendas - User:', req.user.email);
      const limit = Math.min(parseInt(req.query.limit || '10000'), 10000);
      const offset = parseInt(req.query.offset || '0');
      
      if (!supabase) {
        console.log('⚠ Supabase não disponível');
        return res.json([]);
      }

      console.log(`📥 Buscando ${limit} registros com offset ${offset}...`);
      // Obs: Supabase tem limite de 1000 por request, então retorna com base em .range()
      const { data, error, count } = await supabase
        .from("formalizacao")
        .select("*", { count: 'exact'})
        .order("ano", { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) {
        console.error('❌ Erro do Supabase:', error);
        return res.status(500).json({ error: error.message });
      }
      
      console.log(`✓ Retornados: ${data?.length || 0}/${count} registros`);
      res.json(data || []);
    } catch (error) {
      console.error('❌ Erro em /api/emendas:', error);
      res.status(500).json({ error: "Erro ao buscar emendas" });
    }
  });

  // ⚡ Função OTIMIZADA para buscar TODOS os registros (com cache + paralelismo)
  async function getAllFormalizacoes(forceRefresh: boolean = false) {
    if (!supabase) return [];
    
    const now = Date.now();
    
    // ✅ Verificar cache (a menos que forceRefresh seja true)
    if (!forceRefresh && formalizacaoCache && (now - formalizacaoCacheTimestamp) < FORMALIZACAO_CACHE_TTL) {
      const cacheAge = Math.round((now - formalizacaoCacheTimestamp) / 1000);
      console.log(`⚡ CACHE HIT: ${formalizacaoCache.length} registros (${cacheAge}s antigo)`);
      return formalizacaoCache;
    }

    if (forceRefresh) {
      console.log('💥 FORÇA REFRESH - ignorando cache!');
    }

    // 🔄 Se outro request já está cacheando, aguardar
    if (isCachingFormalizacao) {
      console.log('⏳ Aguardando cache anterior...');
      let waitCount = 0;
      while (isCachingFormalizacao && waitCount < 60) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
      }
      if (formalizacaoCache) {
        console.log(`⚡ CACHE HIT (após espera): ${formalizacaoCache.length} registros`);
        return formalizacaoCache;
      }
    }

    isCachingFormalizacao = true;
    console.log('🔄 Cache MISS - Carregando todos os registros com PARALELISMO...');
    const startTime = Date.now();

    try {
      const pageSize = 1000;
      let allData: any[] = [];

      // ⚡ STRATEGY: Pedir contagem primeiro para saber quantas páginas são
      // Usar select('id') em vez de select('*') para evitar limite de 1000
      const { count, error: countError } = await supabase
        .from("formalizacao")
        .select("id", { count: "exact", head: true });

      if (countError || !count) {
        console.error('❌ Erro ao contar registros:', countError);
        return [];
      }

      const totalPages = Math.ceil(count / pageSize);
      console.log(`📊 Total de registros: ${count} (${totalPages} páginas de ${pageSize})`);

      // ⚡ Fazer REQUISIÇÕES PARALELAS (não sequenciais!)
      // Limitar a 5 simultâneas para não sobrecarregar
      const simultaneousRequests = 5;
      const pageNumbers = Array.from({ length: totalPages }, (_, i) => i);

      for (let i = 0; i < pageNumbers.length; i += simultaneousRequests) {
        const batchPageNumbers = pageNumbers.slice(i, i + simultaneousRequests);
        const batchPromises = batchPageNumbers.map(pageNum =>
          supabase
            .from("formalizacao")
            .select("*")
            .order("created_at", { ascending: false })
            .range(pageNum * pageSize, (pageNum + 1) * pageSize - 1)
            .then(({ data, error }) => ({
              data: data || [],
              error,
              pageNum
            }))
        );

        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(({ data, error, pageNum }) => {
          if (error) {
            console.error(`❌ Erro página ${pageNum}:`, error.message);
          } else if (data && data.length > 0) {
            allData = allData.concat(data);
            console.log(`📦 Página ${pageNum + 1}/${totalPages}: ${data.length} registros (total: ${allData.length})`);
          }
        });

        // Pequeno delay entre lotes
        if (i + simultaneousRequests < pageNumbers.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      const duration = Date.now() - startTime;
      console.log(`✅ CONCLUÍDO: ${allData.length} registros em ${duration}ms`);

      // ✅ Armazenar em cache
      formalizacaoCache = allData;
      formalizacaoCacheTimestamp = now;

      return allData;
    } catch (err) {
      console.error('❌ Erro crítico:', err);
      return [];
    } finally {
      isCachingFormalizacao = false;
    }
  }

  app.post("/api/admin/limpar-formalizacoes", async (req, res) => {
    try {
      if (!supabase) {
        return res.status(400).json({ error: "Supabase não disponível" });
      }

      console.log('⚠️ DELETANDO TODOS OS REGISTROS DE FORMALIZAÇÕES...');
      
      // Contar registros antes de deletar
      const { count: countBefore } = await supabase
        .from("formalizacao")
        .select("*", { count: "exact", head: true });

      console.log(`   Total de registros a deletar: ${countBefore}`);

      // Deletar todos
      const { error } = await supabase
        .from("formalizacao")
        .delete()
        .gt("id", 0); // Deleta todos onde id > 0

      if (error) {
        console.error('❌ Erro ao deletar:', error);
        return res.status(500).json({ error: error.message });
      }

      // Limpar cache
      formalizacaoCache = null;
      formalizacaoCacheTimestamp = 0;

      console.log(`✅ Deletados ${countBefore} registros`);
      return res.json({ 
        success: true, 
        message: `${countBefore} registros deletados com sucesso`,
        deletedCount: countBefore 
      });
    } catch (error: any) {
      console.error('❌ Erro crítico:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/debug/compare-records", async (req, res) => {
    try {
      if (!supabase) {
        return res.json({ error: "Supabase não disponível" });
      }

      // Pegar 1 registro COM parlamentar e 1 SEM
      const { data: comDados } = await supabase
        .from("formalizacao")
        .select("*")
        .not("parlamentar", "is", null)
        .limit(1);

      const { data: semDados } = await supabase
        .from("formalizacao")
        .select("*")
        .is("parlamentar", null)
        .limit(1);

      const comparison = {
        "COM DADOS (parlamentar preenchido)": comDados?.[0] || null,
        "SEM DADOS (parlamentar null)": semDados?.[0] || null,
        analise: {
          "Campos diferentes": [] as string[]
        }
      };

      if (comDados?.[0] && semDados?.[0]) {
        const com = comDados[0];
        const sem = semDados[0];
        
        for (const key of Object.keys(com)) {
          const valCom = com[key];
          const valSem = sem[key];
          
          if (valCom !== valSem) {
            comparison.analise["Campos diferentes"].push(`${key}: COM="${valCom}" | SEM="${valSem}"`);
          }
        }
      }

      return res.json(comparison);
    } catch (error) {
      return res.json({ error: String(error) });
    }
  });

  app.get("/api/debug/formalizacao-sample", async (req, res) => {
    try {
      if (!supabase) {
        return res.json({ error: "Supabase não disponível" });
      }

      // Pegar 50 registros completos
      const { data: samples, error: sampleError } = await supabase
        .from("formalizacao")
        .select("*")
        .limit(50);

      if (sampleError) {
        return res.json({ error: sampleError.message });
      }

      if (!samples || samples.length === 0) {
        return res.json({ message: "Nenhum registro encontrado" });
      }

      // Análise completa
      const analysis = {
        totalRegistros: samples.length,
        campos: {} as any,
        recordsPorComplitude: {} as any,
        exemplosPorComplitude: [] as any[]
      };

      // Analisar cada campo
      const allKeys = Object.keys(samples[0]);
      const fieldsAnalysis: any = {};

      for (const key of allKeys) {
        const filled = samples.filter((r: any) => r[key] && String(r[key]).trim() !== '').length;
        const percentual = ((filled / samples.length) * 100).toFixed(1);
        fieldsAnalysis[key] = {
          filled,
          empty: samples.length - filled,
          percentual: `${percentual}%`
        };
      }

      // Contar completude de cada registro
      for (const sample of samples) {
        const filledFields = Object.values(sample).filter(
          (v: any) => v !== null && v !== undefined && String(v).trim() !== ''
        ).length;
        const complitude = Math.round((filledFields / allKeys.length) * 100);
        
        if (!analysis.recordsPorComplitude[complitude]) {
          analysis.recordsPorComplitude[complitude] = 0;
        }
        analysis.recordsPorComplitude[complitude]++;

        // Exemplos de cada nível
        if (analysis.exemplosPorComplitude.filter((e: any) => e.complitude === complitude).length === 0) {
          analysis.exemplosPorComplitude.push({
            complitude,
            exemplo: {
              id: sample.id,
              ano: sample.ano,
              parlamentar: sample.parlamentar || 'NULL',
              conveniado: sample.conveniado || 'NULL',
              objeto: sample.objeto || 'NULL',
              emenda: sample.emenda || 'NULL',
              valor: sample.valor || 'NULL',
              totalCampos: allKeys.length,
              camposPreenchidos: filledFields
            }
          });
        }
      }

      analysis.campos = fieldsAnalysis;

      return res.json(analysis);
    } catch (error) {
      return res.json({ error: String(error) });
    }
  });

  app.get("/api/debug/formalizacao-status", async (req, res) => {
    try {
      if (!supabase) {
        return res.json({ error: "Supabase não disponível" });
      }

      // Pegar 10 registros para análise
      const { data: samples, error: sampleError } = await supabase
        .from("formalizacao")
        .select("*")
        .limit(10);

      if (sampleError) {
        return res.json({ error: sampleError.message });
      }

      // Análise dos dados
      const analysis = {
        totalSamples: samples?.length || 0,
        fieldCompleteness: {} as any
      };

      if (samples && samples.length > 0) {
        const allKeys = Object.keys(samples[0]);
        
        for (const key of allKeys) {
          const filled = samples.filter((r: any) => r[key] && String(r[key]).trim() !== '').length;
          analysis.fieldCompleteness[key] = {
            filled,
            total: samples.length,
            percentage: ((filled / samples.length) * 100).toFixed(1)
          };
        }

        // Exemplo de um registro completo
        analysis.sampleRecords = samples.slice(0, 2).map((r: any) => ({
          id: r.id,
          ano: r.ano,
          parlamentar: r.parlamentar ? '✓' : '✗',
          conveniado: r.conveniado ? '✓' : '✗',
          objeto: r.objeto ? '✓' : '✗',
          valor: r.valor
        }));
      }

      return res.json(analysis);
    } catch (error) {
      return res.json({ error: String(error) });
    }
  });

  app.get("/api/formalizacao", authMiddleware, async (req: any, res) => {
    try {
      console.log('\n📥 GET /api/formalizacao - User:', req.user.email, 'Role:', req.user.role);

      
      if (!supabase) {
        console.log('⚠ Supabase não disponível, retornando array vazio');
        return res.json([]);
      }

      console.log('Tentando buscar de formalizacao no Supabase (COM PAGINAÇÃO INTERNA)...');
      let data = await getAllFormalizacoes();
      
      // Se usuário é padrão, filtrar apenas demandas onde ele é técnico
      if (req.user.role === 'usuario') {
        data = data.filter(f => f.usuario_atribuido_id === req.user.userId);
        console.log(`🔒 Usuário comum - Filtrado para: ${data.length} registros onde usuario_atribuido_id = ${req.user.userId}`);
      }
      
      // DEBUG: Verificar quantidade de registros com dados
      if (data.length > 0) {
        const withParl = data.filter(r => r.parlamentar && r.parlamentar.trim() !== '').length;
        const withConv = data.filter(r => r.conveniado && r.conveniado.trim() !== '').length;
        const withObj = data.filter(r => r.objeto && r.objeto.trim() !== '').length;
        console.log(`📊 Dados retornados: ${data.length} total`);
        console.log(`   - Com parlamentar preenchido: ${withParl} (${((withParl/data.length)*100).toFixed(1)}%)`);
        console.log(`   - Com conveniado preenchido: ${withConv} (${((withConv/data.length)*100).toFixed(1)}%)`);
        console.log(`   - Com objeto preenchido: ${withObj} (${((withObj/data.length)*100).toFixed(1)}%)`);
        if (data.length > 0) {
          const sample = data[0];
          console.log(`   - Amostra: ${sample.parlamentar ? '✓ parlamentar' : '✗ parlamentar'}, ${sample.conveniado ? '✓ conveniado' : '✗ conveniado'}, ${sample.objeto ? '✓ objeto' : '✗ objeto'}`);
        }
      }
      
      console.log(`✓ Retornando: ${data.length} registros`);
      // Cache headers para dados
      res.set('Cache-Control', 'public, max-age=300'); // Cache por 5 minutos
      res.set('Content-Type', 'application/json');
      return res.json(data);
    } catch (error) {
      console.error('❌ Erro em /api/formalizacao:', error);
      res.status(500).json({ error: "Erro ao buscar formalizações", details: String(error) });
    }
  });

  // Endpoint para busca de uma página específica (com paginação server-side)
  app.get("/api/formalizacao/page/:pageNum", authMiddleware, async (req: any, res) => {
    try {
      const pageNum = parseInt(req.params.pageNum) || 0;
      const pageSize = 500;
      const offset = pageNum * pageSize;

      console.log(`\n📄 GET /api/formalizacao/page/${pageNum} (offset: ${offset}, size: ${pageSize}) - User: ${req.user.email}`);

      // ⚡ Usar cache em memória (MUITO mais rápido!)
      let allData = await getAllFormalizacoes();
      
      // Se usuário é padrão, filtrar apenas demandas onde ele é técnico
      if (req.user.role === 'usuario') {
        allData = allData.filter(f => f.usuario_atribuido_id === req.user.userId);
        console.log(`🔒 Filtrado para usuário comum: ${allData.length} registros`);
      }
      
      if (!allData || allData.length === 0) {
        return res.json({
          data: [],
          page: pageNum,
          total: 0,
          pageSize: pageSize,
          totalPages: 0,
          hasMore: false,
          source: 'cache-empty'
        });
      }

      // Paginar a partir do cache
      const total = allData.length;
      const totalPages = Math.ceil(total / pageSize);
      const paginatedData = allData.slice(offset, offset + pageSize);

      console.log(`✅ Página ${pageNum + 1}/${totalPages}: ${paginatedData.length} registros de ${total} total (do CACHE)`);

      res.json({
        data: paginatedData || [],
        page: pageNum,
        total: total,
        pageSize: pageSize,
        totalPages: totalPages,
        hasMore: offset + pageSize < total,
        source: 'cache'
      });
    } catch (error) {
      console.error(`❌ Erro em /api/formalizacao/page:`, error);
      res.status(500).json({ error: "Erro ao buscar página", details: String(error) });
    }
  });

  // Endpoint otimizado para busca com filtros (server-side filtering)
  app.get("/api/formalizacao/search", authMiddleware, async (req: any, res) => {
    try {
      const { 
        search = '', 
        page = '0',
        limit = '500'
      } = req.query;

      if (!supabase) {
        return res.status(500).json({ error: "Supabase não configurado" });
      }

      const pageNum = parseInt(page as string) || 0;
      const limitNum = parseInt(limit as string) || 500;
      const offset = pageNum * limitNum;

      console.log(`\n🔍 GET /api/formalizacao/search - Page ${pageNum}, Limit ${limitNum}, Search: "${search}" - User: ${req.user.email}`);

      // Buscar todos os dados (será cacheado depois)
      let allData = await getAllFormalizacoes();

      // Se usuário é padrão, filtrar apenas demandas onde ele é técnico
      if (req.user.role === 'usuario') {
        allData = allData.filter(f => f.usuario_atribuido_id === req.user.userId);
        console.log(`🔒 Filtrado para usuário comum: ${allData.length} registros`);
      }

      // Aplicar filtro de busca em JavaScript (mais confiável)
      if (search && search !== '') {
        const searchLower = (search as string).toLowerCase();
        allData = allData.filter(f => 
          (f.parlamentar && f.parlamentar.toLowerCase().includes(searchLower)) ||
          (f.conveniado && f.conveniado.toLowerCase().includes(searchLower)) ||
          (f.objeto && f.objeto.toLowerCase().includes(searchLower)) ||
          (f.regional && f.regional.toLowerCase().includes(searchLower)) ||
          (f.tecnico && f.tecnico.toLowerCase().includes(searchLower))
        );
      }

      const total = allData.length;
      const paginatedData = allData.slice(offset, offset + limitNum);

      console.log(`✅ Retornando ${paginatedData.length} registros de ${total} total (página ${pageNum})`);

      res.json({
        data: paginatedData,
        total: total,
        page: pageNum,
        limit: limitNum,
        hasMore: (offset + limitNum) < total
      });
    } catch (error) {
      console.error('❌ Erro em /api/formalizacao/search:', error);
      res.status(500).json({ error: "Erro ao buscar formalizações", details: String(error) });
    }
  });

  // Endpoint para valores únicos dos filtros de formalização (com CACHE)
  app.get("/api/formalizacao/filters", async (req, res) => {
    try {
      if (!supabase) return res.status(500).json({ error: "Supabase não configurado" });
      
      // Verificar cache
      const now = Date.now();
      if (filterCache && (now - filterCacheTimestamp) < CACHE_TTL) {
        console.log(`⚡ Filtros do cache (${Math.round((now - filterCacheTimestamp) / 1000)}s antigo)`);
        return res.json(filterCache);
      }
      
      console.log('🔄 Extraindo filtros...');
      const startTime = Date.now();
      
      // Lista de campos filtráveis
      const campos = [
        "ano", "demandas_formalizacao", "area_estagio", "recurso", "tecnico", "situacao_analise_demanda", "area_estagio_situacao_demanda",
        "conferencista", "falta_assinatura", "publicacao", "vigencia", "parlamentar", "partido",
        "regional", "municipio", "conveniado", "objeto"
      ];
      
      const result: Record<string, string[]> = {};
      
      // Sempre preferir dados do cache de formalizações em memória (10-50ms)
      if (formalizacaoCache && formalizacaoCache.length > 0) {
        console.log(`✓ Extraindo de ${formalizacaoCache.length} registros em cache`);
        
        // Extrair valores únicos de cada campo
        for (const campo of campos) {
          const valoresSet = new Set<string>();
          for (const registro of formalizacaoCache) {
            const valor = registro[campo];
            if (valor && valor.toString().trim() !== '') {
              // Normalizar: deixar case original se for número, ou normalizar strings
              const normalized = String(valor).trim();
              if (normalized !== '') {
                valoresSet.add(normalized);
              }
            }
          }
          result[campo] = Array.from(valoresSet).sort();
        }
      } else {
        console.log('⏳ Cache ainda não disponível, aguardando cache antes de buscar filtros...');
        
        // Esperar um pouco para voir se o cache carrega
        let waitTime = 0;
        while (!formalizacaoCache && waitTime < 30000) {
          await new Promise(resolve => setTimeout(resolve, 500));
          waitTime += 500;
        }
        
        if (formalizacaoCache && formalizacaoCache.length > 0) {
          console.log(`✓ Cache chegou! Extraindo de ${formalizacaoCache.length} registros`);
          
          for (const campo of campos) {
            const valoresSet = new Set<string>();
            for (const registro of formalizacaoCache) {
              const valor = registro[campo];
              if (valor && valor.toString().trim() !== '') {
                const normalized = String(valor).trim();
                if (normalized !== '') {
                  valoresSet.add(normalized);
                }
              }
            }
            result[campo] = Array.from(valoresSet).sort();
          }
        } else {
          console.log('⚠️ Cache não disponível, buscando do Supabase com paralelismo...');
          
          // Fazer requisições paralelas para todos os campos
          const promessas = campos.map(async (campo) => {
            try {
              const valoresSet = new Set<string>();
              let offset = 0;
              const pageSize = 1000;
              let hasMore = true;
              
              // Busca todos os registros usando paginação
              while (hasMore) {
                const { data, error } = await supabase
                  .from("formalizacao")
                  .select(`${campo}`)
                  .not(campo, "is", null)
                  .neq(campo, "")
                  .range(offset, offset + pageSize - 1);
                
                if (error) {
                  console.log(`⚠️ ${campo}: ${error.message}`);
                  hasMore = false;
                } else if (!data || data.length === 0) {
                  hasMore = false;
                } else {
                  data.forEach((row: any) => {
                    const valor = row[campo];
                    if (valor && valor.toString().trim() !== '') {
                      valoresSet.add(valor.toString());
                    }
                  });
                  offset += pageSize;
                }
              }
              
              return [campo, Array.from(valoresSet).sort()] as [string, string[]];
            } catch (e) {
              console.error(`❌ Erro em ${campo}:`, e);
              return [campo, []] as [string, string[]];
            }
          });
          
          // Executar paralelo
          const resultados = await Promise.all(promessas);
          resultados.forEach(([campo, valores]) => {
            result[campo] = valores;
          });
        }
      }
      
      // Atualizar cache
      filterCache = result;
      filterCacheTimestamp = Date.now();
      const duration = filterCacheTimestamp - startTime;
      
      console.log(`✅ Filtros prontos em ${duration}ms`);
      
      res.json(result);
    } catch (error) {
      console.error('❌ Erro em /api/formalizacao/filters:', error);
      res.status(500).json({ error: "Erro ao buscar filtros", details: String(error) });
    }
  });

  // 🎯 Novo endpoint para filtros em cascata (Power BI)
  app.get("/api/formalizacao/filters-cascata", authMiddleware, async (req: any, res) => {
    try {
      if (!supabase) return res.status(500).json({ error: "Supabase não configurado" });
      
      const startTime = Date.now();
      const cacheKey = `filters_${req.user.role}`;
      
      // Verificar cache com TTL de 5 minutos
      if (filtersCache[cacheKey] && (Date.now() - filtersCache[cacheKey].timestamp) < 5 * 60 * 1000) {
        console.log(`⚡ Cache HIT: ${cacheKey} (${Date.now() - startTime}ms)`);
        return res.json(filtersCache[cacheKey].data);
      }
      
      // Se cache expirou, regenerar de forma otimizada
      console.log(`🔄 Regenerando filtros em cascata (cache expirado ou vazio)...`);
      
      const validFilterFields = [
        "ano", "demandas_formalizacao", "area_estagio", "recurso", "tecnico", 
        "situacao_analise_demanda", "area_estagio_situacao_demanda", "conferencista",
        "falta_assinatura", "publicacao", "vigencia", "parlamentar", "partido",
        "regional", "municipio", "conveniado", "objeto", "data_liberacao", "data_analise_demanda",
        "data_recebimento_demanda", "data_retorno", "encaminhado_em", "concluida_em"
      ];
      
      const result: Record<string, string[]> = {};
      
      // Usar cache em memória se disponível (muito mais rápido)
      if (formalizacaoCache && formalizacaoCache.length > 0) {
        console.log(`📊 Processando ${formalizacaoCache.length} registros do cache`);
        
        let recordsToProcess = formalizacaoCache;
        
        // Se usuário é padrão, filtrar apenas demandas onde ele é técnico
        if (req.user.role === 'usuario') {
          recordsToProcess = recordsToProcess.filter(f => 
            f.usuario_atribuido_id === req.user.userId
          );
          console.log(`🔒 Usuário comum - ${recordsToProcess.length} registros acessíveis`);
        }
        
        // Extrair valores únicos de forma otimizada
        const filterMaps = new Map<string, Set<string>>();
        
        for (const campo of validFilterFields) {
          filterMaps.set(campo, new Set<string>());
        }
        
        // Passar única pelo cache
        for (const registro of recordsToProcess) {
          for (const campo of validFilterFields) {
            const valor = registro[campo];
            if (valor && String(valor).trim() !== '' && String(valor) !== '—') {
              filterMaps.get(campo)?.add(String(valor).trim());
            }
          }
        }
        
        // Converter para arrays ordenados
        for (const [campo, valoresSet] of filterMaps) {
          result[campo] = Array.from(valoresSet).sort();
        }
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ Filtros cascata prontos em ${duration}ms`);
      
      // Cachear resultado por 5 minutos
      filtersCache[cacheKey] = {
        data: result,
        timestamp: Date.now()
      };
      
      res.json(result);
    } catch (error) {
      console.error('❌ Erro em /api/formalizacao/filters-cascata:', error);
      res.status(500).json({ error: "Erro ao buscar filtros em cascata", details: String(error) });
    }
  });

  // Endpoint de diagnóstico para debug de filtros
  app.get("/api/diagnostic/filters", async (req, res) => {
    try {
      if (!supabase) return res.status(500).json({ error: "Supabase não configurado" });
      
      console.log('\n🔍 DIAGNÓSTICO DE FILTROS - SOLICITADO');
      
      // 1. Total de registros
      const { count } = await supabase
        .from("formalizacao")
        .select("*", { count: "exact", head: true });
      console.log(`✓ Total de formalizações: ${count}`);
      
      // 2. Primeiros anos  
      const { data: firstData } = await supabase
        .from("formalizacao")
        .select("ano")
        .limit(5);
      
      console.log('✓ Primeiros 5 anos (tipo de dado):');
      firstData?.forEach((r: any, i: number) => {
        console.log(`  [${i}] ano="${r.ano}" tipo=${typeof r.ano}`);
      });
      
      // 3. Valores únicos
      const { data: allAños } = await supabase
        .from("formalizacao")
        .select("ano")
        .not("ano", "is", null)
        .neq("ano", "");
      
      const anosSet = new Set<string>();
      (allAños || []).forEach((row: any) => {
        const valor = row.ano;
        if (valor && valor.toString().trim() !== '') {
          anosSet.add(valor.toString());
        }
      });
      const anos = Array.from(anosSet).sort();
      console.log(`✓ Valores únicos de ANO (${anos.length}): ${anos.slice(0, 10).join(', ')}`);
      
      // 4. Testar busca com 2019
      const { data: testData, error: testError } = await supabase
        .from("formalizacao")
        .select("id")
        .eq("ano", "2019");
      
      console.log(`✓ Registros com ano="2019" (texto): ${testData?.length || 0}`);
      if (testError) console.log(`  Erro: ${testError.message}`);
      
      res.json({
        total: count,
        anosUnicos: anos,
        primeiros5: firstData,
        registrosAno2019: testData?.length || 0,
        diagnostic: "Check server console for detailed output"
      });
    } catch (error) {
      console.error('Erro em /api/diagnostic/filters:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  // 🔍 Diagnóstico específico para demandas_formalizacao
  app.get("/api/diagnostic/demandas", async (req, res) => {
    try {
      console.log('\n🔍 DIAGNÓSTICO DE DEMANDAS_FORMALIZACAO');
      
      if (formalizacaoCache && formalizacaoCache.length > 0) {
        console.log(`✓ Usando cache: ${formalizacaoCache.length} registros`);
        
        // Contar registros com demandas_formalizacao
        const comDemandas = formalizacaoCache.filter(r => r.demandas_formalizacao && String(r.demandas_formalizacao).trim() !== '');
        const semDemandas = formalizacaoCache.filter(r => !r.demandas_formalizacao || String(r.demandas_formalizacao).trim() === '');
        
        console.log(`  Com demandas_formalizacao: ${comDemandas.length} (${((comDemandas.length / formalizacaoCache.length) * 100).toFixed(1)}%)`);
        console.log(`  Sem demandas_formalizacao: ${semDemandas.length} (${((semDemandas.length / formalizacaoCache.length) * 100).toFixed(1)}%)`);
        
        // Primeiros 10 valores únicos
        const valoresUnicos = new Set<string>();
        comDemandas.slice(0, 100).forEach(r => {
          if (r.demandas_formalizacao) {
            valoresUnicos.add(String(r.demandas_formalizacao).trim());
          }
        });
        console.log(`  Valores únicos (primeiros): ${Array.from(valoresUnicos).slice(0, 10).join(', ')}`);
        
        return res.json({
          total: formalizacaoCache.length,
          comDemandas: comDemandas.length,
          semDemandas: semDemandas.length,
          percentualCom: ((comDemandas.length / formalizacaoCache.length) * 100).toFixed(1),
          exemplos: Array.from(valoresUnicos).slice(0, 20)
        });
      } else {
        console.log('⚠️ Cache não disponível');
        return res.json({ error: "Cache não disponível", cache: !!formalizacaoCache });
      }
    } catch (error) {
      console.error('Erro em /api/diagnostic/demandas:', error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/emendas", async (req, res) => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from("emendas")
          .insert([req.body])
          .select();
        if (error) throw error;
        return res.json(data[0]);
      }
      
      res.status(500).json({ error: "Supabase não configurado" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao criar emenda" });
    }
  });

  // Bulk Import Route
  app.post("/api/emendas/bulk", async (req, res) => {
    try {
      const items = req.body;
      if (!Array.isArray(items)) return res.status(400).json({ error: "Dados inválidos" });

      const validColumns = [
        'detalhes', 'natureza', 'ano_refer', 'codigo_num', 'num_emenda', 'parecer_ld',
        'situacao_e', 'situacao_d', 'data_ult_e', 'data_ult_d', 'num_indicacao',
        'parlamentar', 'partido', 'tipo_beneficiario', 'beneficiario', 'cnpj',
        'municipio', 'objeto', 'orgao_entidade', 'regional', 'num_convenio',
        'num_processo', 'data_assinatura', 'data_publicacao', 'agencia', 'conta',
        'valor', 'valor_desembolsado', 'portfolio', 'qtd_dias', 'vigencia',
        'data_prorrogacao', 'dados_bancarios', 'status', 'data_pagamento',
        'num_codigo', 'notas_empenho', 'valor_total_empenhado', 'notas_liquidacao',
        'valor_total_liquidado', 'programa', 'valor_total_pago', 'ordem_bancaria',
        'data_paga', 'valor_total_ordem_bancaria'
      ];

      const columnMapping: any = {
        "Detalhes da Demanda": "detalhes",
        "Natureza": "natureza",
        "Ano Referência": "ano_refer",
        "Ano Referencia": "ano_refer",
        "Código/Nº Emenda": "codigo_num",
        "Codigo/Nº Emenda": "codigo_num",
        "Nº Emenda Agregadora": "num_emenda",
        "Parecer LDO": "parecer_ld",
        "Situação Emenda": "situacao_e",
        "Situacao Emenda": "situacao_e",
        "Situação Demanda": "situacao_d",
        "Situacao Demanda": "situacao_d",
        "Data da Última Tramitação Emenda": "data_ult_e",
        "Data da Ultima Tramitacao Emenda": "data_ult_e",
        "Data da Última Tramitação Demanda": "data_ult_d",
        "Data da Ultima Tramitacao Demanda": "data_ult_d",
        "Nº da Indicação": "num_indicacao",
        "Nº da Indicacao": "num_indicacao",
        "Parlamentar": "parlamentar",
        "Partido": "partido",
        "Tipo Beneficiário": "tipo_beneficiario",
        "Tipo Beneficiario": "tipo_beneficiario",
        "Beneficiário": "beneficiario",
        "Beneficiario": "beneficiario",
        "CNPJ": "cnpj",
        "Município": "municipio",
        "Municipio": "municipio",
        "Objeto": "objeto",
        "Órgão Entidade/Responsável": "orgao_entidade",
        "Orgao Entidade/Responsavel": "orgao_entidade",
        "Regional": "regional",
        "Nº de Convênio": "num_convenio",
        "Nº de Convenio": "num_convenio",
        "Nº de Processo": "num_processo",
        "Assinatura": "data_assinatura",
        "Publicação": "data_publicacao",
        "Publicacao": "data_publicacao",
        "Agência": "agencia",
        "Agencia": "agencia",
        "Conta": "conta",
        "Valor": "valor",
        "Valor da Demanda": "valor_desembolsado",
        "Portfólio": "portfolio",
        "Portfolio": "portfolio",
        "Qtd. Dias na Etapa": "qtd_dias",
        "Vigência": "vigencia",
        "Vigencia": "vigencia",
        "Data da Primeira Notificação LOA Recebida pelo Beneficiário": "data_prorrogacao",
        "Data da Primeira Notificacao LOA Recebida pelo Beneficiario": "data_prorrogacao",
        "Dados Bancários": "dados_bancarios",
        "Dados Bancarios": "dados_bancarios",
        "Status do Pagamento": "status",
        "Data do Pagamento": "data_pagamento",
        "Nº do Código Único": "num_codigo",
        "Nº do Codigo Unico": "num_codigo",
        "Notas e Empenho": "notas_empenho",
        "Valor Total Empenho": "valor_total_empenhado",
        "Notas de Lançamento": "notas_liquidacao",
        "Notas de Lancamento": "notas_liquidacao",
        "Valor Total Lançamento": "valor_total_liquidado",
        "Valor Total Lancamento": "valor_total_liquidado",
        "Programações Desembolso": "programa",
        "Programacoes Desembolso": "programa",
        "Valor Total Programação Desembolso": "valor_total_pago",
        "Valor Total Programacao Desembolso": "valor_total_pago",
        "Ordem Bancária": "ordem_bancaria",
        "Ordem Bancaria": "ordem_bancaria",
        "Data pagamento Ordem Bancária": "data_paga",
        "Data pagamento Ordem Bancaria": "data_paga",
        "Valor Total Ordem Bancária": "valor_total_ordem_bancaria",
        "Valor Total Ordem Bancaria": "valor_total_ordem_bancaria"
      };

      const filteredItems = items.map(item => {
        const filtered: any = {};
        let hasData = false;
        
        // Map CSV headers to database columns
        Object.keys(item).forEach(csvKey => {
          const dbKey = columnMapping[csvKey] || csvKey;
          if (validColumns.includes(dbKey)) {
            let val = item[csvKey];
            if (val === undefined || val === null || val === '') return;

            hasData = true;
            // Convert numeric strings to numbers
            if (['valor', 'valor_desembolsado', 'valor_total_empenhado', 'valor_total_liquidado', 'valor_total_pago', 'valor_total_ordem_bancaria'].includes(dbKey)) {
              const cleanVal = String(val || '0')
                .replace(/\s/g, '') // Remove spaces
                .replace(/\./g, '') // Remove thousands separator
                .replace(',', '.') // Replace decimal comma with dot
                .replace(/[^\d.-]/g, ''); // Remove everything else except digits, dots and minus
              const parsed = parseFloat(cleanVal);
              filtered[dbKey] = isNaN(parsed) ? 0 : parsed;
            } else if (dbKey === 'qtd_dias') {
              const parsed = parseInt(String(val || '0').replace(/\D/g, ''));
              // Proteção contra overflow de integer (max 2^31 - 1)
              filtered[dbKey] = (isNaN(parsed) || parsed > 2147483647) ? 0 : parsed;
            } else {
              // Garante que campos que podem ser números grandes (CNPJ, códigos) sejam tratados como string
              filtered[dbKey] = val !== null && val !== undefined ? String(val) : null;
            }
          }
        });
        return hasData ? filtered : null;
      }).filter(item => item !== null);

      console.log(`--- DEBUG IMPORT ---`);
      console.log(`Total recebido: ${items.length}`);
      console.log(`Total filtrado: ${filteredItems.length}`);
      if (filteredItems.length > 0) {
        console.log('Primeiro item para inserção:', JSON.stringify(filteredItems[0], null, 2));
      }

      if (filteredItems.length === 0) {
        return res.status(400).json({ error: "Nenhum dado compatível encontrado no arquivo. Verifique se os cabeçalhos do CSV estão corretos." });
      }

      if (supabase) {
        try {
          // Teste rápido de conexão antes do bulk
          const { error: testError } = await supabase.from("emendas").select("id").limit(1);
          if (testError) {
            console.error('Erro no teste de conexão Supabase:', testError);
            
            let msg = testError.message || "Erro desconhecido";
            if (msg.includes('<!DOCTYPE html>') || msg.includes('<html')) {
              msg = "A URL do Supabase está incorreta. Você provavelmente usou a URL do Dashboard em vez da URL da API (Project URL). Verifique as configurações no Supabase (Settings > API).";
            }

            return res.status(500).json({ 
              error: "Erro de Conexão Supabase", 
              details: msg,
              fullDetails: testError
            });
          }

          const { data, error } = await supabase
            .from("emendas")
            .insert(filteredItems)
            .select();
          
          if (error) {
            console.error('--- ERRO SUPABASE DETECTADO ---');
            console.error('Objeto de erro bruto:', error);
            
            const errorDetails = {
              message: error.message || "",
              details: error.details || "",
              hint: error.hint || "",
              code: error.code || "",
              status: (error as any).status || ""
            };

            let finalMessage = errorDetails.message;
            if (!finalMessage || finalMessage === "") {
              finalMessage = "O Supabase retornou um erro sem mensagem. Isso geralmente acontece quando:\n1. A tabela 'emendas' não existe.\n2. As chaves de API são inválidas.\n3. O payload é muito grande ou malformado.";
            }

            return res.status(500).json({ 
              error: "Erro no Supabase", 
              details: finalMessage,
              fullDetails: errorDetails
            });
          }
          return res.json({ count: data?.length || 0 });
        } catch (err: any) {
          console.error('Exceção ao chamar Supabase:', err);
          return res.status(500).json({ 
            error: "Exceção no Supabase", 
            details: err.message || "Erro inesperado ao comunicar com o Supabase."
          });
        }
      }

      res.status(500).json({ error: "Supabase não configurado, não é possível fazer import" });
    } catch (error: any) {
      console.error('Erro geral bulk import:', error);
      const errorMessage = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
      res.status(500).json({ 
        error: "Erro no import em massa", 
        details: errorMessage 
      });
    }
  });

  app.post("/api/cache/reset", async (req, res) => {
    try {
      console.log('🔄 Resetando cache de formalizações...');
      formalizacaoCache = null;
      formalizacaoCacheTimestamp = 0;
      return res.json({ success: true, message: "Cache resetado com sucesso" });
    } catch (error) {
      return res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/cache/refresh", async (req: any, res: any) => {
    console.log('\n' + '='.repeat(60));
    console.log('🔄 POST /api/cache/refresh - Iniciando...');
    console.log('='.repeat(60));
    
    try {
      // Validar autenticação manualmente
      const authHeader = req.headers.authorization;
      console.log('1️⃣ Auth Header presente?', !!authHeader);
      
      if (!authHeader) {
        console.log('❌ Sem authorization header');
        return res.status(401).json({ error: 'Token não fornecido' });
      }

      const token = authHeader.replace('Bearer ', '');
      console.log('2️⃣ Token extraído, tamanho:', token.length);

      const decoded = verifyToken(token);
      console.log('3️⃣ Token decodificado?', !!decoded);
      
      if (!decoded) {
        console.log('❌ Token inválido');
        return res.status(401).json({ error: 'Token inválido ou expirado' });
      }

      console.log('4️⃣ User:', decoded.nome, 'Role:', decoded.role);

      // Validar que é admin
      if (decoded.role !== 'admin') {
        console.log('❌ Usuário não é admin, role:', decoded.role);
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem forçar atualização." });
      }

      console.log('✅ Permissão validada');

      if (!supabase) {
        console.log('❌ Supabase não configurado');
        return res.status(500).json({ error: "Supabase não configurado" });
      }

      console.log('✅ Supabase OK');

      // Resetar cache para forçar reload
      console.log('🔄 Resetando cache...');
      formalizacaoCache = null;
      formalizacaoCacheTimestamp = 0;
      isCachingFormalizacao = false;
      
      // Recarregar usando getAllFormalizacoes com forceRefresh=true
      console.log('📊 Chamando getAllFormalizacoes(true)...');
      const allData = await getAllFormalizacoes(true);
      
      console.log(`✅ Cache atualizado: ${allData.length} registros`);
      return res.json({ 
        success: true, 
        message: "Cache atualizado com sucesso",
        recordsLoaded: allData.length
      });

    } catch (error: any) {
      console.error('❌ ERRO CAPTURADO:', error.message);
      console.error('Stack:', error.stack);
      return res.status(500).json({ error: error.message || "Erro ao atualizar cache" });
    }
  });

  app.get("/api/debug/cache-status", async (req, res) => {
    try {
      const hasCacheData = formalizacaoCache !== null && formalizacaoCache !== undefined;
      const cacheAge = hasCacheData ? Math.round((Date.now() - formalizacaoCacheTimestamp) / 1000) : null;
      const cacheSize = hasCacheData ? formalizacaoCache!.length : 0;
      
      return res.json({
        hasCacheData,
        cacheSize,
        cacheAge: cacheAge ? `${cacheAge}s` : null,
        CACHE_TTL: `${FORMALIZACAO_CACHE_TTL / 1000 / 60}min`
      });
    } catch (error) {
      return res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/formalizacao/bulk", async (req, res) => {
    try {
      const items = req.body;
      if (!Array.isArray(items)) return res.status(400).json({ error: "Dados inválidos" });

      const validColumns = [
        "seq", "ano", "parlamentar", "partido", "emenda", "emendas_agregadoras", "demanda",
        "demandas_formalizacao", "numero_convenio", "classificacao_emenda_demanda", "tipo_formalizacao",
        "regional", "municipio", "conveniado", "objeto", "portfolio", "valor",
        "posicao_anterior", "situacao_demandas_sempapel", "area_estagio", "recurso", "tecnico",
        "data_liberacao", "area_estagio_situacao_demanda", "situacao_analise_demanda", "data_analise_demanda",
        "motivo_retorno_diligencia", "data_retorno_diligencia", "conferencista",
        "data_recebimento_demanda", "data_retorno", "observacao_motivo_retorno", "data_liberacao_assinatura_conferencista",
        "data_liberacao_assinatura", "falta_assinatura", "assinatura", "publicacao",
        "vigencia", "encaminhado_em", "concluida_em"
      ];

      const columnMapping: any = {
        "Seq": "seq",
        "Ano": "ano",
        "Parlamentar": "parlamentar",
        "Partido": "partido",
        "Emenda": "emenda",
        "Emendas Agregadoras": "emendas_agregadoras",
        "Demanda": "demanda",
        "DEMANDAS FORMALIZAÇÃO": "demandas_formalizacao",
        "DEMANDAS FORMALIZACAO": "demandas_formalizacao",
        "N° de Convênio": "numero_convenio",
        "N° de Convenio": "numero_convenio",
        "Numero Convenio": "numero_convenio",
        "Classificação Emenda/Demanda": "classificacao_emenda_demanda",
        "Classificacao Emenda/Demanda": "classificacao_emenda_demanda",
        "Tipo de Formalização": "tipo_formalizacao",
        "Tipo de Formalizacao": "tipo_formalizacao",
        "Regional": "regional",
        "Município": "municipio",
        "Municipio": "municipio",
        "Conveniado": "conveniado",
        "Objeto": "objeto",
        "Portfólio": "portfolio",
        "Portfolio": "portfolio",
        "Portfólio ": "portfolio",
        "Valor": "valor",
        "Posição Anterior": "posicao_anterior",
        "Posicao Anterior": "posicao_anterior",
        "Situação Demandas - SemPapel": "situacao_demandas_sempapel",
        "Situacao Demandas - SemPapel": "situacao_demandas_sempapel",
        "Área - estágio": "area_estagio",
        "Area - estagio": "area_estagio",
        "Recurso": "recurso",
        "Tecnico": "tecnico",
        "Data da Liberação": "data_liberacao",
        "Data da Liberacao": "data_liberacao",
        "Área - Estágio Situação da Demanda": "area_estagio_situacao_demanda",
        "Area - Estagio Situacao da Demanda": "area_estagio_situacao_demanda",
        "Situação - Análise Demanda": "situacao_analise_demanda",
        "Situacao - Analise Demanda": "situacao_analise_demanda",
        "Data - Análise Demanda": "data_analise_demanda",
        "Data - Analise Demanda": "data_analise_demanda",
        "Motivo do Retorno da Diligência": "motivo_retorno_diligencia",
        "Motivo do Retorno da Diligencia": "motivo_retorno_diligencia",
        "Data do Retorno da Diligência": "data_retorno_diligencia",
        "Data do Retorno da Diligencia": "data_retorno_diligencia",
        "Conferencista": "conferencista",
        "Data recebimento demanda": "data_recebimento_demanda",
        "Data do Retorno": "data_retorno",
        "Observação - Motivo do Retorno": "observacao_motivo_retorno",
        "Observacao - Motivo do Retorno": "observacao_motivo_retorno",
        "Data liberação da Assinatura - Conferencista": "data_liberacao_assinatura_conferencista",
        "Data liberacao da Assinatura - Conferencista": "data_liberacao_assinatura_conferencista",
        "Data liberação de Assinatura": "data_liberacao_assinatura",
        "Data liberacao de Assinatura": "data_liberacao_assinatura",
        "Falta assinatura": "falta_assinatura",
        "Assinatura": "assinatura",
        "Publicação": "publicacao",
        "Publicacao": "publicacao",
        "Vigência": "vigencia",
        "Vigencia": "vigencia",
        "Encaminhado em": "encaminhado_em",
        "Concluída em": "concluida_em",
        "Concluida em": "concluida_em"
      };

      const filteredItems = items.map((item, idx) => {
        const filtered: any = {};
        Object.keys(item).forEach(csvKey => {
          const dbKey = columnMapping[csvKey] || csvKey;
          if (validColumns.includes(dbKey)) {
            let val = item[csvKey];
            // ✅ NÃO DESCARTAR SE ESTIVER VAZIO - Manter o valor mesmo se for vazio/null
            if (val === undefined || val === null || val === '') {
              // Deixar como undefined para não preencher o campo
              return;
            }
            if (dbKey === 'valor') {
              const cleanVal = String(val || '0').replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
              const parsed = parseFloat(cleanVal);
              filtered[dbKey] = isNaN(parsed) ? 0 : parsed;
            } else {
              filtered[dbKey] = String(val).trim();
            }
          }
        });
        // ✅ NÃO FILTRAR - Importar TODOS os registros, mesmo que tenham campos vazios
        return filtered;
      });

      console.log(`📥 Bulk Import: ${filteredItems.length} registros para verificar duplicatas`);
      
      if (supabase && filteredItems.length > 0) {
        try {
          const { error: testError } = await supabase.from("formalizacao").select("id").limit(1);
          if (testError) throw testError;
          
          // ✅ PASSO 1: Extrair todos os valores de "emenda" dos registros a importar
          const emendasParaImportar = filteredItems
            .filter(item => item.emenda && item.emenda.trim() !== '')
            .map(item => String(item.emenda).trim());
          
          console.log(`🔍 Verificando ${emendasParaImportar.length} emendas contra banco de dados...`);
          
          // ✅ PASSO 2: Buscar emendas já existentes no banco
          let emendasExistentes: string[] = [];
          if (emendasParaImportar.length > 0) {
            const { data: existentes, error: errorCheck } = await supabase
              .from("formalizacao")
              .select("emenda")
              .in("emenda", emendasParaImportar);
            
            if (errorCheck) {
              console.error('❌ Erro ao verificar duplicatas:', errorCheck);
              throw errorCheck;
            }
            
            emendasExistentes = (existentes || []).map(r => String(r.emenda).trim());
            console.log(`   Found ${emendasExistentes.length} existing emendas`);
          }
          
          // ✅ PASSO 3: Filtrar apenas registros novos (sem duplicatas)
          const itemsParaInserir = filteredItems.filter(item => {
            if (!item.emenda || item.emenda.trim() === '') {
              // Registros sem emenda ainda podem ser inseridos
              return true;
            }
            return !emendasExistentes.includes(String(item.emenda).trim());
          });
          
          const duplicatasEncontradas = filteredItems.length - itemsParaInserir.length;
          console.log(`✅ ${itemsParaInserir.length} novos registros | ⚠️ ${duplicatasEncontradas} duplicatas ignoradas`);
          
          if (itemsParaInserir.length === 0) {
            console.log('⚠️ Nenhum registro novo para inserir (todos são duplicatas)');
            return res.json({ count: 0, duplicates: duplicatasEncontradas, message: "Nenhum registro novo (todos são duplicatas)" });
          }
          
          // ✅ PASSO 4: Inserir apenas os registros novos
          let totalInserted = 0;
          for (let i = 0; i < itemsParaInserir.length; i += 100) {
            const chunk = itemsParaInserir.slice(i, i + 100);
            const { data, error } = await supabase.from("formalizacao").insert(chunk).select();
            if (error) {
              console.error(`❌ Erro ao inserir chunk ${i/100 + 1}:`, error);
              throw error;
            }
            totalInserted += data?.length || 0;
            console.log(`   ✓ Chunk ${i/100 + 1}: ${data?.length || 0} registros inseridos`);
          }
          
          console.log(`✅ Total importado: ${totalInserted}/${itemsParaInserir.length} registros`);
          
          // ✅ Limpar cache para forçar recarregar na próxima requisição
          console.log(`🔄 Clearing formalizacao cache...`);
          formalizacaoCache = null;
          formalizacaoCacheTimestamp = 0;
          
          return res.json({ 
            count: totalInserted, 
            duplicates: duplicatasEncontradas,
            message: `${totalInserted} novos registros importados | ${duplicatasEncontradas} duplicatas ignoradas`
          });
        } catch (error: any) {
          console.error(`❌ Erro crítico no import:`, error);
          return res.status(500).json({ error: "Erro no Supabase", details: error.message });
        }
      }
      res.json({ count: 0 });
    } catch (error: any) {
      console.error(`❌ Erro no bulk import:`, error);
      res.status(500).json({ error: "Erro no import formalização", details: error.message });
    }
  });

  app.put("/api/emendas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (supabase) {
        const { error } = await supabase
          .from("emendas")
          .update(req.body)
          .eq("id", id);
        if (error) throw error;
        return res.json({ success: true });
      }
      res.status(500).json({ error: "Supabase não configurado" });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar emenda" });
    }
  });

  app.delete("/api/emendas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (supabase) {
        const { error } = await supabase
          .from("emendas")
          .delete()
          .eq("id", id);
        if (error) throw error;
        return res.json({ success: true });
      }
      res.status(500).json({ error: "Supabase não configurado" });
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir emenda" });
    }
  });

  app.post("/api/formalizacao", async (req, res) => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from("formalizacao")
          .insert([req.body])
          .select();
        if (error) throw error;
        return res.json(data[0]);
      }
      res.status(201).json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao criar formalização" });
    }
  });

  app.put("/api/formalizacao/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (supabase) {
        const { error } = await supabase
          .from("formalizacao")
          .update(req.body)
          .eq("id", id);
        if (error) throw error;
        return res.json({ success: true });
      }
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar formalização" });
    }
  });

  app.delete("/api/formalizacao/:id", authMiddleware, async (req: any, res) => {
    try {
      console.log('\n' + '='.repeat(60));
      console.log('🗑️ DELETE /api/formalizacao/:id');
      console.log('='.repeat(60));

      const { id } = req.params;
      const { senha } = req.body;

      console.log('✅ 1️⃣ Parâmetros:');
      console.log('   - ID:', id);
      console.log('   - User role:', req.user.role);
      console.log('   - Senha fornecida:', !!senha);

      // Apenas admins podem deletar formalizações
      if (req.user.role !== 'admin') {
        console.log('❌ Usuário não é admin');
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem deletar formalizações." });
      }

      if (!senha) {
        console.log('❌ Senha não fornecida');
        return res.status(400).json({ error: "Senha é obrigatória para deletar uma formalização" });
      }

      console.log('✅ 2️⃣ Validações passadas');

      if (!supabase) {
        console.log('❌ Supabase não configurado');
        return res.status(500).json({ error: "Supabase não configurado" });
      }

      // Verificar se a senha do admin está correta
      console.log('✅ 3️⃣ Verificando senha do admin...');
      const { data: adminData, error: adminError } = await supabase
        .from("usuarios")
        .select("senha_hash")
        .eq("id", req.user.id)
        .single();

      if (adminError || !adminData) {
        console.error('❌ Erro ao buscar dados do admin:', adminError);
        return res.status(400).json({ error: "Erro ao verificar credenciais" });
      }

      // Verificar a senha usando bcrypt
      const senhasMatch = await bcrypt.compare(senha, adminData.senha_hash);
      if (!senhasMatch) {
        console.log('❌ Senha do admin incorreta');
        return res.status(401).json({ error: "Senha incorreta" });
      }

      console.log('✅ 4️⃣ Senha do admin validada com sucesso');

      // Deletar formalizacao
      console.log('✅ 5️⃣ Deletando formalizacao ID:', id);
      const { error } = await supabase
        .from("formalizacao")
        .delete()
        .eq("id", id);

      if (error) {
        console.error('❌ Erro ao deletar:', error);
        throw error;
      }

      console.log('✅ 6️⃣ Formalização deletada com sucesso');
      return res.json({ success: true, message: "Formalização deletada com sucesso" });
    } catch (error) {
      console.error('❌ Erro ao excluir formalização:', error);
      res.status(500).json({ error: "Erro ao excluir formalização" });
    }
  });

  // Atribuir técnico a múltiplas formalizações (com usuário do banco)
  app.post("/api/formalizacao/atribuir-tecnico", authMiddleware, async (req: any, res) => {
    try {
      console.log('\n' + '='.repeat(60));
      console.log('🔐 POST /api/formalizacao/atribuir-tecnico');
      console.log('='.repeat(60));

      const { ids, usuario_id, data_liberacao } = req.body;
      console.log('✅ 1️⃣ Dados recebidos:');
      console.log('   - IDs (quantidade):', ids?.length);
      console.log('   - IDs (valores):', JSON.stringify(ids));
      console.log('   - ID do usuário técnico:', usuario_id);
      console.log('   - Data Liberação:', data_liberacao);
      console.log('   - User role:', req.user.role);

      // Validar permissão (apenas admin)
      if (req.user.role !== 'admin' && req.user.role !== 'intermediario') {
        console.log('❌ Usuário não tem permissão');
        return res.status(403).json({ error: "Acesso negado" });
      }

      console.log('✅ 2️⃣ Permissão validada');

      // Validar entrada
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        console.log('❌ IDs inválidos:', ids);
        return res.status(400).json({ error: "IDs não são válidos" });
      }

      // Validar que todos os IDs são números
      const validIds = ids.filter(id => {
        const num = parseInt(id, 10);
        if (isNaN(num) || num <= 0) {
          console.warn(`⚠️ ID inválido descartado: ${id}`);
          return false;
        }
        return true;
      });

      if (validIds.length === 0) {
        console.log('❌ Nenhum ID válido encontrado');
        return res.status(400).json({ error: "Nenhum ID válido fornecido" });
      }

      if (validIds.length !== ids.length) {
        console.warn(`⚠️ ${ids.length - validIds.length} IDs inválidos descartados. Prosseguindo com: ${JSON.stringify(validIds)}`);
      }

      if (!usuario_id) {
        console.log('❌ ID do usuário inválido');
        return res.status(400).json({ error: "ID do usuário inválido" });
      }

      console.log('✅ 3️⃣ Entrada validada');

      if (!supabase) {
        console.log('❌ Supabase não configurado');
        return res.status(500).json({ error: "Supabase não configurado" });
      }

      console.log('✅ 4️⃣ Supabase conectado');

      // Buscar dados do usuário técnico
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id, nome, email')
        .eq('id', usuario_id)
        .single();

      if (usuarioError || !usuarioData) {
        console.log('❌ 5a❌ Técnico não encontrado:', usuarioError);
        return res.status(400).json({ error: "Técnico não encontrado" });
      }

      console.log('✅ 5️⃣ Técnico encontrado:', usuarioData.nome);

      // Validar data
      if (!data_liberacao || !/^\d{4}-\d{2}-\d{2}$/.test(data_liberacao)) {
        console.log('❌ Data inválida:', data_liberacao);
        return res.status(400).json({ error: "Data em formato inválido (use YYYY-MM-DD)" });
      }

      console.log('✅ 6️⃣ Data validada:', data_liberacao);

      // Atualizar formalizações com o técnico
      console.log(`✅ 7️⃣ Atualizando ${validIds.length} registro(s) em Supabase...`);
      const { error: updateError, data: updatedData } = await supabase
        .from('formalizacao')
        .update({
          tecnico: usuarioData.nome,
          usuario_atribuido_id: usuario_id,
          data_liberacao: data_liberacao,
          updated_at: new Date().toISOString()
        })
        .in('id', validIds)
        .select('id, demandas_formalizacao, seq, tecnico, data_liberacao');

      if (updateError) {
        console.error('❌ 8a❌ Erro Supabase:', updateError);
        return res.status(400).json({ error: updateError.message || "Erro ao atribuir técnico" });
      }

      console.log('✅ 8️⃣ UPDATE completado');
      console.log('✅ 9️⃣ Registros atualizados:', updatedData?.length || 0);
      if (updatedData && updatedData.length > 0) {
        console.log('   Amostra de atualização:', updatedData.slice(0, 3));
      }

      return res.json({
        message: "Técnico atribuído com sucesso",
        updated: updatedData?.length || 0,
        tecnico: usuarioData.nome,
        updatedRecords: updatedData || [],
        success: true
      });
    } catch (error) {
      console.error('❌ ⚠️ ERRO CAPTURADO:', error);
      res.status(500).json({ error: "Erro ao atribuir técnico", success: false });
    }
  });

  // Remover atribuição de técnico
  app.post("/api/formalizacao/remover-tecnico", authMiddleware, async (req: any, res) => {
    try {
      const { ids } = req.body;

      // Validar permissão
      if (req.user.role !== 'admin' && req.user.role !== 'intermediario') {
        return res.status(403).json({ error: "Acesso negado" });
      }

      // Validar entrada
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "IDs não são válidos" });
      }

      // Validar que todos os IDs são números
      const validIds = ids.filter(id => {
        const num = parseInt(id, 10);
        return !isNaN(num) && num > 0;
      });

      if (validIds.length === 0) {
        return res.status(400).json({ error: "Nenhum ID válido fornecido" });
      }

      if (!supabase) {
        return res.status(500).json({ error: "Supabase não configurado" });
      }

      // Remover atribuição de técnico (setando como NULL)
      const { error: updateError, data: updatedData } = await supabase
        .from('formalizacao')
        .update({
          tecnico: null,
          usuario_atribuido_id: null,
          data_liberacao: null,
          updated_at: new Date().toISOString()
        })
        .in('id', validIds)
        .select('id, tecnico');

      if (updateError) {
        return res.status(400).json({ error: updateError.message || "Erro ao remover atribuição" });
      }

      return res.json({
        message: "Atribuição removida com sucesso",
        updated: updatedData?.length || 0,
        success: true
      });
    } catch (error) {
      console.error('❌ Erro ao remover atribuição:', error);
      res.status(500).json({ error: "Erro ao remover atribuição", success: false });
    }
  });

  // Atribuir conferencista a múltiplas formalizações
  app.post("/api/formalizacao/atribuir-conferencista", authMiddleware, async (req: any, res) => {
    try {
      console.log('\n' + '='.repeat(60));
      console.log('🔐 POST /api/formalizacao/atribuir-conferencista');
      console.log('='.repeat(60));

      const { ids, usuario_id, data_recebimento_demanda } = req.body;
      console.log('✅ 1️⃣ Dados recebidos:');
      console.log('   - IDs (quantidade):', ids?.length);
      console.log('   - IDs (valores):', JSON.stringify(ids));
      console.log('   - ID do usuário conferencista:', usuario_id);
      console.log('   - Data Recebimento:', data_recebimento_demanda);
      console.log('   - User role:', req.user.role);

      if (req.user.role !== 'admin' && req.user.role !== 'intermediario') {
        console.log('❌ Usuário não tem permissão');
        return res.status(403).json({ error: "Acesso negado" });
      }

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        console.log('❌ IDs inválidos:', ids);
        return res.status(400).json({ error: "IDs não são válidos" });
      }

      const validIds = ids.filter((id: any) => {
        const num = parseInt(id, 10);
        if (isNaN(num) || num <= 0) {
          console.warn(`⚠️ ID inválido descartado: ${id}`);
          return false;
        }
        return true;
      });

      if (validIds.length === 0) {
        return res.status(400).json({ error: "Nenhum ID válido fornecido" });
      }

      if (!usuario_id) {
        return res.status(400).json({ error: "ID do usuário inválido" });
      }

      if (!supabase) {
        return res.status(500).json({ error: "Supabase não configurado" });
      }

      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id, nome, email')
        .eq('id', usuario_id)
        .single();

      if (usuarioError || !usuarioData) {
        console.log('❌ Conferencista não encontrado:', usuarioError);
        return res.status(400).json({ error: "Conferencista não encontrado" });
      }

      console.log('✅ Conferencista encontrado:', usuarioData.nome);

      if (!data_recebimento_demanda || !/^\d{4}-\d{2}-\d{2}$/.test(data_recebimento_demanda)) {
        return res.status(400).json({ error: "Data em formato inválido (use YYYY-MM-DD)" });
      }

      console.log(`✅ Atualizando ${validIds.length} registro(s)...`);
      const { error: updateError, data: updatedData } = await supabase
        .from('formalizacao')
        .update({
          conferencista: usuarioData.nome,
          data_recebimento_demanda: data_recebimento_demanda,
          updated_at: new Date().toISOString()
        })
        .in('id', validIds)
        .select('id, demandas_formalizacao, seq, conferencista, data_recebimento_demanda');

      if (updateError) {
        console.error('❌ Erro Supabase:', updateError);
        return res.status(400).json({ error: updateError.message || "Erro ao atribuir conferencista" });
      }

      console.log('✅ Registros atualizados:', updatedData?.length || 0);

      return res.json({
        message: "Conferencista atribuído com sucesso",
        updated: updatedData?.length || 0,
        conferencista: usuarioData.nome,
        updatedRecords: updatedData || [],
        success: true
      });
    } catch (error) {
      console.error('❌ ERRO:', error);
      res.status(500).json({ error: "Erro ao atribuir conferencista", success: false });
    }
  });

  // Remover atribuição de conferencista
  app.post("/api/formalizacao/remover-conferencista", authMiddleware, async (req: any, res) => {
    try {
      const { ids } = req.body;

      if (req.user.role !== 'admin' && req.user.role !== 'intermediario') {
        return res.status(403).json({ error: "Acesso negado" });
      }

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "IDs não são válidos" });
      }

      const validIds = ids.filter((id: any) => {
        const num = parseInt(id, 10);
        return !isNaN(num) && num > 0;
      });

      if (validIds.length === 0) {
        return res.status(400).json({ error: "Nenhum ID válido fornecido" });
      }

      if (!supabase) {
        return res.status(500).json({ error: "Supabase não configurado" });
      }

      const { error: updateError, data: updatedData } = await supabase
        .from('formalizacao')
        .update({
          conferencista: null,
          data_recebimento_demanda: null,
          updated_at: new Date().toISOString()
        })
        .in('id', validIds)
        .select('id, conferencista');

      if (updateError) {
        return res.status(400).json({ error: updateError.message || "Erro ao remover atribuição" });
      }

      return res.json({
        message: "Atribuição de conferencista removida com sucesso",
        updated: updatedData?.length || 0,
        success: true
      });
    } catch (error) {
      console.error('❌ Erro ao remover atribuição de conferencista:', error);
      res.status(500).json({ error: "Erro ao remover atribuição de conferencista", success: false });
    }
  });

  // Buscar lista de técnicos (usuários do sistema)
  app.get("/api/formalizacao/tecnicos", authMiddleware, async (req: any, res) => {
    try {
      console.log('🔍 GET /api/formalizacao/tecnicos');
      
      if (!supabase) {
        return res.status(500).json({ error: "Supabase não configurado" });
      }

      // Buscar todos os usuários ativos que podem ser técnicos
      let data, error;
      const resultado = await supabase
        .from('usuarios')
        .select('id, nome, email, role')
        .eq('ativo', true)
        .order('nome', { ascending: true });
      
      data = resultado.data;
      error = resultado.error;

      if (error) {
        console.error('❌ Erro ao buscar técnicos:', error);
        return res.status(400).json({ error: error.message });
      }

      console.log(`✅ ${data?.length || 0} técnicos encontrados`);
      res.json({ tecnicos: data || [] });
    } catch (error) {
      console.error('❌ ERRO:', error);
      res.status(500).json({ error: "Erro ao buscar técnicos" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Fallback for SPA: serve index.html for routes without extensions
    app.get("*", (req, res, next) => {
      if (req.path.includes(".") || req.path.startsWith("/api")) {
        return next();
      }
      vite.transformIndexHtml(req.url, readFileSync(path.join(__dirname, "index.html"), "utf-8"))
        .then(html => res.type("html").send(html))
        .catch(err => {
          res.status(500).end(err.message);
        });
    });
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
