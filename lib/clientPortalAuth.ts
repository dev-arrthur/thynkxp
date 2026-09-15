import crypto from 'node:crypto';

export const CLIENT_SESSION_COOKIE = 'thynkxp_client_session';
const DEMO_EMAIL = 'cliente@gmail.com';
const DEMO_PASSWORD_SHA256 = '8b6e4cd89394dd3dd4238124c739b166350a735c54c7fafcabac85ba62660edc';
const DEMO_SESSION_SECRET = 'thynkxp-client-development-only-session-secret-v2';
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const SESSION_VERSION = 2;

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function configuredEmail() {
  const explicit = String(process.env.CLIENT_PORTAL_EMAIL || '').trim().toLowerCase();
  return explicit || (isProduction() ? '' : DEMO_EMAIL);
}

function configuredPasswordHash() {
  const explicit = String(process.env.CLIENT_PORTAL_PASSWORD_HASH || '').trim().toLowerCase();
  return explicit || (isProduction() ? '' : DEMO_PASSWORD_SHA256);
}

function sessionSecret() {
  const explicit = String(process.env.CLIENT_PORTAL_SESSION_SECRET || '').trim();
  if (explicit.length >= 32) return explicit;
  return isProduction() ? '' : DEMO_SESSION_SECRET;
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function clientPortalAuthConfigured() {
  return Boolean(configuredEmail() && configuredPasswordHash() && sessionSecret());
}

export function validateClientCredentials(email: string, password: string) {
  if (!clientPortalAuthConfigured()) return false;
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  return safeEqual(email.trim().toLowerCase(), configuredEmail())
    && safeEqual(passwordHash, configuredPasswordHash());
}

export function createClientSession(email: string) {
  const secret = sessionSecret();
  if (!secret) throw new Error('Client portal session secret unavailable');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    v: SESSION_VERSION,
    email: email.trim().toLowerCase(),
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
    nonce: crypto.randomUUID(),
  })).toString('base64url');

  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function readClientSession(value?: string | null) {
  if (!value || value.length > 4096 || !clientPortalAuthConfigured()) return null;
  const [payload, signature, extra] = value.split('.');
  if (!payload || !signature || extra) return null;

  const secret = sessionSecret();
  if (!secret) return null;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (!safeEqual(signature, expected)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      v?: number;
      email?: string;
      iat?: number;
      exp?: number;
    };
    const now = Math.floor(Date.now() / 1000);
    if (parsed.v !== SESSION_VERSION || !parsed.email || !parsed.iat || !parsed.exp) return null;
    if (parsed.iat > now + 60 || parsed.exp <= now || parsed.exp - parsed.iat > SESSION_TTL_SECONDS + 60) return null;
    if (!safeEqual(parsed.email.trim().toLowerCase(), configuredEmail())) return null;
    return { email: parsed.email };
  } catch {
    return null;
  }
}

export const CLIENT_SESSION_MAX_AGE = SESSION_TTL_SECONDS;
