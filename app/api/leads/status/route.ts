import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getAdminSessionFromRequest } from '../../../../lib/admin-auth';
import { getDb } from '../../../../lib/mongodb';

const ALLOWED_STATUS = new Set(['novo', 'qualificado', 'em_contato', 'proposta', 'negociacao', 'cliente', 'ativo', 'pausado', 'perdido']);

function clean(value: unknown, max = 80) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(req.url).origin; } catch { return false; }
}

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, { status, headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

export async function PATCH(req: Request) {
  if (!(await getAdminSessionFromRequest(req))) return json({ error: 'unauthorized' }, 401);
  if (!sameOrigin(req)) return json({ error: 'invalid_origin' }, 403);

  try {
    const body = await req.json() as { id?: unknown; status?: unknown };
    const id = clean(body.id);
    const status = clean(body.status, 40).toLowerCase().replaceAll(' ', '_');
    if (!ObjectId.isValid(id)) return json({ error: 'invalid_id' }, 400);
    if (!ALLOWED_STATUS.has(status)) return json({ error: 'invalid_status' }, 400);

    const now = new Date();
    const set: Record<string, unknown> = { status, updatedAt: now };
    const unset: Record<string, ''> = {};
    if (status === 'cliente' || status === 'ativo') {
      set.convertedAt = now;
      unset.lostAt = '';
    } else if (status === 'perdido') {
      set.lostAt = now;
      unset.convertedAt = '';
    }

    const database = await getDb();
    const update: Record<string, unknown> = { $set: set };
    if (Object.keys(unset).length) update.$unset = unset;
    const result = await database.collection('leads').updateOne({ _id: new ObjectId(id) }, update);
    if (!result.matchedCount) return json({ error: 'not_found' }, 404);
    return json({ ok: true, id, status, updatedAt: now.toISOString() });
  } catch (error) {
    console.error('Erro ao mover lead no Kanban:', error instanceof Error ? error.message : 'unknown_error');
    return json({ error: 'status_update_failed' }, 503);
  }
}
