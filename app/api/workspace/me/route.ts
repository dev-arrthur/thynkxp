import { ApiError, apiError, getWorkspaceDb, json, objectId, requireActor } from '../../../../lib/workspace';
import { publicClient } from '../../../../lib/clientManagement';

export async function GET(req: Request) {
  try {
    const actor = await requireActor(req, 'client');
    if (actor.role !== 'client' || !actor.clientId) throw new ApiError(403, 'client_account_required');
    const db = await getWorkspaceDb();
    const client = await db.collection('clients').findOne({ _id: objectId(actor.clientId) }, { maxTimeMS: 5000, projection: { 'access.passwordHash': 0, 'access.passwordSalt': 0, notes: 0 } });
    if (!client) throw new ApiError(404, 'client_not_found');
    return json({ client: publicClient(client, false) });
  } catch (error) { return apiError(error); }
}
