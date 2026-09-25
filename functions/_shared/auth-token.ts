// Token de sessão assinado com HMAC-SHA256.
// Formato mantido compatível com o código existente: btoa(JSON) — os endpoints e o
// frontend continuam lendo o payload com atob(); a diferença é o campo `sig`, que só o
// servidor (com AUTH_TOKEN_SECRET) consegue gerar. Quem valida é functions/api/_middleware.ts.

export interface AuthPayload {
  id: number;
  email: string;
  nome: string;
  role: string;
  exp: number;
}

const enc = new TextEncoder();

function canonical(p: Record<string, unknown>): string {
  const { sig: _ignored, ...rest } = p;
  return JSON.stringify(rest, Object.keys(rest).sort());
}

async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
  let bin = '';
  for (const b of sig) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signAuthToken(payload: AuthPayload, secret: string): Promise<string> {
  const sig = await hmac(secret, canonical(payload as unknown as Record<string, unknown>));
  return btoa(JSON.stringify({ ...payload, sig }));
}

export async function verifyAuthToken(token: string, secret: string): Promise<AuthPayload | null> {
  try {
    const decoded = JSON.parse(atob(token));
    if (!decoded || typeof decoded.sig !== 'string') return null;
    if (typeof decoded.exp !== 'number' || decoded.exp < Math.floor(Date.now() / 1000)) return null;
    const expected = await hmac(secret, canonical(decoded));
    if (!safeEqual(decoded.sig, expected)) return null;
    const { sig: _sig, ...payload } = decoded;
    return payload as AuthPayload;
  } catch {
    return null;
  }
}
