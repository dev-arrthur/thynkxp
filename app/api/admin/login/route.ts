import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  adminAuthConfigured,
  createAdminSessionToken,
  validateAdminCredentials,
} from '../../../../lib/admin-auth';

type Attempt = { count: number; resetAt: number };
const attempts = new Map<string, Attempt>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(req.url).origin;
  } catch {
    return false;
  }
}

function requestIp(req: Request) {
  return (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown')
    .split(',')[0]
    .trim()
    .slice(0, 80);
}

function getAttempt(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    const fresh = { count: 0, resetAt: now + WINDOW_MS };
    attempts.set(key, fresh);
    return fresh;
  }
  return current;
}

function pruneAttempts() {
  if (attempts.size < 500) return;
  const now = Date.now();
  for (const [key, value] of attempts) {
    if (value.resetAt <= now) attempts.delete(key);
  }
}

function json(payload: Record<string, unknown>, status = 200, headers?: HeadersInit) {
  return NextResponse.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0', ...headers },
  });
}

export async function POST(req: Request) {
  pruneAttempts();

  if (!sameOrigin(req)) return json({ ok: false, error: 'invalid_origin' }, 403);
  if (!adminAuthConfigured()) return json({ ok: false, error: 'admin_not_configured' }, 503);

  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > 4096) return json({ ok: false, error: 'request_too_large' }, 413);

  const key = requestIp(req);
  const attempt = getAttempt(key);
  if (attempt.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.max(1, Math.ceil((attempt.resetAt - Date.now()) / 1000));
    return json({ ok: false, error: 'too_many_attempts' }, 429, { 'Retry-After': String(retryAfter) });
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'invalid_request' }, 400);
  }

  if (!validateAdminCredentials(body.email, body.password)) {
    attempt.count += 1;
    attempts.set(key, attempt);
    return json({ ok: false, error: 'invalid_credentials' }, 401);
  }

  try {
    const token = createAdminSessionToken(body.email, body.password);
    attempts.delete(key);

    const response = json({ ok: true });
    response.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: ADMIN_SESSION_TTL_SECONDS,
    });
    return response;
  } catch (error) {
    console.error('Erro ao preparar a sessão administrativa:', error instanceof Error ? error.message : 'unknown_error');
    return json({ ok: false, error: 'admin_session_unavailable' }, 503);
  }
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return json({ ok: false, error: 'invalid_origin' }, 403);

  const response = json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}
