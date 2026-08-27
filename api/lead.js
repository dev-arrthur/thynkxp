import { getDb } from '../lib/mongodb.js';

const clean = (value, max = 300) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const emailOk = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const name = clean(body.name, 120);
    const email = clean(body.email, 180).toLowerCase();
    const phone = clean(body.phone, 40);
    const company = clean(body.company, 160);
    const consent = body.consent === true;

    if (!name || !email || !emailOk(email) || !consent) {
      return res.status(400).json({ ok: false, error: 'Nome, e-mail e consentimento são obrigatórios.' });
    }

    const db = await getDb();
    const lead = {
      name,
      email,
      phone,
      company,
      source: clean(body.source, 300),
      landingPath: clean(body.landingPath, 500),
      visitorId: clean(body.visitorId, 100),
      marketingConsent: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('leads').updateOne(
      { email },
      { $set: lead, $setOnInsert: { firstSeenAt: new Date() }, $inc: { submissions: 1 } },
      { upsert: true }
    );

    // Optional Resend integration. Configure RESEND_API_KEY and LEAD_NOTIFICATION_EMAIL in Vercel.
    if (process.env.RESEND_API_KEY && process.env.LEAD_NOTIFICATION_EMAIL) {
      const html = `<h2>Novo lead — ThynkXP</h2><p><b>Nome:</b> ${escapeHtml(name)}</p><p><b>E-mail:</b> ${escapeHtml(email)}</p><p><b>Telefone:</b> ${escapeHtml(phone)}</p><p><b>Empresa:</b> ${escapeHtml(company)}</p>`;
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL || 'ThynkXP <onboarding@resend.dev>', to: [process.env.LEAD_NOTIFICATION_EMAIL], subject: `Novo lead: ${name}`, html })
      });
    }

    return res.status(201).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: 'Could not save lead' });
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}
