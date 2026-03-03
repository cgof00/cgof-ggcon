// Use Web Crypto API que funciona em Node.js e Cloudflare Workers
const encoder = new TextEncoder();

export function hashPassword(password: string): string {
  // Para desenvolvimento, usar simples hash
  // Em produção, use bcrypt com biblioteca compatível
  const salt = typeof process !== 'undefined' && process.env?.PASSWORD_SALT 
    ? process.env.PASSWORD_SALT 
    : 'salt';
  
  // Usar algoritmo simples para compatibilidade
  let hash = 0;
  const combined = password + salt;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function generateToken(userId: number, email: string, role: string): string {
  const payload = {
    userId,
    email,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 horas
  };
  
  // Simples encoding em base64 para desenvolvimento
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

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
