import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';

let client: MongoClient | null = null;

function clean(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function cleanNumber(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(Math.max(Math.round(value), min), max)
    : null;
}

async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI não configurada');
  client ??= new MongoClient(uri);
  await client.connect();
  return client.db(process.env.MONGODB_DB || 'thynkxp');
}

export async function POST(req: Request) {
  try {
    const body = asRecord(await req.json());
    if (body.consent !== true) return new NextResponse(null, { status: 204 });

    const visitorId = clean(body.visitorId, 100);
    if (!visitorId) {
      return NextResponse.json({ ok: false, error: 'visitor_id_required' }, { status: 400 });
    }

    const utm = asRecord(body.utm);
    const device = asRecord(body.device);
    const database = await getDb();
    const now = new Date();

    await database.collection('leads').updateOne(
      { visitorId, leadType: 'cookie_consent' },
      {
        $set: {
          name: 'Visitante do site',
          email: '',
          phone: '',
          company: '',
          source: 'Cookies / Analytics',
          status: 'novo',
          leadType: 'cookie_consent',
          anonymous: true,
          visitorId,
          landingPath: clean(body.landingPath, 500),
          referrer: clean(body.referrer, 1000),
          utm: {
            source: clean(utm.source, 200),
            medium: clean(utm.medium, 200),
            campaign: clean(utm.campaign, 200),
            term: clean(utm.term, 200),
            content: clean(utm.content, 200),
          },
          device: {
            language: clean(device.language, 80),
            timezone: clean(device.timezone, 120),
            viewportWidth: cleanNumber(device.viewportWidth, 0, 20_000),
            viewportHeight: cleanNumber(device.viewportHeight, 0, 20_000),
            screenWidth: cleanNumber(device.screenWidth, 0, 20_000),
            screenHeight: cleanNumber(device.screenHeight, 0, 20_000),
          },
          userAgent: clean(req.headers.get('user-agent'), 1000),
          location: {
            country: clean(req.headers.get('x-vercel-ip-country'), 100),
            region: clean(req.headers.get('x-vercel-ip-country-region'), 100),
            city: clean(req.headers.get('x-vercel-ip-city'), 150),
          },
          cookieConsent: 'analytics',
          consentedAt: now,
          updatedAt: now,
          lastSeenAt: now,
        },
        $setOnInsert: {
          createdAt: now,
          firstSeenAt: now,
        },
        $inc: { submissions: 1 },
      },
      { upsert: true },
    );

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('Erro ao gerar lead de cookies:', error);
    return NextResponse.json({ ok: false, error: 'cookie_lead_unavailable' }, { status: 500 });
  }
}
