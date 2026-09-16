import { ApiError, apiError, getWorkspaceDb, json, objectId, readBody, requireAdmin, requireSameOrigin } from '../../../../../lib/workspace';
import { createClientPassword } from '../../../../../lib/clientAccounts';
import { clean, clientCollection, publicClient, safeObject } from '../../../../../lib/clientManagement';

type Context = { params: Promise<{ id: string }> };
const emailValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const digitString = (value: unknown, max: number) => clean(value).replace(/\D/g, '').slice(0, max);

export async function GET(req: Request, context: Context) {
  try {
    await requireAdmin(req);
    const db = await getWorkspaceDb();
    const client = await db.collection('clients').findOne({ _id: objectId((await context.params).id) }, { maxTimeMS: 5000 });
    if (!client) throw new ApiError(404, 'client_not_found');
    return json({ client: publicClient(client) });
  } catch (error) { return apiError(error); }
}

export async function PATCH(req: Request, context: Context) {
  try {
    await requireAdmin(req); requireSameOrigin(req);
    const id = objectId((await context.params).id);
    const body = await readBody(req);
    const db = await getWorkspaceDb();
    const collection = await clientCollection(db);
    const existing = await collection.findOne({ _id: id }, { maxTimeMS: 5000 });
    if (!existing) throw new ApiError(404, 'client_not_found');
    const currentVersion = existing.updatedAt instanceof Date ? existing.updatedAt.toISOString() : existing.updatedAt || null;
    if (!('expectedUpdatedAt' in body) || body.expectedUpdatedAt !== currentVersion) throw new ApiError(409, 'client_changed');
    const previousTimestamp = existing.updatedAt instanceof Date ? existing.updatedAt.getTime() : 0;
    const changes: Record<string, unknown> = { updatedAt: new Date(Math.max(Date.now(), previousTimestamp + 1)) };
    const business = safeObject(body.business);
    const location = safeObject(body.location);
    const billing = safeObject(body.billing);
    const access = safeObject(body.access);
    const fields: [string, Record<string, unknown>, [string, number][]][] = [
      ['business', business, [['legalName', 220], ['tradeName', 180], ['phone', 50], ['cnaeDescription', 240], ['companySize', 120], ['legalNature', 180]]],
      ['location', location, [['city', 140], ['street', 220], ['number', 30], ['complement', 180], ['district', 160]]],
      ['billing', billing, [['paymentTerms', 180], ['paymentMethod', 100]]],
      ['access', access, [['fullName', 160]]],
    ];
    for (const [section, input, keys] of fields) for (const [key, max] of keys) if (key in input) changes[`${section}.${key}`] = clean(input[key], max);
    if ('tradeName' in business && !changes['business.tradeName']) throw new ApiError(400, 'trade_name_required');
    if ('fullName' in access && !changes['access.fullName']) throw new ApiError(400, 'access_name_required');
    if ('cnpj' in business) {
      const cnpj = digitString(business.cnpj, 30);
      if (cnpj.length !== 14) throw new ApiError(400, 'invalid_cnpj');
      changes['business.cnpj'] = cnpj;
    }
    if ('email' in business) {
      const email = clean(business.email, 180).toLowerCase();
      if (email && !emailValid(email)) throw new ApiError(400, 'invalid_business_email');
      changes['business.email'] = email;
    }
    if ('partners' in business) {
      if (!Array.isArray(business.partners)) throw new ApiError(400, 'invalid_partners');
      changes['business.partners'] = business.partners.slice(0, 20).map(value => clean(value, 180)).filter(Boolean);
    }
    if ('openedAt' in business) {
      const raw = clean(business.openedAt, 30);
      const opened = raw ? new Date(raw) : null;
      if (opened && Number.isNaN(opened.getTime())) throw new ApiError(400, 'invalid_opened_at');
      changes['business.openedAt'] = opened;
    }
    if ('cnae' in business) changes['business.cnae'] = digitString(business.cnae, 7);
    if ('cep' in location) changes['location.cep'] = digitString(location.cep, 8);
    if ('state' in location) changes['location.state'] = clean(location.state, 2).toUpperCase();
    if ('monthlyFee' in billing) {
      const fee = Number(billing.monthlyFee);
      if (!Number.isFinite(fee) || fee < 0 || fee > 100_000_000) throw new ApiError(400, 'invalid_monthly_fee');
      changes['billing.monthlyFee'] = Math.round(fee * 100) / 100;
    }
    if ('email' in access) {
      const email = clean(access.email, 180).toLowerCase();
      if (!emailValid(email)) throw new ApiError(400, 'invalid_access_email');
      changes['access.email'] = email; changes['access.emailLower'] = email;
    }
    if ('portalEnabled' in access) {
      if (typeof access.portalEnabled !== 'boolean') throw new ApiError(400, 'invalid_portal_enabled');
      changes['access.portalEnabled'] = access.portalEnabled;
    }
    if ('password' in access && access.password !== '') {
      if (typeof access.password !== 'string' || access.password.length < 8 || access.password.length > 200) throw new ApiError(400, 'weak_password');
      const password = createClientPassword(access.password);
      changes['access.passwordHash'] = password.hash; changes['access.passwordSalt'] = password.salt;
      const storedVersion = safeObject(existing.access).sessionVersion;
      const sessionVersion = typeof storedVersion === 'number' && Number.isSafeInteger(storedVersion) && storedVersion >= 0 ? storedVersion : 0;
      changes['access.sessionVersion'] = sessionVersion + 1;
    }
    if ('notes' in body) changes.notes = clean(body.notes, 5000);
    if ('status' in body) {
      if (!['ativo', 'pausado', 'arquivado'].includes(String(body.status))) throw new ApiError(400, 'invalid_client_status');
      changes.status = body.status;
    }
    const duplicateFilters: Record<string, unknown>[] = [];
    if (changes['business.cnpj']) duplicateFilters.push({ 'business.cnpj': changes['business.cnpj'] });
    if (changes['access.emailLower']) duplicateFilters.push({ 'access.emailLower': changes['access.emailLower'] });
    if (duplicateFilters.length && await collection.findOne({ _id: { $ne: id }, $or: duplicateFilters }, { projection: { _id: 1 } })) throw new ApiError(409, 'client_already_exists');
    const updated = await collection.findOneAndUpdate({ _id: id, updatedAt: existing.updatedAt ?? null }, { $set: changes }, { returnDocument: 'after', maxTimeMS: 5000 });
    if (!updated) throw new ApiError(409, 'client_changed');
    return json({ client: publicClient(updated) });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) return json({ error: 'client_already_exists' }, 409);
    return apiError(error);
  }
}
