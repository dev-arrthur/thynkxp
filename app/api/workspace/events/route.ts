import { type Db, type Document } from 'mongodb';
import { ApiError, apiError, clientFilter, getWorkspaceDb, objectId, requireActor, requireSameOrigin } from '../../../../lib/workspace';
import { ensureTicketIndexes, MESSAGES_COLLECTION, TICKETS_COLLECTION } from '../../../../lib/tickets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const indexedDatabases = new WeakMap<Db, Promise<unknown>>();
async function ensureEventIndexes(db: Db) {
  let pending = indexedDatabases.get(db);
  if (!pending) {
    pending = Promise.all([
      db.collection('workspace_projects').createIndex({ updatedAt: -1 }),
      db.collection('workspace_projects').createIndex({ clientId: 1, updatedAt: -1 }),
      db.collection('client_domains').createIndex({ updatedAt: -1 }),
      db.collection('client_domains').createIndex({ clientId: 1, updatedAt: -1 }),
      db.collection('clients').createIndex({ updatedAt: -1 }),
      db.collection('leads').createIndex({ updatedAt: -1 }),
    ]).catch((error) => { indexedDatabases.delete(db); throw error; });
    indexedDatabases.set(db, pending);
  }
  await pending;
}

/** Persisted timestamps make this work across serverless processes and restarts.
 * A new connection always refreshes its consumer, healing reconnect gaps. */
export async function GET(req: Request) {
  try {
    requireSameOrigin(req);
    const initialActor = await requireActor(req);
    const db = await getWorkspaceDb();
    await Promise.all([ensureTicketIndexes(db), ensureEventIndexes(db)]);
    const tenant = clientFilter(initialActor);
    const watches: { collection: string; field: string; filter: Document; kind: 'tickets' | 'projects' | 'clients' | 'leads' }[] = [
      { collection: TICKETS_COLLECTION, field: 'updatedAt', filter: tenant, kind: 'tickets' },
      { collection: MESSAGES_COLLECTION, field: 'createdAt', filter: { ...tenant, ...(initialActor.role === 'client' ? { internal: { $ne: true } } : {}) }, kind: 'tickets' },
      { collection: 'workspace_projects', field: 'updatedAt', filter: tenant, kind: 'projects' },
      { collection: 'client_domains', field: 'updatedAt', filter: tenant, kind: 'clients' },
    ];
    watches.push({ collection: 'clients', field: 'updatedAt', filter: initialActor.role === 'admin' ? {} : { _id: objectId(initialActor.clientId) }, kind: 'clients' });
    if (initialActor.role === 'admin') watches.push({ collection: 'leads', field: 'updatedAt', filter: {}, kind: 'leads' });

    const encoder = new TextEncoder();
    let closed = false;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    let closeStream: (() => void) | undefined;
    let cursor = Date.now();
    const seen = new Map<string, number>();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const stop = () => {
          if (closed) return;
          closed = true;
          if (pollTimer) clearTimeout(pollTimer);
          if (expiryTimer) clearTimeout(expiryTimer);
          req.signal.removeEventListener('abort', stop);
          try { controller.close(); } catch { /* the consumer already cancelled */ }
        };
        closeStream = stop;
        const send = (event: string, data: unknown) => {
          if (closed) return;
          try { controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)); }
          catch { stop(); }
        };
        const poll = async () => {
          if (closed) return;
          try {
            // Signed cookies are rechecked against the current account on every poll.
            const actor = await requireActor(req);
            if (actor.role !== initialActor.role || actor.clientId !== initialActor.clientId) throw new ApiError(401, 'unauthorized');
            const until = Date.now();
            const changes = await Promise.all(watches.map(async (watch) => {
              const rows = await db.collection(watch.collection).find({
                ...watch.filter,
                [watch.field]: { $gte: new Date(cursor - 3_000), $lte: new Date(until) },
              }, { projection: { _id: 1, [watch.field]: 1 } })
                .sort({ [watch.field]: -1, _id: -1 }).limit(100).maxTimeMS(2_000).toArray();
              let changed = false;
              for (const row of rows) {
                const timestamp = new Date(row[watch.field]).getTime();
                const key = `${watch.collection}:${row._id}:${timestamp}`;
                if (!seen.has(key)) changed = true;
                seen.set(key, until);
              }
              return changed ? watch.kind : null;
            }));
            cursor = until;
            for (const [key, at] of seen) if (at < until - 10_000) seen.delete(key);
            while (seen.size > 1_000) seen.delete(seen.keys().next().value!);
            for (const kind of new Set(changes.filter(Boolean))) send('workspace', { kind });
            if (!closed) controller.enqueue(encoder.encode(': heartbeat\n\n'));
          } catch (error) {
            if (error instanceof ApiError && error.status === 401) send('auth', { error: 'unauthorized' });
            else send('retry', { error: 'temporarily_unavailable' });
            stop();
          }
          if (!closed) pollTimer = setTimeout(poll, 3_000);
        };
        req.signal.addEventListener('abort', stop, { once: true });
        if (req.signal.aborted) { stop(); return; }
        controller.enqueue(encoder.encode('retry: 1500\n\n'));
        send('ready', { connected: true });
        pollTimer = setTimeout(poll, 3_000);
        // Finish before the serverless execution limit; EventSource reconnects.
        expiryTimer = setTimeout(stop, 25_000);
      },
      cancel() { closeStream?.(); },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'private, no-cache, no-store, no-transform',
        'X-Accel-Buffering': 'no',
        Vary: 'Cookie',
      },
    });
  } catch (error) { return apiError(error); }
}
