import crypto from 'node:crypto';
import { ObjectId } from 'mongodb';
import { getDb } from './mongodb';

export type ClientAccountIdentity = {
  id: string;
  email: string;
  name: string;
  company: string;
};

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function createClientPassword(password: string) {
  const salt = crypto.randomBytes(18).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyClientPassword(password: string, salt: string, expectedHash: string) {
  if (!password || !salt || !expectedHash) return false;
  try {
    const actual = crypto.scryptSync(password, salt, 64).toString('hex');
    return safeEqual(actual, expectedHash);
  } catch {
    return false;
  }
}

export async function validateStoredClientCredentials(email: string, password: string): Promise<ClientAccountIdentity | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) return null;

  const db = await getDb();
  const client = await db.collection('clients').findOne({
    'access.emailLower': normalizedEmail,
    status: { $ne: 'arquivado' },
  });
  if (!client) return null;

  const access = client.access && typeof client.access === 'object' ? client.access as Record<string, unknown> : {};
  const salt = String(access.passwordSalt || '');
  const hash = String(access.passwordHash || '');
  if (!verifyClientPassword(password, salt, hash)) return null;

  const business = client.business && typeof client.business === 'object' ? client.business as Record<string, unknown> : {};
  const name = String(access.fullName || business.tradeName || 'Cliente ThynkXP').slice(0, 160);
  const company = String(business.tradeName || business.legalName || 'ThynkXP').slice(0, 180);

  return {
    id: client._id instanceof ObjectId ? client._id.toHexString() : String(client._id || ''),
    email: normalizedEmail,
    name,
    company,
  };
}
