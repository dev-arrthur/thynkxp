import { getDb } from '../../../../lib/mongodb';
import { createClientPassword } from '../../../../lib/clientAccounts';
import { apiError, json, readBody, requireAdmin, requireSameOrigin } from '../../../../lib/workspace';
import { clientCollection, publicClient } from '../../../../lib/clientManagement';

function clean(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function digits(value: unknown, max = 30) {
  return String(value || '').replace(/\D/g, '').slice(0, max);
}
function money(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(String(value || '').replace(',', '.'));
  return Number.isFinite(parsed) ? Math.max(0, Math.min(parsed, 100_000_000)) : 0;
}
function emailValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function safeObject(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function partners(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((item) => clean(item, 180)).filter(Boolean);
}
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const db = await getDb();
    const rows = await db.collection('clients').find({}, { maxTimeMS: 5000 }).sort({ updatedAt: -1, createdAt: -1 }).limit(500).toArray();
    return json({ clients: rows.map((row) => publicClient(row as unknown as Record<string, unknown>)) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    requireSameOrigin(req);
    const raw = await readBody(req);
    const body = safeObject(raw);
    const businessRaw = safeObject(body.business);
    const locationRaw = safeObject(body.location);
    const billingRaw = safeObject(body.billing);
    const accessRaw = safeObject(body.access);

    const cnpj = digits(businessRaw.cnpj, 30);
    const tradeName = clean(businessRaw.tradeName, 180);
    const businessEmail = clean(businessRaw.email, 180).toLowerCase();
    const phone = clean(businessRaw.phone, 50);
    const fullName = clean(accessRaw.fullName, 160);
    const accessEmail = clean(accessRaw.email, 180).toLowerCase();
    const password = String(accessRaw.password || '');

    if (cnpj.length !== 14) return json({ error: 'invalid_cnpj' }, 400);
    if (!tradeName) return json({ error: 'trade_name_required' }, 400);
    if (businessEmail && !emailValid(businessEmail)) return json({ error: 'invalid_business_email' }, 400);
    if (!fullName) return json({ error: 'access_name_required' }, 400);
    if (!emailValid(accessEmail)) return json({ error: 'invalid_access_email' }, 400);
    if (password.length < 8 || password.length > 200) return json({ error: 'weak_password' }, 400);

    const openedAtRaw = clean(businessRaw.openedAt, 30);
    const openedAt = openedAtRaw ? new Date(`${openedAtRaw}T00:00:00`) : null;
    const now = new Date();
    const { salt, hash } = createClientPassword(password);
    const db = await getDb();
    const collection = await clientCollection(db);

    const duplicate = await collection.findOne({
      $or: [{ 'business.cnpj': cnpj }, { 'access.emailLower': accessEmail }],
    });
    if (duplicate) return json({ error: 'client_already_exists' }, 409);

    const document = {
      status: 'ativo',
      business: {
        cnpj,
        legalName: clean(businessRaw.legalName, 220),
        tradeName,
        email: businessEmail,
        phone,
        partners: partners(businessRaw.partners),
        openedAt: openedAt && !Number.isNaN(openedAt.getTime()) ? openedAt : null,
        cnae: digits(businessRaw.cnae, 7),
        cnaeDescription: clean(businessRaw.cnaeDescription, 240),
        companySize: clean(businessRaw.companySize, 120),
        legalNature: clean(businessRaw.legalNature, 180),
      },
      location: {
        cep: digits(locationRaw.cep, 8),
        state: clean(locationRaw.state, 2).toUpperCase(),
        city: clean(locationRaw.city, 140),
        street: clean(locationRaw.street, 220),
        number: clean(locationRaw.number, 30),
        complement: clean(locationRaw.complement, 180),
        district: clean(locationRaw.district, 160),
      },
      billing: {
        paymentTerms: clean(billingRaw.paymentTerms, 180),
        paymentMethod: clean(billingRaw.paymentMethod, 100),
        monthlyFee: money(billingRaw.monthlyFee),
      },
      access: {
        fullName,
        email: accessEmail,
        emailLower: accessEmail,
        passwordHash: hash,
        passwordSalt: salt,
        portalEnabled: true,
        sessionVersion: 0,
        createdAt: now,
        lastLoginAt: null,
      },
      notes: clean(body.notes, 5000),
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(document);
    const created = await collection.findOne({ _id: result.insertedId });

    const leadMatch: Record<string, unknown>[] = [{ cnpj }];
    if (businessEmail) leadMatch.push({ email: businessEmail });
    if (accessEmail !== businessEmail) leadMatch.push({ email: accessEmail });
    await db.collection('leads').updateMany(
      { $or: leadMatch },
      { $set: { status: 'ativo', clientId: result.insertedId.toHexString(), updatedAt: now } },
    ).catch(() => undefined);

    return json({ ok: true, client: publicClient(created as unknown as Record<string, unknown>) }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    if (message.includes('E11000')) return json({ error: 'client_already_exists' }, 409);
    return apiError(error);
  }
}
