import { type Document } from 'mongodb';
import { ApiError, apiError, clientExists, clientFilter, getWorkspaceDb, json, objectId, readBody, requireActor, requireSameOrigin, text } from '../../../../lib/workspace';
import { ensureTicketIndexes, nextTicketNumber, positivePage, publicTicket, ticketDueAt, ticketEnum, TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES, TICKETS_COLLECTION, validateTicketReferences } from '../../../../lib/tickets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const actor = await requireActor(req);
    const db = await getWorkspaceDb();
    await ensureTicketIndexes(db);
    const params = new URL(req.url).searchParams;
    const page = positivePage(params.get('page'), 1, 10_000);
    const limit = positivePage(params.get('limit'), 25, 100);
    const filter: Document = { ...clientFilter(actor) };
    const clientId = params.get('clientId');
    if (clientId) {
      const normalized = objectId(clientId).toHexString();
      if (actor.role === 'client' && normalized !== actor.clientId) throw new ApiError(403, 'Acesso não permitido.');
      filter.clientId = normalized;
    }
    const status = params.get('status');
    if (status && status !== 'todos') filter.status = ticketEnum(status, TICKET_STATUSES);
    const priority = params.get('priority');
    if (priority && priority !== 'todas') filter.priority = ticketEnum(priority, TICKET_PRIORITIES);
    const category = params.get('category');
    if (category && category !== 'todas') filter.category = ticketEnum(category, TICKET_CATEGORIES);
    for (const key of ['domainId', 'projectId']) {
      const value = params.get(key);
      if (value) filter[key] = objectId(value).toHexString();
    }
    const query = text(params.get('q'), 120);
    if (query) {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = ['number', 'title', 'description', 'clientName'].map((key) => ({ [key]: { $regex: escaped, $options: 'i' } }));
    }
    const collection = db.collection(TICKETS_COLLECTION);
    const [rows, total] = await Promise.all([
      collection.find(filter).sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).maxTimeMS(5_000).toArray(),
      collection.countDocuments(filter, { maxTimeMS: 5_000 }),
    ]);
    return json({ tickets: rows.map((row) => publicTicket(row, actor.role)), total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) { return apiError(error); }
}

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const actor = await requireActor(req);
    const body = await readBody(req);
    const db = await getWorkspaceDb();
    const clientId = actor.role === 'client' ? actor.clientId! : objectId(body.clientId).toHexString();
    if (actor.role === 'client') {
      if (body.clientId !== undefined && body.clientId !== clientId) throw new ApiError(403, 'Acesso não permitido.');
      if (['status', 'owner', 'dueAt', 'createdBy', 'clientName', 'internal'].some((key) => key in body)) {
        throw new ApiError(403, 'Estes campos são reservados à equipe.');
      }
    }
    const client = await clientExists(db, clientId);
    const title = text(body.title, 180);
    const description = text(body.description, 12_000);
    if (title.length < 3) throw new ApiError(400, 'Informe um título com pelo menos 3 caracteres.');
    if (description.length < 5) throw new ApiError(400, 'Descreva a solicitação com pelo menos 5 caracteres.');
    const references = await validateTicketReferences(db, clientId, body.projectId, body.domainId);
    const now = new Date();
    const status = actor.role === 'admin' ? ticketEnum(body.status, TICKET_STATUSES, 'aberto') : 'aberto';
    const ticket = {
      clientId,
      clientName: text(client.business?.tradeName || client.business?.legalName || client.access?.fullName, 220),
      title, description, ...references,
      category: ticketEnum(body.category, TICKET_CATEGORIES, 'duvida'),
      priority: ticketEnum(body.priority, TICKET_PRIORITIES, 'normal'),
      status,
      owner: actor.role === 'admin' ? text(body.owner, 160) : '',
      dueAt: actor.role === 'admin' && body.dueAt !== undefined ? ticketDueAt(body.dueAt) : null,
      resolvedAt: status === 'resolvido' || status === 'fechado' ? now : null,
      createdAt: now, updatedAt: now,
      createdBy: { role: actor.role, name: actor.name },
      messageCount: 0, publicMessageCount: 0,
      number: '',
    };
    await ensureTicketIndexes(db);
    ticket.number = await nextTicketNumber(db);
    const result = await db.collection(TICKETS_COLLECTION).insertOne(ticket);
    return json({ ok: true, ticket: publicTicket({ ...ticket, _id: result.insertedId }, actor.role) }, 201);
  } catch (error) { return apiError(error); }
}
