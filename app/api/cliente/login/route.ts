import { NextResponse } from 'next/server';
import { CLIENT_SESSION_COOKIE } from '../../../../lib/clientPortalAuth';
import { ApiError, apiError, readBody, requireSameOrigin } from '../../../../lib/workspace';
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

function requestIp(req: Request) {
  return (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown').split(',')[0].trim().slice(0, 80);
}

function json(payload: Record<string, unknown>, status = 200, headers?: HeadersInit) {
  return NextResponse.json(payload, { status, headers: { 'Cache-Control': 'no-store, max-age=0', ...headers } });
}

export async function POST(request: Request) {
  try { requireSameOrigin(request); } catch (error) { return apiError(error); }
  if (!clientSessionV3Configured()) return json({ ok: false, error: 'client_portal_not_configured' }, 503);

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
    const body = await readBody(request, 4096);
    const email = String(body.email || '').trim().toLowerCase().slice(0, 180);
    const password = String(body.password || '').slice(0, 300);

    let stored;
    try { stored = await validateStoredClientCredentials(email, password); }
    catch { return json({ ok: false, error: 'service_unavailable' }, 503); }

    if (stored) {
      attempts.delete(key);
      const response = json({ ok: true, user: { email: stored.email, name: stored.name, company: stored.company } });
      response.cookies.set({
        name: CLIENT_V3_COOKIE,
        value: createClientSessionV3({ email: stored.email, clientId: stored.id, name: stored.name, company: stored.company, sessionVersion: stored.sessionVersion }),
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: CLIENT_V3_MAX_AGE,
      });
      response.cookies.set({ name: CLIENT_SESSION_COOKIE, value: '', httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
      return response;
    }

    attempt.count += 1;
    attempts.set(key, attempt);
    return json({ ok: false, error: 'invalid_credentials' }, 401);

  } catch (error) {
    if (error instanceof ApiError) return apiError(error);
    return json({ ok: false, error: 'invalid_request' }, 400);
  }
}
