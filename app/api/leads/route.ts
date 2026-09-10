import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getAdminSessionFromRequest } from '../../../lib/admin-auth';
import { getDb } from '../../../lib/mongodb';

const ALLOWED_STATUS = new Set([
  'novo', 'qualificado', 'em_contato', 'proposta', 'negociacao',
  'cliente', 'ativo', 'pausado', 'perdido',
]);

function clean(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function normalizeStatus(value: unknown) {
  const raw = clean(value, 40).toLowerCase().replaceAll(' ', '_');
  if (raw === 'contato') return 'em_contato';
  if (raw === 'convertido') return 'cliente';
  return ALLOWED_STATUS.has(raw) ? raw : 'novo';
}

function numericValue(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(String(value || '').replace(',', '.'));
  return Number.isFinite(parsed) ? Math.max(0, Math.min(parsed, 100_000_000)) : 0;
}

function optionalDate(value: unknown) {
  const raw = clean(value, 80);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  return !origin || origin === new URL(req.url).origin;
}

function emailIsValid(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildContact(body: Record<string, unknown>) {
  return {
    name: clean(body.name, 120),
    email: clean(body.email, 180).toLowerCase(),
    phone: clean(body.phone, 40),
    company: clean(body.company, 160),
    interest: clean(body.interest, 160),
    source: clean(body.source, 180) || 'Cadastro manual',
    status: normalizeStatus(body.status),
    estimatedValue: numericValue(body.estimatedValue),
    nextActionAt: optionalDate(body.nextActionAt),
    notes: clean(body.notes, 4000),
    owner: clean(body.owner, 120) || 'Arthur Ferreira',
  };
}

export async function GET(req: Request) {
  if (!(await getAdminSessionFromRequest(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const database = await getDb();
    const leads = await database.collection('leads').find({}).sort({ updatedAt: -1, createdAt: -1 }).limit(500).toArray();
    return NextResponse.json({ leads });
  } catch (error) {
    console.error('Erro ao carregar contatos:', error);
    return NextResponse.json({ error: 'leads_unavailable', leads: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await getAdminSessionFromRequest(req))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: 'invalid_origin' }, { status: 403 });

  try {
    const raw = await req.json();
    const body = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
    const contact = buildContact(body);
    if (!contact.name && !contact.company) {
      return NextResponse.json({ error: 'name_or_company_required' }, { status: 400 });
    }
    if (!emailIsValid(contact.email)) return NextResponse.json({ error: 'invalid_email' }, { status: 400 });

    const now = new Date();
    const database = await getDb();
    if (contact.email && await database.collection('leads').findOne({ email: contact.email, anonymous: { $ne: true } })) {
      return NextResponse.json({ error: 'contact_already_exists' }, { status: 409 });
    }
    const result = await database.collection('leads').insertOne({
      ...contact,
      anonymous: false,
      leadType: 'identified',
      createdAt: now,
      updatedAt: now,
    });
    const created = await database.collection('leads').findOne({ _id: result.insertedId });
    return NextResponse.json({ ok: true, lead: created }, { status: 201 });
  } catch (error) {
    console.error('Erro ao cadastrar contato:', error);
    return NextResponse.json({ error: 'contact_create_failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!(await getAdminSessionFromRequest(req))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: 'invalid_origin' }, { status: 403 });

  try {
    const raw = await req.json();
    const body = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
    const id = clean(body.id, 80);
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

    const contact = buildContact(body);
    if (!contact.name && !contact.company) {
      return NextResponse.json({ error: 'name_or_company_required' }, { status: 400 });
    }
    if (!emailIsValid(contact.email)) return NextResponse.json({ error: 'invalid_email' }, { status: 400 });

    const database = await getDb();
    const _id = new ObjectId(id);
    const result = await database.collection('leads').updateOne(
      { _id },
      { $set: { ...contact, anonymous: false, leadType: 'identified', updatedAt: new Date() } },
    );
    if (!result.matchedCount) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const updated = await database.collection('leads').findOne({ _id });
    return NextResponse.json({ ok: true, lead: updated });
  } catch (error) {
    console.error('Erro ao atualizar contato:', error);
    return NextResponse.json({ error: 'contact_update_failed' }, { status: 500 });
  }
}
