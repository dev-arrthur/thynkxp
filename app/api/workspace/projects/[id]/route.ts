import { ApiError, apiError, clientExists, getWorkspaceDb, json, objectId, readBody, requireAdmin, requireSameOrigin, text } from '../../../../../lib/workspace';
import { projectCollection, projectFields, publicProject } from '../../../../../lib/workspace-projects';

type Context = { params: Promise<{ id: string }> };
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function expectedDate(value: unknown) {
  if (typeof value !== 'string' || !value) throw new ApiError(400, 'project_version_required');
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new ApiError(400, 'project_version_required');
  return parsed;
}

export async function PATCH(req: Request, context: Context) {
  try {
    const actor = await requireAdmin(req);
    requireSameOrigin(req);
    const _id = objectId((await context.params).id);
    const body = await readBody(req);
    const expected = expectedDate(body.updatedAt);
    const db = await getWorkspaceDb();
    const collection = await projectCollection(db);
    const previous = await collection.findOne({ _id }, { maxTimeMS: 5000 });
    if (!previous) throw new ApiError(404, 'project_not_found');
    if (previous.archivedAt && body.restore !== true) throw new ApiError(409, 'project_archived');
    const changes: Record<string, unknown> = { updatedAt: new Date(Math.max(Date.now(), expected.getTime() + 1)), updatedBy: actor.email };
    if (body.restore === true) {
      changes.archivedAt = null;
    } else {
      const allowed = ['name', 'description', 'status', 'priority', 'owner', 'startAt', 'dueAt', 'milestones'];
      const merged: Record<string, unknown> = { ...previous };
      for (const key of allowed) if (Object.prototype.hasOwnProperty.call(body, key)) merged[key] = body[key];
      // MongoDB stores date fields as Date; validators accept the public date format.
      for (const key of ['startAt', 'dueAt']) if (merged[key] instanceof Date) merged[key] = (merged[key] as Date).toISOString();
      if (!Object.prototype.hasOwnProperty.call(body, 'milestones')) merged.milestones = publicProject(previous).milestones;
      Object.assign(changes, projectFields(merged));
      if (Object.prototype.hasOwnProperty.call(body, 'clientId') && body.clientId !== previous.clientId) {
        const clientId = objectId(body.clientId).toHexString();
        const client = await clientExists(db, clientId);
        changes.clientId = clientId;
        changes.clientName = text(client.business?.tradeName || client.business?.legalName || client.access?.fullName, 220);
      }
    }
    const result = await collection.findOneAndUpdate({ _id, updatedAt: expected }, { $set: changes }, { returnDocument: 'after', maxTimeMS: 5000 });
    if (!result) throw new ApiError(409, 'project_conflict');
    return json({ project: publicProject(result) });
  } catch (error) { return apiError(error); }
}

export async function DELETE(req: Request, context: Context) {
  try {
    const actor = await requireAdmin(req);
    requireSameOrigin(req);
    const _id = objectId((await context.params).id);
    const body = await readBody(req, 1000);
    const expected = expectedDate(body.updatedAt);
    const db = await getWorkspaceDb();
    const now = new Date(Math.max(Date.now(), expected.getTime() + 1));
    const collection = await projectCollection(db);
    const result = await collection.findOneAndUpdate(
      { _id, updatedAt: expected, archivedAt: null }, { $set: { archivedAt: now, updatedAt: now, updatedBy: actor.email } }, { returnDocument: 'after', maxTimeMS: 5000 },
    );
    if (!result) throw new ApiError(409, 'project_conflict');
    return json({ project: publicProject(result) });
  } catch (error) { return apiError(error); }
}
