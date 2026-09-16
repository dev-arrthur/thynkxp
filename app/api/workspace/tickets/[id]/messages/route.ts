import { type Document } from 'mongodb';
import { ApiError, apiError, getWorkspaceDb, json, readBody, requireActor, requireSameOrigin, text } from '../../../../../../lib/workspace';
import { ensureTicketIndexes, findTicket, messageCursor, MESSAGES_COLLECTION, positivePage, publicMessage, TICKETS_COLLECTION } from '../../../../../../lib/tickets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: Context) {
  try {
    const actor = await requireActor(req);
    const { id } = await context.params;
    const db = await getWorkspaceDb();
    const ticket = await findTicket(db, actor, id);
    const params = new URL(req.url).searchParams;
    const limit = positivePage(params.get('limit'), 50, 100);
    const before = messageCursor(params.get('before'));
    const filter: Document = { ticketId: String(ticket._id), clientId: ticket.clientId };
    if (actor.role === 'client') filter.internal = { $ne: true };
    if (before) filter._id = { $lt: before };
    const rows = await db.collection(MESSAGES_COLLECTION).find(filter).sort({ _id: -1 }).limit(limit + 1).maxTimeMS(5_000).toArray();
    const hasMore = rows.length > limit;
    const messages = rows.slice(0, limit).reverse().map(publicMessage);
    return json({ messages, hasMore, before: hasMore && messages.length ? messages[0]._id : null });
  } catch (error) { return apiError(error); }
}

export async function POST(req: Request, context: Context) {
  try {
    requireSameOrigin(req);
    const actor = await requireActor(req);
    const { id } = await context.params;
    const body = await readBody(req);
    if ('internal' in body && typeof body.internal !== 'boolean') throw new ApiError(400, 'Tipo de mensagem inválido.');
    if (actor.role === 'client' && body.internal === true) throw new ApiError(403, 'Notas internas são reservadas à equipe.');
    const messageBody = text(body.body, 12_000);
    if (!messageBody) throw new ApiError(400, 'Escreva uma mensagem.');
    const db = await getWorkspaceDb();
    const ticket = await findTicket(db, actor, id);
    if (actor.role === 'client' && ticket.status === 'fechado') throw new ApiError(409, 'ticket_closed');
    const now = new Date();
    const message = {
      ticketId: String(ticket._id), clientId: ticket.clientId, body: messageBody,
      internal: actor.role === 'admin' && body.internal === true,
      authorRole: actor.role, authorName: actor.name,
      createdAt: now,
    };
    await ensureTicketIndexes(db);
    if (actor.role === 'client') {
      // Atomically admit the reply against the current status. A close that wins
      // this race prevents insertion; a reply admitted first may finish saving.
      const admitted = await db.collection(TICKETS_COLLECTION).updateOne(
        { _id: ticket._id, clientId: actor.clientId, status: { $ne: 'fechado' } },
        { $max: { updatedAt: now } },
      );
      if (!admitted.matchedCount) throw new ApiError(409, 'ticket_closed');
    }
    const inserted = await db.collection(MESSAGES_COLLECTION).insertOne(message);
    // Persist the message first. The event feed also scans messages, so a failure
    // updating this denormalized ticket summary cannot hide a saved reply.
    await db.collection(TICKETS_COLLECTION).updateOne(
      { _id: ticket._id, clientId: ticket.clientId },
      { $max: { updatedAt: now }, $inc: { messageCount: 1, publicMessageCount: message.internal ? 0 : 1 } },
    ).catch((error) => console.error('ticket_message_summary_failed', error instanceof Error ? error.name : 'unknown'));
    return json({ ok: true, message: publicMessage({ ...message, _id: inserted.insertedId }) }, 201);
  } catch (error) { return apiError(error); }
}
