import crypto from 'node:crypto';
import { getDb } from './mongodb';

export const ADMIN_COOKIE = 'thynkxp_admin_session';
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;

const DEFAULT_ADMIN_EMAIL = 'arthur.ferreira@thynkxp.com.br';

type AdminAccount = {
  email: string;
  role: 'admin';
  active: boolean;
  passwordSalt: string;
  passwordHash: string;
  sessionSecret?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function configuredEmail() {
  return normalizeEmail(process.env.ADMIN_EMAIL) || DEFAULT_ADMIN_EMAIL;
}

function configuredPassword() {
  return String(process.env.ADMIN_PASSWORD || '');
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function hashPassword(password: string, salt: string) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function adminAuthConfigured() {
  return Boolean(configuredEmail() && configuredPassword());
}

export function validateAdminCredentials(email: unknown, password: unknown) {
  const receivedEmail = normalizeEmail(email);
  const receivedPassword = String(password || '');
  if (!receivedEmail || !receivedPassword || !safeEqual(receivedEmail, configuredEmail())) return false;
  return safeEqual(receivedPassword, configuredPassword());
}

async function ensureAdminAccount(password: string) {
  const database = await getDb();
  const users = database.collection<AdminAccount>('users');
  const email = configuredEmail();
  const now = new Date();

  await users.createIndex({ email: 1 }, { unique: true });
  const current = await users.findOne({ email });
  const passwordMatches = Boolean(
    current?.passwordSalt
    && current?.passwordHash
    && safeEqual(hashPassword(password, current.passwordSalt), current.passwordHash),
  );
  const passwordSalt = passwordMatches ? current?.passwordSalt as string : crypto.randomBytes(16).toString('hex');
  const passwordHash = passwordMatches ? current?.passwordHash as string : hashPassword(password, passwordSalt);
  const sessionSecret = current?.sessionSecret
    || String(process.env.ADMIN_SESSION_SECRET || '').trim()
    || crypto.randomBytes(48).toString('base64url');

  await users.updateOne(
    { email },
    {
      $set: { role: 'admin', active: true, passwordSalt, passwordHash, sessionSecret, updatedAt: now },
      $setOnInsert: { email, createdAt: now },
    },
    { upsert: true },
  );

  const account = await users.findOne({ email });
  if (!account?.sessionSecret || account.active === false) throw new Error('Admin account unavailable');
  return account;
}

function sign(payload: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

export async function createAdminSessionToken(email: unknown, password: unknown) {
  const receivedPassword = String(password || '');
  if (!validateAdminCredentials(email, receivedPassword)) throw new Error('Invalid admin credentials');
  const account = await ensureAdminAccount(receivedPassword);
  if (!safeEqual(normalizeEmail(email), account.email)) throw new Error('Invalid admin identity');

  const payload = Buffer.from(JSON.stringify({
    email: account.email,
    exp: Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000,
    nonce: crypto.randomUUID(),
  })).toString('base64url');

  return `${payload}.${sign(payload, account.sessionSecret as string)}`;
}

export async function verifyAdminSessionToken(token: string | undefined | null) {
  if (!token || !adminAuthConfigured()) return false;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return false;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { email?: string; exp?: number };
    if (!decoded.exp || decoded.exp <= Date.now() || normalizeEmail(decoded.email) !== configuredEmail()) return false;

    const database = await getDb();
    const account = await database.collection<AdminAccount>('users').findOne({ email: configuredEmail(), active: true });
    if (!account?.sessionSecret) return false;
    return safeEqual(signature, sign(payload, account.sessionSecret));
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
