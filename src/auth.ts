import crypto from 'crypto';

/**
 * Gera hash SHA256 da senha (compatível com Supabase)
 */
export function hashPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(password)
    .digest('hex');
}

/**
 * Verifica se a senha corresponde ao hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

/**
 * Gera token simples em base64 (compatível com Cloudflare)
 */
export function generateToken(userId: number, email: string, role: string): string {
  const payload = {
    userId,
    email,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 horas
  };
  
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Verifica e decodifica token
 */
export function verifyToken(token: string): any {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Token expirado
    }
    return payload;
  } catch {
    return null;
  }
}

