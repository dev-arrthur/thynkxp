import type { Db } from 'mongodb';
import { ApiError } from './workspace';
import { clean, normalizeClientHostname } from './clientManagement';

const indexWork = new WeakMap<Db, Promise<unknown>>();
export async function domainCollection(db: Db) {
  let work = indexWork.get(db);
  if (!work) {
    work = Promise.all([
      db.collection('client_domains').createIndex({ hostname: 1 }, { unique: true, name: 'client_domain_hostname_unique' }),
      db.collection('client_domains').createIndex({ clientId: 1, updatedAt: -1 }),
      db.collection('client_domains').createIndex({ updatedAt: -1 }),
    ]).catch(error => { indexWork.delete(db); throw error; });
    indexWork.set(db, work);
  }
  await work;
  return db.collection('client_domains');
}
export function domainValues(body: Record<string, unknown>, existing?: Record<string, unknown>) {
  const hostname = normalizeClientHostname(body.hostname ?? existing?.hostname);
  if (!hostname) throw new ApiError(400, 'invalid_hostname');
  const type = clean(body.type ?? existing?.type, 30) || 'site';
  const status = clean(body.status ?? existing?.status, 20) || 'pendente';
  if (!['site', 'plataforma', 'loja', 'outro'].includes(type)) throw new ApiError(400, 'invalid_domain_type');
  if (!['pendente', 'ativo', 'pausado'].includes(status)) throw new ApiError(400, 'invalid_domain_status');
  return { hostname, label: clean(body.label ?? existing?.label, 120), type, status };
}
export function duplicateDomain(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 11000);
}
