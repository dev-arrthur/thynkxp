import { type Db, type Document, ObjectId } from 'mongodb';
import { ApiError, objectId, text } from './workspace';

export const TICKETS_COLLECTION = 'workspace_tickets';
export const MESSAGES_COLLECTION = 'workspace_ticket_messages';
export const TICKET_STATUSES = ['aberto', 'em_andamento', 'aguardando_cliente', 'resolvido', 'fechado'] as const;
export const TICKET_PRIORITIES = ['baixa', 'normal', 'alta', 'urgente'] as const;
export const TICKET_CATEGORIES = ['alteracao', 'problema', 'novo_recurso', 'duvida'] as const;

type TicketActor = { role: 'admin' | 'client'; clientId?: string; name: string; email: string };
const indexedDatabases = new WeakMap<Db, Promise<unknown>>();

export async function ensureTicketIndexes(db: Db) {
  let pending = indexedDatabases.get(db);
  if (!pending) {
    pending = Promise.all([
      db.collection(TICKETS_COLLECTION).createIndex({ clientId: 1, updatedAt: -1 }),
      db.collection(TICKETS_COLLECTION).createIndex({ updatedAt: -1 }),
      db.collection(TICKETS_COLLECTION).createIndex({ clientId: 1, status: 1, updatedAt: -1 }),
      db.collection(TICKETS_COLLECTION).createIndex({ number: 1 }, { unique: true }),
      db.collection(MESSAGES_COLLECTION).createIndex({ ticketId: 1, clientId: 1, _id: -1 }),
      db.collection(MESSAGES_COLLECTION).createIndex({ clientId: 1, createdAt: -1 }),
      db.collection(MESSAGES_COLLECTION).createIndex({ createdAt: -1 }),
    ]).catch((error) => {
      indexedDatabases.delete(db);
      throw error;
    });
    indexedDatabases.set(db, pending);
  }
  await pending;
}

export function ticketEnum<T extends string>(value: unknown, values: readonly T[], fallback?: T): T {
  if ((value === undefined || value === '') && fallback) return fallback;
  if (typeof value !== 'string' || !values.includes(value as T)) throw new ApiError(400, 'Valor inválido para o chamado.');
  return value as T;
}

export function ticketDueAt(value: unknown): Date | null {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) throw new ApiError(400, 'Prazo inválido.');
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 2000 || date.getUTCFullYear() > 2200) {
    throw new ApiError(400, 'Prazo inválido.');
  }
  // Date parsing normalizes dates such as February 31; do not silently accept them.
  const day = value.slice(0, 10);
  if (new Date(`${day}T00:00:00.000Z`).toISOString().slice(0, 10) !== day) throw new ApiError(400, 'Prazo inválido.');
  return date;
}

export function positivePage(value: string | null, fallback: number, maximum: number) {
  if (value === null || value === '') return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > maximum) throw new ApiError(400, 'Paginação inválida.');
  return number;
}

export function scopedTicketFilter(actor: TicketActor, id: string): Document {
  const filter: Document = { _id: objectId(id) };
  if (actor.role === 'client') {
    if (!actor.clientId) throw new ApiError(401, 'Sessão inválida.');
    filter.clientId = actor.clientId;
  }
  return filter;
}

export async function findTicket(db: Db, actor: TicketActor, id: string) {
  const ticket = await db.collection(TICKETS_COLLECTION).findOne(scopedTicketFilter(actor, id));
  if (!ticket) throw new ApiError(404, 'Chamado não encontrado.');
  return ticket;
}

export async function validateTicketReferences(db: Db, clientId: string, projectId: unknown, domainId: unknown) {
  const references: { projectId?: string; domainId?: string } = {};
  if (projectId !== undefined && projectId !== null && projectId !== '') {
    const id = objectId(projectId);
    const project = await db.collection('workspace_projects').findOne({ _id: id, clientId, archivedAt: null }, { projection: { _id: 1 } });
    if (!project) throw new ApiError(400, 'O projeto não pertence a este cliente.');
    references.projectId = id.toHexString();
  }
  if (domainId !== undefined && domainId !== null && domainId !== '') {
    const id = objectId(domainId);
    const domain = await db.collection('client_domains').findOne({ _id: id, clientId }, { projection: { _id: 1 } });
    if (!domain) throw new ApiError(400, 'O domínio não pertence a este cliente.');
    references.domainId = id.toHexString();
  }
  return references;
}

export async function nextTicketNumber(db: Db) {
  const counter = await db.collection<{ _id: string; value: number }>('workspace_counters').findOneAndUpdate(
    { _id: 'tickets' }, { $inc: { value: 1 } }, { upsert: true, returnDocument: 'after' },
  );
  if (!counter) throw new Error('ticket_counter_unavailable');
  return `THX-${String(counter.value).padStart(6, '0')}`;
}

export function publicTicket(ticket: Document, role: TicketActor['role']) {
  const author = ticket.createdBy && typeof ticket.createdBy === 'object' ? ticket.createdBy : {};
  return {
    _id: String(ticket._id), id: String(ticket._id),
    number: text(ticket.number, 80), clientId: text(ticket.clientId, 80), clientName: text(ticket.clientName, 220),
    title: text(ticket.title, 180), description: text(ticket.description, 12_000),
    category: ticket.category, status: ticket.status, priority: ticket.priority,
    owner: text(ticket.owner, 160), projectId: text(ticket.projectId, 80), domainId: text(ticket.domainId, 80),
    dueAt: ticket.dueAt || null, resolvedAt: ticket.resolvedAt || null,
    createdAt: ticket.createdAt, updatedAt: ticket.updatedAt,
    createdBy: { role: author.role, name: text(author.name, 160) },
    messageCount: Number(role === 'admin' ? ticket.messageCount || 0 : ticket.publicMessageCount || 0),
  };
}

export function publicMessage(message: Document) {
  return {
    _id: String(message._id), id: String(message._id), ticketId: text(message.ticketId, 80),
    body: text(message.body, 12_000), internal: message.internal === true,
    authorRole: message.authorRole, authorName: text(message.authorName, 160), createdAt: message.createdAt,
  };
}

export function messageCursor(value: string | null) {
  return value ? new ObjectId(objectId(value)) : undefined;
}
