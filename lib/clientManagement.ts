import { domainToASCII } from 'node:url';
import { isIP } from 'node:net';
import type { Db } from 'mongodb';

const indexWork = new WeakMap<Db, Promise<unknown>>();
export async function clientCollection(db: Db) {
  let work = indexWork.get(db);
  if (!work) {
    work = Promise.all([
      db.collection('clients').createIndex({ 'business.cnpj': 1 }, { unique: true, sparse: true, name: 'client_cnpj_unique' }),
      db.collection('clients').createIndex({ 'access.emailLower': 1 }, { unique: true, sparse: true, name: 'client_access_email_unique' }),
      db.collection('clients').createIndex({ updatedAt: -1, createdAt: -1 }),
    ]).catch(error => { indexWork.delete(db); throw error; });
    indexWork.set(db, work);
  }
  await work;
  return db.collection('clients');
}

export function clean(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
export function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function pickStrings(value: unknown, keys: string[]) {
  const source = safeObject(value);
  return Object.fromEntries(keys.map(key => [key, clean(source[key], 500)]));
}

/** This allowlist is shared by account endpoints; password hashes never leave the server. */
export function publicClient(doc: Record<string, unknown>, internal = true) {
  const business = safeObject(doc.business);
  const billing = safeObject(doc.billing);
  const access = safeObject(doc.access);
  return {
    _id: String(doc._id || ''),
    status: clean(doc.status, 40) || 'ativo',
    business: {
      ...pickStrings(business, ['cnpj', 'legalName', 'tradeName', 'email', 'phone', 'cnae', 'cnaeDescription', 'companySize', 'legalNature']),
      partners: Array.isArray(business.partners) ? business.partners.slice(0, 20).map(item => clean(item, 180)) : [],
      openedAt: business.openedAt instanceof Date ? business.openedAt.toISOString() : clean(business.openedAt, 30) || null,
    },
    location: pickStrings(doc.location, ['cep', 'state', 'city', 'street', 'number', 'complement', 'district']),
    billing: {
      paymentTerms: clean(billing.paymentTerms, 180),
      paymentMethod: clean(billing.paymentMethod, 100),
      monthlyFee: Number.isFinite(Number(billing.monthlyFee)) ? Number(billing.monthlyFee) : 0,
    },
    access: {
      fullName: clean(access.fullName, 160), email: clean(access.email, 180),
      portalEnabled: access.portalEnabled !== false,
      lastLoginAt: access.lastLoginAt instanceof Date ? access.lastLoginAt.toISOString() : clean(access.lastLoginAt, 30) || null,
    },
    ...(internal ? { notes: clean(doc.notes, 5000) } : {}),
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
  };
}

/** A registered public DNS hostname, never an arbitrary URL or private IP destination. */
export function normalizeClientHostname(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const raw = value.trim().toLowerCase().replace(/\.$/, '');
  if (!raw || raw.length > 253 || /[\s/@:#?\\%]/.test(raw)) return null;
  const hostname = domainToASCII(raw);
  if (!hostname || hostname.length > 253 || isIP(hostname)) return null;
  const labels = hostname.split('.');
  if (labels.length < 2 || labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return null;
  const suffix = labels[labels.length - 1];
  if (!/^[a-z][a-z0-9-]{1,62}$/.test(suffix) || ['localhost', 'local', 'internal', 'lan', 'home', 'test', 'invalid', 'example', 'arpa', 'onion'].includes(suffix)) return null;
  return hostname;
}

export function publicDomain(doc: Record<string, unknown>) {
  return {
    _id: String(doc._id || ''), clientId: clean(doc.clientId, 24),
    hostname: clean(doc.hostname, 253), label: clean(doc.label, 120),
    type: clean(doc.type, 30), status: clean(doc.status, 20),
    createdAt: doc.createdAt || null, updatedAt: doc.updatedAt || null,
  };
}
