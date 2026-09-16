import { NextResponse } from 'next/server';
import {
  CLIENT_SESSION_COOKIE,
  CLIENT_SESSION_MAX_AGE,
  clientPortalAuthConfigured,
  createClientSession,
  validateClientCredentials,
} from '../../../../lib/clientPortalAuth';
import { validateStoredClientCredentials } from '../../../../lib/clientAccounts';
import {
  CLIENT_V3_COOKIE,
  CLIENT_V3_MAX_AGE,
  clientSessionV3Configured,
  createClientSessionV3,
} from '../../../../lib/clientPortalSessionV3';

type Attempt = { count: number; resetAt: number };
const attempts = new Map<string, Attempt>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(req.url).origin; } catch { return false; }
}

function requestIp(req: Request) {
  return (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown').split(',')[0].trim().slice(0, 80);
}

function json(payload: Record<string, unknown>, status = 200, headers?: HeadersInit) {
  return NextResponse.json(payload, { status, headers: { 'Cache-Control': 'no-store, max-age=0', ...headers } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ ok: false, error: 'invalid_origin' }, 403);
  if (!clientSessionV3Configured() && !clientPortalAuthConfigured()) return json({ ok: false, error: 'client_portal_not_configured' }, 503);

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 4096) return json({ ok: false, error: 'request_too_large' }, 413);

  const key = requestIp(request);
  const now = Date.now();
  const current = attempts.get(key);
  const attempt = !current || current.resetAt <= now ? { count: 0, resetAt: now + WINDOW_MS } : current;
  if (attempt.count >= MAX_ATTEMPTS) {
    return json({ ok: false, error: 'too_many_attempts' }, 429, { 'Retry-After': String(Math.max(1, Math.ceil((attempt.resetAt - now) / 1000))) });
  }

  try {
    const body = await request.json() as { email?: string; password?: string };
    const email = String(body.email || '').trim().toLowerCase().slice(0, 180);
    const password = String(body.password || '').slice(0, 300);

    let stored = null;
    try { stored = await validateStoredClientCredentials(email, password); } catch { stored = null; }

    if (stored && clientSessionV3Configured()) {
      attempts.delete(key);
      const response = json({ ok: true, user: { email: stored.email, name: stored.name, company: stored.company } });
      response.cookies.set({
        name: CLIENT_V3_COOKIE,
        value: createClientSessionV3({ email: stored.email, clientId: stored.id, name: stored.name, company: stored.company }),
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: CLIENT_V3_MAX_AGE,
      });
      return response;
    }

    if (!validateClientCredentials(email, password)) {
      attempt.count += 1;
      attempts.set(key, attempt);
      return json({ ok: false, error: 'invalid_credentials' }, 401);
    }

    attempts.delete(key);
    const response = json({ ok: true, user: { email, name: 'Cliente ThynkXP' } });
    response.cookies.set({
      name: CLIENT_SESSION_COOKIE,
      value: createClientSession(email),
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: CLIENT_SESSION_MAX_AGE,
    });
    return response;
  } catch {
    return json({ ok: false, error: 'invalid_request' }, 400);
  }
}
