import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';

let client: MongoClient | null = null;

function clean(value: unknown, max = 300) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function emailIsValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char));
}

async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI não configurada');
  client ??= new MongoClient(uri);
  await client.connect();
  return client.db(process.env.MONGODB_DB || 'thynkxp');
}

async function sendLeadNotification(lead: { name: string; email: string; phone: string; company: string; interest: string; message: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const destination = process.env.LEAD_NOTIFICATION_EMAIL;
  if (!apiKey || !destination) return;
  const html = [
    '<h2>Novo lead — ThynkXP</h2>',
    `<p><b>Nome:</b> ${escapeHtml(lead.name)}</p>`,
    `<p><b>E-mail:</b> ${escapeHtml(lead.email)}</p>`,
    `<p><b>Telefone:</b> ${escapeHtml(lead.phone)}</p>`,
    `<p><b>Empresa:</b> ${escapeHtml(lead.company)}</p>`,
    `<p><b>Interesse:</b> ${escapeHtml(lead.interest)}</p>`,
    `<p><b>Contexto:</b> ${escapeHtml(lead.message)}</p>`
  ].join('');
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'ThynkXP <onboarding@resend.dev>',
        to: [destination],
        subject: `Novo lead: ${lead.name}`,
        html
      })
    });
  } catch (error) {
    console.warn('Falha ao enviar notificação de lead:', error);
  }
}

export async function POST(req: Request) {
  try {
    const body = asRecord(await req.json());
    const name = clean(body.name, 120);
    const email = clean(body.email, 180).toLowerCase();
    const phone = clean(body.phone, 40);
    const company = clean(body.company, 160);
    const interest = clean(body.interest, 160);
    const message = clean(body.message, 1800);
    const visitorId = clean(body.visitorId, 100);
    const consent = body.consent === true;
    const analyticsConsent = body.analyticsConsent === true;
    const utm = asRecord(body.utm);

    if (!name || !email || !emailIsValid(email) || !consent) {
      return NextResponse.json({ ok: false, error: 'Nome, e-mail válido e consentimento são obrigatórios.' }, { status: 400 });
    }

    const database = await getDb();
    const leads = database.collection('leads');
    const now = new Date();

    const anonymousJourney = visitorId && analyticsConsent
      ? await leads.findOne({ visitorId, leadType: 'cookie_consent' })
      : null;

    const journey = anonymousJourney ? {
      firstSeenAt: anonymousJourney.firstSeenAt || anonymousJourney.createdAt || null,
      lastSeenAt: anonymousJourney.lastSeenAt || null,
      referrer: anonymousJourney.referrer || '',
      location: anonymousJourney.location || {},
      device: anonymousJourney.device || {},
      cookieConsent: anonymousJourney.cookieConsent || '',
      anonymousSubmissions: anonymousJourney.submissions || 0,
    } : null;

    await leads.updateOne(
      { email },
      {
        $set: {
          name, email, phone, company, interest, message,
          source: clean(body.source, 300),
          landingPath: clean(body.landingPath, 500),
          referrer: clean(body.referrer, 1000) || journey?.referrer || '',
          visitorId,
          utm,
          journey,
          marketingConsent: true,
          analyticsConsent,
          anonymous: false,
          leadType: 'identified',
          updatedAt: now
        },
        $setOnInsert: { status: 'novo', createdAt: now, firstSeenAt: journey?.firstSeenAt || now },
        $inc: { submissions: 1 }
      },
      { upsert: true }
    );

    if (anonymousJourney?._id) {
      await leads.deleteOne({ _id: anonymousJourney._id });
    }

    await sendLeadNotification({ name, email, phone, company, interest, message });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('Erro ao salvar lead:', error);
    return NextResponse.json({ ok: false, error: 'lead_unavailable' }, { status: 500 });
  }
}
