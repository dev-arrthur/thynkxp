import { ObjectId, type Db } from 'mongodb';
import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from './admin-auth';
import { CLIENT_V3_COOKIE, readClientSessionV3 } from './clientPortalSessionV3';
import { getDb } from './mongodb';

export type WorkspaceActor = { role: 'admin' | 'client'; clientId?: string; name: string; email: string };
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' } });
}
export function apiError(error: unknown) {
  if (error instanceof ApiError) return json({ error: error.message }, error.status);
  if (error instanceof SyntaxError) return json({ error: 'invalid_json' }, 400);
  console.error('workspace_request_failed', error instanceof Error ? error.name : 'unknown');
  return json({ error: 'service_unavailable' }, 503);
}
export function text(value: unknown, max = 500) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
export function objectId(value: unknown) {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) throw new ApiError(400, 'invalid_id');
  return new ObjectId(value);
}
export function requireSameOrigin(req: Request) {
  if (req.headers.get('sec-fetch-site') === 'cross-site') throw new ApiError(403, 'invalid_origin');
  const origin = req.headers.get('origin');
  if (origin) {
    try { if (new URL(origin).origin === new URL(req.url).origin) return; } catch { /* invalid origin */ }
    throw new ApiError(403, 'invalid_origin');
  }
}
export async function readBody(req: Request, max = 40_000): Promise<Record<string, unknown>> {
  const reader = req.body?.getReader();
  if (!reader) throw new ApiError(400, 'invalid_json');
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > max) { await reader.cancel(); throw new ApiError(413, 'request_too_large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new ApiError(400, 'invalid_json');
  return parsed;
}
export const getWorkspaceDb = getDb;

/** Always query the account: a signed cookie does not override disabled access. */
export async function requireActor(req: Request, role?: 'admin' | 'client'): Promise<WorkspaceActor> {
  const url = new URL(req.url);
  const requestedRole = role || req.headers.get('x-workspace-role') || (url.pathname === '/api/workspace/events' ? url.searchParams.get('role') : '');
  try {
    if (requestedRole !== 'client' && await getAdminSessionFromRequest(req)) {
      return { role: 'admin', name: 'Equipe ThynkXP', email: process.env.ADMIN_EMAIL || 'arthur.ferreira@thynkxp.com.br' };
    }
  } catch { /* malformed cookies are not valid authentication */ }
  if (requestedRole === 'admin') throw new ApiError(401, 'unauthorized');
  let token = '';
  try {
    const value = (req.headers.get('cookie') || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${CLIENT_V3_COOKIE}=`));
    token = value ? decodeURIComponent(value.slice(CLIENT_V3_COOKIE.length + 1)) : '';
  } catch { throw new ApiError(401, 'unauthorized'); }
  const session = readClientSessionV3(token);
  if (!session || !/^[a-f\d]{24}$/i.test(session.clientId)) throw new ApiError(401, 'unauthorized');
  const db = await getDb();
  const account = await db.collection('clients').findOne({
    _id: new ObjectId(session.clientId), status: { $nin: ['arquivado', 'inativo'] },
    'access.portalEnabled': { $ne: false }, 'access.emailLower': session.email.toLowerCase(),
  }, { projection: { 'access.fullName': 1, 'access.email': 1, 'access.sessionVersion': 1 }, maxTimeMS: 5000 });
  if (!account) throw new ApiError(401, 'unauthorized');
  if (session.sessionVersion !== (account.access?.sessionVersion || 0)) throw new ApiError(401, 'unauthorized');
  return { role: 'client', clientId: session.clientId, name: text(account.access?.fullName, 160) || session.name, email: session.email };
}
export async function requireAdmin(req: Request) {
  // Avoid a database round trip on unauthorized administrative requests.
  try { if (await getAdminSessionFromRequest(req)) return { role: 'admin', name: 'Equipe ThynkXP', email: process.env.ADMIN_EMAIL || 'arthur.ferreira@thynkxp.com.br' } as WorkspaceActor; } catch { /* invalid cookie */ }
  throw new ApiError(401, 'unauthorized');
}
export function clientFilter(actor: WorkspaceActor): Record<string, unknown> {
  if (actor.role === 'admin') return {};
  if (!actor.clientId) throw new ApiError(401, 'unauthorized');
  return { clientId: actor.clientId };
}
export async function clientExists(db: Db, id: string) {
  const account = await db.collection('clients').findOne({ _id: objectId(id), status: { $nin: ['arquivado', 'inativo'] } }, {
    projection: { business: 1, status: 1, 'access.fullName': 1, 'access.email': 1, 'access.portalEnabled': 1 },
  });
  if (!account) throw new ApiError(404, 'client_not_found');
  return account;
}
