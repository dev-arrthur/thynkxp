import { ApiError, apiError, getWorkspaceDb, json, objectId, readBody, requireAdmin, requireSameOrigin } from '../../../../../lib/workspace';
import { publicDomain } from '../../../../../lib/clientManagement';
import { domainCollection, domainValues, duplicateDomain } from '../../../../../lib/clientDomains';

type Context = { params: Promise<{ id: string }> };
export async function PATCH(req: Request, context: Context) {
  try {
    await requireAdmin(req); requireSameOrigin(req);
    const id = objectId((await context.params).id);
    const body = await readBody(req, 8000);
    const collection = await domainCollection(await getWorkspaceDb());
    const existing = await collection.findOne({ _id: id }, { maxTimeMS: 5000 });
    if (!existing) throw new ApiError(404, 'domain_not_found');
    const domain = await collection.findOneAndUpdate({ _id: id }, { $set: { ...domainValues(body, existing), updatedAt: new Date() } }, { returnDocument: 'after', maxTimeMS: 5000 });
    if (!domain) throw new ApiError(404, 'domain_not_found');
    return json({ domain: publicDomain(domain) });
  } catch (error) { return duplicateDomain(error) ? json({ error: 'domain_already_exists' }, 409) : apiError(error); }
}
export async function DELETE(req: Request, context: Context) {
  try {
    await requireAdmin(req); requireSameOrigin(req);
    const id = objectId((await context.params).id);
    const db = await getWorkspaceDb();
    const domain = await db.collection('client_domains').findOneAndDelete({ _id: id }, { maxTimeMS: 5000 });
    if (!domain) throw new ApiError(404, 'domain_not_found');
    await db.collection('clients').updateOne({ _id: objectId(domain.clientId) }, { $set: { updatedAt: new Date() } });
    return json({ ok: true });
  } catch (error) { return apiError(error); }
}
