import { ApiError, apiError, clientExists, clientFilter, getWorkspaceDb, json, objectId, readBody, requireActor, requireAdmin, requireSameOrigin, text } from '../../../../lib/workspace';
import { publicDomain } from '../../../../lib/clientManagement';
import { domainCollection, domainValues, duplicateDomain } from '../../../../lib/clientDomains';

export async function GET(req: Request) {
  try {
    const actor = await requireActor(req);
    const clientId = new URL(req.url).searchParams.get('clientId');
    if (actor.role === 'client' && clientId && clientId !== actor.clientId) throw new ApiError(403, 'forbidden');
    const filter = clientFilter(actor);
    if (actor.role === 'admin' && clientId) filter.clientId = objectId(clientId).toHexString();
    const db = await getWorkspaceDb();
    const collection = await domainCollection(db);
    const domains = await collection.find(filter, { maxTimeMS: 5000 }).sort({ updatedAt: -1 }).limit(500).toArray();
    return json({ domains: domains.map(publicDomain) });
  } catch (error) { return apiError(error); }
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req); requireSameOrigin(req);
    const body = await readBody(req, 8000);
    const db = await getWorkspaceDb();
    const clientId = objectId(text(body.clientId, 24)).toHexString();
    await clientExists(db, clientId);
    const now = new Date();
    const document = { clientId, ...domainValues(body), createdAt: now, updatedAt: now };
    const collection = await domainCollection(db);
    const inserted = await collection.insertOne(document);
    return json({ domain: publicDomain({ ...document, _id: inserted.insertedId }) }, 201);
  } catch (error) { return duplicateDomain(error) ? json({ error: 'domain_already_exists' }, 409) : apiError(error); }
}
