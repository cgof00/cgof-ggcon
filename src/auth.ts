import crypto from 'crypto';

export function hashPassword(password: string): string {
  // Para produção, usar bcrypt. Para desenvolvimento, usar simples hash
  const salt = process.env.PASSWORD_SALT || 'salt';
  return crypto
    .createHash('sha256')
    .update(password + salt)
    .digest('hex');
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
