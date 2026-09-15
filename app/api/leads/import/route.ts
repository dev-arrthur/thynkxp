import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '../../../../lib/admin-auth';
import { getDb } from '../../../../lib/mongodb';

const MAX_IMPORT = 50;

type InputPartner = { name?: unknown; qualification?: unknown; joinedAt?: unknown };
type InputTax = { year?: unknown; form?: unknown; filings?: unknown };
type InputProspect = Record<string, unknown>;

function clean(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function digits(value: unknown, max = 30) {
  return String(value || '').replace(/\D/g, '').slice(0, max);
}

function number(value: unknown, max = 10_000_000_000) {
  const parsed = typeof value === 'number' ? value : Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(max, parsed)) : 0;
}

function boolOrNull(value: unknown) {
  return typeof value === 'boolean' ? value : null;
}

function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(req.url).origin; } catch { return false; }
}

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, { status, headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

function partners(value: unknown) {
  return (Array.isArray(value) ? value : []).slice(0, 20).map((item) => {
    const row = item && typeof item === 'object' ? item as InputPartner : {};
    return { name: clean(row.name, 180), qualification: clean(row.qualification, 140), joinedAt: clean(row.joinedAt, 20) };
  }).filter((item) => item.name);
}

function taxRegime(value: unknown) {
  return (Array.isArray(value) ? value : []).slice(0, 8).map((item) => {
    const row = item && typeof item === 'object' ? item as InputTax : {};
    return { year: Math.round(number(row.year, 3000)), form: clean(row.form, 120), filings: Math.round(number(row.filings, 1_000_000)) };
  }).filter((item) => item.form);
}

function buildProspect(raw: InputProspect, context: { segment: string; city: string; uf: string }) {
  const cnpj = digits(raw.id || raw.cnpj, 14);
  const company = clean(raw.name || raw.company, 180);
  const legalName = clean(raw.legalName, 180);
  const score = Math.round(number(raw.score, 100));
  const partnerList = partners(raw.partners);
  const tax = taxRegime(raw.taxRegime);
  const website = clean(raw.website, 500);
  const instagram = clean(raw.instagram, 500);
  const facebook = clean(raw.facebook, 500);
  const googleMapsUrl = clean(raw.googleMapsUrl, 500);
  const digitalSources = (Array.isArray(raw.digitalSources) ? raw.digitalSources : []).slice(0, 10).map((item) => clean(item, 80)).filter(Boolean);
  const reasons = (Array.isArray(raw.reasons) ? raw.reasons : []).slice(0, 10).map((item) => clean(item, 180)).filter(Boolean);
  const taxSummary = clean(raw.taxSummary, 180);

  const notes = [
    'Lead selecionado no Radar de Leads da thynkXP.',
    cnpj ? `CNPJ: ${cnpj}.` : '',
    legalName && legalName !== company ? `Razão social: ${legalName}.` : '',
    clean(raw.cnae, 20) ? `CNAE: ${clean(raw.cnae, 20)} — ${clean(raw.cnaeDescription, 240)}.` : '',
    clean(raw.address, 500) ? `Endereço: ${clean(raw.address, 500)}.` : '',
    clean(raw.porte, 100) ? `Porte: ${clean(raw.porte, 100)}.` : '',
    number(raw.capitalSocial) ? `Capital social: R$ ${number(raw.capitalSocial).toLocaleString('pt-BR')}.` : '',
    taxSummary ? `Regime/indicação tributária: ${taxSummary}.` : '',
    website ? `Site: ${website}.` : '',
    instagram ? `Instagram: ${instagram}.` : '',
    `Score de qualificação: ${score}/100.`,
    reasons.length ? `Sinais: ${reasons.join('; ')}.` : '',
    partnerList.length ? `Quadro societário público: ${partnerList.map((partner) => `${partner.name}${partner.qualification ? ` (${partner.qualification})` : ''}`).join('; ')}.` : '',
    `Busca de origem: ${context.segment || 'segmento não informado'} em ${context.city || 'cidade não informada'}/${context.uf || '--'}.`,
  ].filter(Boolean).join('\n');

  return {
    name: company,
    company,
    legalName,
    email: clean(raw.email, 180).toLowerCase(),
    phone: clean(raw.phone, 40),
    interest: `Prospecção · ${clean(raw.cnaeDescription, 180) || context.segment || 'Radar de Leads'}`,
    source: 'Radar de Leads · Inteligência Comercial',
    status: score >= 72 ? 'qualificado' : 'novo',
    estimatedValue: 0,
    nextActionAt: null,
    notes,
    owner: 'Arthur Ferreira',
    cnpj,
    address: clean(raw.address, 500),
    cnae: digits(raw.cnae, 7),
    cnaeDescription: clean(raw.cnaeDescription, 240),
    companySize: clean(raw.porte, 100),
    legalNature: clean(raw.legalNature, 160),
    capitalSocial: number(raw.capitalSocial),
    openedAt: clean(raw.openedAt, 20),
    qualificationScore: score,
    qualification: clean(raw.qualification, 30),
    partners: partnerList,
    taxRegime: tax,
    taxSummary,
    simples: boolOrNull(raw.simples),
    mei: boolOrNull(raw.mei),
    website,
    instagram,
    facebook,
    googleMapsUrl,
    googlePlaceId: clean(raw.googlePlaceId, 180),
    googleRating: number(raw.googleRating, 5),
    googleRatingCount: Math.round(number(raw.googleRatingCount, 10_000_000)),
    digitalSources,
    prospectionContext: { segment: context.segment, city: context.city, uf: context.uf },
    externalSource: 'radar_b2b',
    externalId: cnpj || clean(raw.id, 180),
    anonymous: false,
    leadType: 'prospected',
  };
}

export async function POST(req: Request) {
  if (!(await getAdminSessionFromRequest(req))) return json({ error: 'unauthorized' }, 401);
  if (!sameOrigin(req)) return json({ error: 'invalid_origin' }, 403);

  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > 512_000) return json({ error: 'request_too_large' }, 413);

  try {
    const raw = await req.json() as { prospects?: unknown; criteria?: unknown };
    const list = Array.isArray(raw.prospects) ? raw.prospects.slice(0, MAX_IMPORT) : [];
    if (!list.length) return json({ error: 'prospects_required' }, 400);
    const criteriaRaw = raw.criteria && typeof raw.criteria === 'object' ? raw.criteria as Record<string, unknown> : {};
    const context = { segment: clean(criteriaRaw.segment, 100), city: clean(criteriaRaw.city, 120), uf: clean(criteriaRaw.uf, 2).toUpperCase() };
    const contacts = list.map((item) => buildProspect(item && typeof item === 'object' ? item as InputProspect : {}, context))
      .filter((item) => item.company && (item.cnpj.length === 14 || item.externalId));
    if (!contacts.length) return json({ error: 'invalid_prospects' }, 400);

    const database = await getDb();
    const collection = database.collection('leads');
    const now = new Date();
    const operations = contacts.map((contact) => {
      const duplicate: Record<string, unknown>[] = [];
      if (contact.cnpj) duplicate.push({ cnpj: contact.cnpj, anonymous: { $ne: true } });
      if (contact.email) duplicate.push({ email: contact.email, anonymous: { $ne: true } });
      if (contact.externalId) duplicate.push({ externalSource: contact.externalSource, externalId: contact.externalId, anonymous: { $ne: true } });
      return {
        updateOne: {
          filter: { $or: duplicate },
          update: { $setOnInsert: { ...contact, createdAt: now, updatedAt: now } },
          upsert: true,
        },
      };
    });

    const result = await collection.bulkWrite(operations, { ordered: false });
    const inserted = result.upsertedCount;
    return json({ ok: true, requested: contacts.length, inserted, existing: contacts.length - inserted });
  } catch (error) {
    console.error('Erro ao importar leads do Radar:', error instanceof Error ? error.message : 'unknown_error');
    return json({ error: 'lead_import_failed' }, 503);
  }
}
