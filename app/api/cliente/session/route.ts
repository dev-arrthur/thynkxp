import { NextResponse } from 'next/server';
import { CLIENT_SESSION_COOKIE, readClientSession } from '../../../../lib/clientPortalAuth';
import { CLIENT_V3_COOKIE, readClientSessionV3 } from '../../../../lib/clientPortalSessionV3';

function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(req.url).origin; } catch { return false; }
}

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, { status, headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

function cookieValue(request: Request, name: string) {
  const raw = request.headers.get('cookie') || '';
  const cookie = raw.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}

export async function GET(request: Request) {
  const modern = readClientSessionV3(cookieValue(request, CLIENT_V3_COOKIE));
  if (modern) {
    return json({ authenticated: true, user: { email: modern.email, name: modern.name, company: modern.company, clientId: modern.clientId } });
  }

  const legacy = readClientSession(cookieValue(request, CLIENT_SESSION_COOKIE));
  if (!legacy) return json({ authenticated: false }, 401);
  return json({ authenticated: true, user: { email: legacy.email, name: 'Cliente ThynkXP' } });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json({ ok: false, error: 'invalid_origin' }, 403);
  const response = json({ ok: true });
  for (const name of [CLIENT_V3_COOKIE, CLIENT_SESSION_COOKIE]) {
    response.cookies.set({
      name,
      value: '',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });
  }
  return response;
}
