import { getDb } from '../lib/mongodb.js';

const allowedEvents = new Set(['page_view', 'heartbeat', 'section_view', 'click', 'lead_view']);
const clean = (value, max = 500) => typeof value === 'string' ? value.slice(0, max) : '';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const event = clean(body.event, 40);
    if (!allowedEvents.has(event)) return res.status(400).json({ ok: false, error: 'Invalid event' });
    if (body.consent !== true) return res.status(204).end();

    const db = await getDb();
    const now = new Date();
    const visitorId = clean(body.visitorId, 100);
    if (!visitorId) return res.status(400).json({ ok: false, error: 'visitorId required' });

    const doc = {
      event,
      visitorId,
      sessionId: clean(body.sessionId, 100),
      path: clean(body.path, 500),
      referrer: clean(body.referrer, 1000),
      utm: {
        source: clean(body.utm?.source, 200),
        medium: clean(body.utm?.medium, 200),
        campaign: clean(body.utm?.campaign, 200),
        term: clean(body.utm?.term, 200),
        content: clean(body.utm?.content, 200)
      },
      section: clean(body.section, 150),
      element: clean(body.element, 300),
      durationMs: Number.isFinite(body.durationMs) ? Math.min(Math.max(body.durationMs, 0), 86400000) : null,
      userAgent: clean(req.headers['user-agent'], 1000),
      location: {
        country: clean(req.headers['x-vercel-ip-country'], 100),
        region: clean(req.headers['x-vercel-ip-country-region'], 100),
        city: clean(req.headers['x-vercel-ip-city'], 150)
      },
      createdAt: now
    };

    await db.collection('analytics_events').insertOne(doc);
    return res.status(201).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: 'Tracking unavailable' });
  }
}
