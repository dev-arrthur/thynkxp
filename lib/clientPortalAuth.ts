import crypto from 'node:crypto';

export const CLIENT_SESSION_COOKIE = 'thynkxp_client_session';
const DEMO_EMAIL = 'cliente@gmail.com';
const DEMO_PASSWORD_SHA256 = '8b6e4cd89394dd3dd4238124c739b166350a735c54c7fafcabac85ba62660edc';
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function sessionSecret() {
  return process.env.CLIENT_PORTAL_SESSION_SECRET || 'thynkxp-client-template-v1-change-in-production';
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function validateClientCredentials(email: string, password: string) {
  const allowedEmail = (process.env.CLIENT_PORTAL_EMAIL || DEMO_EMAIL).trim().toLowerCase();
  const allowedPasswordHash = process.env.CLIENT_PORTAL_PASSWORD_HASH || DEMO_PASSWORD_SHA256;
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

  return safeEqual(email.trim().toLowerCase(), allowedEmail) && safeEqual(passwordHash, allowedPasswordHash);
}

export function createClientSession(email: string) {
  const payload = Buffer.from(JSON.stringify({
    email: email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  })).toString('base64url');

  const signature = crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function readClientSession(value?: string | null) {
  if (!value) return null;
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;

  const expected = crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  if (!safeEqual(signature, expected)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { email?: string; exp?: number };
    if (!parsed.email || !parsed.exp || parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    return { email: parsed.email };
  } catch {
    return null;
  }
}

export const CLIENT_SESSION_MAX_AGE = SESSION_TTL_SECONDS;
