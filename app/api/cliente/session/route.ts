import { NextResponse } from 'next/server';
import { CLIENT_SESSION_COOKIE, readClientSession } from '../../../../lib/clientPortalAuth';

function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(req.url).origin;
  } catch {
    return false;
  }
}

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookie = cookieHeader
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${CLIENT_SESSION_COOKIE}=`));
  const value = cookie ? decodeURIComponent(cookie.slice(CLIENT_SESSION_COOKIE.length + 1)) : null;
  const session = readClientSession(value);

  if (!session) return json({ authenticated: false }, 401);
  return json({ authenticated: true, user: { email: session.email, name: 'Cliente ThynkXP' } });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json({ ok: false, error: 'invalid_origin' }, 403);

  const response = json({ ok: true });
  response.cookies.set({
    name: CLIENT_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
