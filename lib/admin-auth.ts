import crypto from 'node:crypto';

export const ADMIN_COOKIE = 'thynkxp_admin_session';
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8;

const DEFAULT_ADMIN_EMAIL = 'arthur.ferreira@thynkxp.com.br';
const SESSION_VERSION = 2;
const SESSION_SALT = 'thynkxp-admin-session-v2';

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function configuredEmail() {
  return normalizeEmail(process.env.ADMIN_EMAIL) || DEFAULT_ADMIN_EMAIL;
}

function configuredPassword() {
  return String(process.env.ADMIN_PASSWORD || '');
}

function dedicatedSessionSecret() {
  return String(process.env.ADMIN_SESSION_SECRET || '').trim();
}

function sessionSecret() {
  const dedicated = dedicatedSessionSecret();
  if (dedicated.length >= 32) return dedicated;

  const password = configuredPassword();
  if (!password) return '';
  return crypto.scryptSync(password, SESSION_SALT, 64).toString('base64url');
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function sign(payload: string) {
  const secret = sessionSecret();
  if (!secret) throw new Error('Admin session secret unavailable');
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

export function adminAuthConfigured() {
  return Boolean(configuredEmail() && configuredPassword() && sessionSecret());
}

export function adminSessionHasDedicatedSecret() {
  return dedicatedSessionSecret().length >= 32;
}

export function validateAdminCredentials(email: unknown, password: unknown) {
  const receivedEmail = normalizeEmail(email);
  const receivedPassword = String(password || '');
  if (!receivedEmail || !receivedPassword) return false;
  return safeEqual(receivedEmail, configuredEmail()) && safeEqual(receivedPassword, configuredPassword());
}

export function createAdminSessionToken(email: unknown, password: unknown) {
  if (!validateAdminCredentials(email, password)) throw new Error('Invalid admin credentials');

  const now = Date.now();
  const payload = Buffer.from(JSON.stringify({
    v: SESSION_VERSION,
    email: configuredEmail(),
    iat: now,
    exp: now + ADMIN_SESSION_TTL_SECONDS * 1000,
    nonce: crypto.randomUUID(),
  })).toString('base64url');

  return `${payload}.${sign(payload)}`;
}

export function verifyAdminSessionToken(token: string | undefined | null) {
  if (!token || token.length > 4096 || !adminAuthConfigured()) return false;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return false;

  try {
    if (!safeEqual(signature, sign(payload))) return false;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      v?: number;
      email?: string;
      iat?: number;
      exp?: number;
    };

    if (decoded.v !== SESSION_VERSION) return false;
    if (!decoded.iat || decoded.iat > Date.now() + 60_000) return false;
    if (!decoded.exp || decoded.exp <= Date.now()) return false;
    if (decoded.exp - decoded.iat > ADMIN_SESSION_TTL_SECONDS * 1000 + 60_000) return false;
    return safeEqual(normalizeEmail(decoded.email), configuredEmail());
  } catch {
    return false;
  }
}

export async function getAdminSessionFromRequest(req: Request) {
  const raw = req.headers.get('cookie') || '';
  const match = raw.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE}=([^;]+)`));
  const token = match ? decodeURIComponent(match[1]) : '';
  return verifyAdminSessionToken(token);
}
