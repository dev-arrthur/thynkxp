import { ApiError, apiError, getWorkspaceDb, json, readBody, requireActor, requireAdmin, requireSameOrigin, text } from '../../../../../lib/workspace';
import { findTicket, publicTicket, scopedTicketFilter, ticketDueAt, ticketEnum, TICKET_PRIORITIES, TICKET_STATUSES, TICKETS_COLLECTION } from '../../../../../lib/tickets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: Context) {
  try {
    const actor = await requireActor(req);
    const { id } = await context.params;
    const db = await getWorkspaceDb();
    return json({ ticket: publicTicket(await findTicket(db, actor, id), actor.role) });
  } catch (error) { return apiError(error); }
}

export async function PATCH(req: Request, context: Context) {
  try {
    requireSameOrigin(req);
    const actor = await requireAdmin(req);
    const { id } = await context.params;
    const body = await readBody(req);
    let expected: Date | undefined;
    if ('updatedAt' in body) {
      if (typeof body.updatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(body.updatedAt)) throw new ApiError(400, 'Versão do chamado inválida.');
      expected = new Date(body.updatedAt);
      if (!Number.isFinite(expected.getTime())) throw new ApiError(400, 'Versão do chamado inválida.');
    }
    const changes: Record<string, unknown> = {};
    if ('status' in body) {
      changes.status = ticketEnum(body.status, TICKET_STATUSES);
      changes.resolvedAt = changes.status === 'resolvido' || changes.status === 'fechado' ? new Date() : null;
    }
    if ('priority' in body) changes.priority = ticketEnum(body.priority, TICKET_PRIORITIES);
    if ('owner' in body) {
      if (typeof body.owner !== 'string') throw new ApiError(400, 'Responsável inválido.');
      changes.owner = text(body.owner, 160);
    }
    if ('dueAt' in body) changes.dueAt = ticketDueAt(body.dueAt);
    if (!Object.keys(changes).length) throw new ApiError(400, 'Nenhuma alteração informada.');
    const db = await getWorkspaceDb();
    const filter = scopedTicketFilter(actor, id);
    if (expected) filter.updatedAt = expected;
    const updated = await db.collection(TICKETS_COLLECTION).findOneAndUpdate(
      filter, { $set: changes, $max: { updatedAt: new Date(Math.max(Date.now(), (expected?.getTime() || 0) + 1)) } }, { returnDocument: 'after' },
    );
    if (!updated) {
      if (expected && await db.collection(TICKETS_COLLECTION).findOne(scopedTicketFilter(actor, id), { projection: { _id: 1 } })) {
        throw new ApiError(409, 'Este chamado foi atualizado por outra pessoa. Revise os dados e tente novamente.');
      }
      throw new ApiError(404, 'Chamado não encontrado.');
    }
    return json({ ok: true, ticket: publicTicket(updated, actor.role) });
  } catch (error) { return apiError(error); }
}
