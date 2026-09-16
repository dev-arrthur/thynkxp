import { ApiError, apiError, clientExists, clientFilter, getWorkspaceDb, json, objectId, readBody, requireActor, requireAdmin, requireSameOrigin, text } from '../../../../lib/workspace';
import { PROJECT_STATUSES, projectCollection, projectFields, publicProject, type ProjectStatus } from '../../../../lib/workspace-projects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const actor = await requireActor(req);
    const params = new URL(req.url).searchParams;
    const filter: Record<string, unknown> = { ...clientFilter(actor), archivedAt: null };
    if (actor.role === 'admin') {
      if (params.get('clientId')) filter.clientId = objectId(params.get('clientId')).toHexString();
      if (params.get('archived') === '1') filter.archivedAt = { $ne: null };
    }
    if (params.get('id')) filter._id = objectId(params.get('id'));
    const status = params.get('status');
    if (status) {
      if (!PROJECT_STATUSES.includes(status as ProjectStatus)) throw new ApiError(400, 'invalid_project_status');
      filter.status = status;
    }
    const query = text(params.get('q'), 100);
    if (query) {
      const pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ name: { $regex: pattern, $options: 'i' } }, { clientName: { $regex: pattern, $options: 'i' } }];
    }
    const rawPage = Number(params.get('page') || 1);
    const page = Number.isInteger(rawPage) ? Math.max(1, Math.min(rawPage, 200)) : 1;
    const rawLimit = Number(params.get('limit') || 30);
    if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 100) throw new ApiError(400, 'invalid_limit');
    const limit = rawLimit;
    const db = await getWorkspaceDb();
    const collection = await projectCollection(db);
    const [projects, total] = await Promise.all([
      collection.find(filter, { projection: { clientId: 1, clientName: 1, name: 1, description: 1, status: 1, priority: 1, owner: 1, startAt: 1, dueAt: 1, milestones: 1, createdAt: 1, updatedAt: 1, archivedAt: 1 }, maxTimeMS: 5000 }).sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      collection.countDocuments(filter, { maxTimeMS: 5000 }),
    ]);
    return json({ projects: projects.map(publicProject), total, page, limit, hasMore: page < 200 && page * limit < total });
  } catch (error) { return apiError(error); }
}

export async function POST(req: Request) {
  try {
    const actor = await requireAdmin(req);
    requireSameOrigin(req);
    const body = await readBody(req);
    const clientId = objectId(body.clientId).toHexString();
    const fields = projectFields(body);
    const db = await getWorkspaceDb();
    const client = await clientExists(db, clientId);
    const now = new Date();
    const project = {
      clientId, clientName: text(client.business?.tradeName || client.business?.legalName || client.access?.fullName, 220),
      ...fields, archivedAt: null, createdAt: now, updatedAt: now, createdBy: actor.email,
    };
    const collection = await projectCollection(db);
    const result = await collection.insertOne(project);
    return json({ project: publicProject({ ...project, _id: result.insertedId }) }, 201);
  } catch (error) { return apiError(error); }
}
