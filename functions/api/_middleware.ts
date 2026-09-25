import { verifyAuthToken } from '../_shared/auth-token';

// Toda rota /api/* exige token assinado, exceto as listadas aqui.
const PUBLIC_ROUTES = new Set(['/api/auth/login', '/api/health']);

// Rotas que alteram dados em massa: somente admin (a UI já só as mostra para admin).
const ADMIN_ONLY_ROUTES = new Set([
  '/api/admin/import-emendas',
  '/api/admin/import-formalizacao',
  '/api/admin/sync-emendas',
  '/api/admin/setup-sync',
  '/api/admin/backup-formalizacao',
  '/api/admin/update-formalizacao-campos',
  '/api/admin/update-area-estagio',
  '/api/cache/refresh',
]);

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';

  if (request.method === 'OPTIONS' || PUBLIC_ROUTES.has(path)) return context.next();

  const secret = env.AUTH_TOKEN_SECRET as string | undefined;
  if (!secret) return json(500, { error: 'Configuração do servidor incompleta (AUTH_TOKEN_SECRET)' });

  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const user = token ? await verifyAuthToken(token, secret) : null;
  if (!user) return json(401, { error: 'Sessão inválida ou expirada. Faça login novamente.' });

  if (ADMIN_ONLY_ROUTES.has(path) && user.role !== 'admin') {
    return json(403, { error: 'Acesso restrito a administradores' });
  }

  context.data.user = user;
  return context.next();
};
