import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '../../../../lib/admin-auth';
import { getDb } from '../../../../lib/mongodb';
import { createClientPassword } from '../../../../lib/clientAccounts';

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
function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(req.url).origin; } catch { return false; }
}
function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, { status, headers: { 'Cache-Control': 'no-store, max-age=0' } });
}
function safeObject(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function partners(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((item) => clean(item, 180)).filter(Boolean);
}
function publicClient(doc: Record<string, unknown>) {
  const access = safeObject(doc.access);
  return {
    _id: String(doc._id || ''),
    status: clean(doc.status, 40) || 'ativo',
    business: safeObject(doc.business),
    location: safeObject(doc.location),
    billing: safeObject(doc.billing),
    access: {
      fullName: clean(access.fullName, 160),
      email: clean(access.email, 180),
      portalEnabled: access.portalEnabled !== false,
      lastLoginAt: access.lastLoginAt || null,
    },
    notes: clean(doc.notes, 5000),
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
  };
}

export async function GET(req: Request) {
  if (!(await getAdminSessionFromRequest(req))) return json({ error: 'unauthorized' }, 401);
  try {
    const db = await getDb();
    const rows = await db.collection('clients').find({}).sort({ updatedAt: -1, createdAt: -1 }).limit(500).toArray();
    return json({ clients: rows.map((row) => publicClient(row as unknown as Record<string, unknown>)) });
  } catch (error) {
    console.error('clients_get_failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'clients_unavailable', clients: [] }, 503);
  }
}

export async function POST(req: Request) {
  if (!(await getAdminSessionFromRequest(req))) return json({ error: 'unauthorized' }, 401);
  if (!sameOrigin(req)) return json({ error: 'invalid_origin' }, 403);
  if (Number(req.headers.get('content-length') || 0) > 40_000) return json({ error: 'request_too_large' }, 413);

  try {
    const raw = await req.json();
    const body = safeObject(raw);
    const businessRaw = safeObject(body.business);
    const locationRaw = safeObject(body.location);
    const billingRaw = safeObject(body.billing);
    const accessRaw = safeObject(body.access);

    const cnpj = digits(businessRaw.cnpj, 14);
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
    const collection = db.collection('clients');

    await Promise.all([
      collection.createIndex({ 'business.cnpj': 1 }, { unique: true, sparse: true, name: 'client_cnpj_unique' }),
      collection.createIndex({ 'access.emailLower': 1 }, { unique: true, sparse: true, name: 'client_access_email_unique' }),
    ]).catch(() => undefined);

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
    console.error('client_create_failed', message);
    return json({ error: 'client_create_failed' }, 503);
  }
}
