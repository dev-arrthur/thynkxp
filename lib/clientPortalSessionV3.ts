import crypto from 'node:crypto';

export const CLIENT_V3_COOKIE = 'thynkxp_client_session_v3';
export const CLIENT_V3_MAX_AGE = 60 * 60 * 8;
const VERSION = 3;
const DEV_SECRET = 'development-client-session-secret-change-in-production-v3';
const DERIVATION_SALT = 'thynkxp-client-portal-session-v3';

function secret() {
  const configured = String(process.env.CLIENT_PORTAL_SESSION_SECRET || '').trim();
  if (configured.length >= 32) return configured;

  const adminSecret = String(process.env.ADMIN_SESSION_SECRET || '').trim();
  if (adminSecret.length >= 32) {
    return crypto.scryptSync(adminSecret, DERIVATION_SALT, 64).toString('base64url');
  }

  const adminPassword = String(process.env.ADMIN_PASSWORD || '');
  if (adminPassword) {
    return crypto.scryptSync(adminPassword, DERIVATION_SALT, 64).toString('base64url');
  }

  if (process.env.NODE_ENV !== 'production') return DEV_SECRET;
  return '';
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function clientSessionV3Configured() {
  return Boolean(secret());
}

export function createClientSessionV3(identity: { email: string; clientId: string; name: string; company: string; sessionVersion?: number }) {
  const key = secret();
  if (!key) throw new Error('client_session_secret_missing');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    v: VERSION,
    email: identity.email.trim().toLowerCase().slice(0, 180),
    clientId: identity.clientId.slice(0, 80),
    name: identity.name.slice(0, 160),
    company: identity.company.slice(0, 180),
    sessionVersion: identity.sessionVersion || 0,
    iat: now,
    exp: now + CLIENT_V3_MAX_AGE,
    nonce: crypto.randomUUID(),
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', key).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function readClientSessionV3(value?: string | null) {
  if (!value || value.length > 4096) return null;
  const key = secret();
  if (!key) return null;
  const [payload, signature, extra] = value.split('.');
  if (!payload || !signature || extra) return null;
  const expected = crypto.createHmac('sha256', key).update(payload).digest('base64url');
  if (!safeEqual(signature, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      v?: number; email?: string; clientId?: string; name?: string; company?: string; iat?: number; exp?: number; sessionVersion?: number;
    };
    const now = Math.floor(Date.now() / 1000);
    if (parsed.v !== VERSION || !parsed.email || !parsed.clientId || !parsed.iat || !parsed.exp) return null;
    if (parsed.iat > now + 60 || parsed.exp <= now || parsed.exp - parsed.iat > CLIENT_V3_MAX_AGE + 60) return null;
    if (parsed.sessionVersion !== undefined && (!Number.isSafeInteger(parsed.sessionVersion) || parsed.sessionVersion < 0)) return null;
    return {
      email: parsed.email,
      clientId: parsed.clientId,
      name: parsed.name || 'Cliente ThynkXP',
      company: parsed.company || '',
      sessionVersion: parsed.sessionVersion || 0,
    };
  } catch {
    return null;
  }
}
