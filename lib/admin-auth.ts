import crypto from 'node:crypto';

export const ADMIN_COOKIE = 'thynkxp_admin_session';
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function sessionSecret() {
  // Prefer a dedicated signing secret. The bootstrap secret remains as a
  // backwards-compatible fallback for deployments that have not migrated yet.
  return (process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_BOOTSTRAP_SECRET || '').trim();
}

export function adminAuthConfigured() {
  return Boolean(
    normalizeEmail(process.env.ADMIN_EMAIL) &&
      String(process.env.ADMIN_BOOTSTRAP_SECRET || '') &&
      sessionSecret()
  );
}

export function validateAdminCredentials(email: unknown, password: unknown) {
  const expectedEmail = normalizeEmail(process.env.ADMIN_EMAIL);
  const expectedPassword = String(process.env.ADMIN_BOOTSTRAP_SECRET || '');
  const receivedEmail = normalizeEmail(email);
  const receivedPassword = String(password || '');

  if (!expectedEmail || !expectedPassword || !receivedEmail || !receivedPassword) return false;

  return safeEqual(receivedEmail, expectedEmail) && safeEqual(receivedPassword, expectedPassword);
}

function sign(payload: string) {
  const key = sessionSecret();
  if (!key) throw new Error('ADMIN_SESSION_SECRET não configurada');
  return crypto.createHmac('sha256', key).update(payload).digest('base64url');
}

export function createAdminSessionToken(email: unknown) {
  const payload = Buffer.from(
    JSON.stringify({
      email: normalizeEmail(email),
      exp: Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000,
      nonce: crypto.randomUUID()
    })
  ).toString('base64url');

  return `${payload}.${sign(payload)}`;
}

export function verifyAdminSessionToken(token: string | undefined | null) {
  if (!token || !adminAuthConfigured()) return false;

  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return false;

  const expected = sign(payload);
  if (!safeEqual(signature, expected)) return false;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      email?: string;
      exp?: number;
    };

    if (!decoded.exp || decoded.exp <= Date.now()) return false;
    return normalizeEmail(decoded.email) === normalizeEmail(process.env.ADMIN_EMAIL);
  } catch {
    return false;
  }
}

export function getAdminSessionFromRequest(req: Request) {
  const raw = req.headers.get('cookie') || '';
  const match = raw.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE}=([^;]+)`));
  const token = match ? decodeURIComponent(match[1]) : '';
  return verifyAdminSessionToken(token);
}
