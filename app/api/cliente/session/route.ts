import { NextResponse } from 'next/server';
import { CLIENT_SESSION_COOKIE, readClientSession } from '../../../../lib/clientPortalAuth';

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookie = cookieHeader
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${CLIENT_SESSION_COOKIE}=`));
  const value = cookie ? decodeURIComponent(cookie.slice(CLIENT_SESSION_COOKIE.length + 1)) : null;
  const session = readClientSession(value);

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: { email: session.email, name: 'Cliente ThynkXP' },
  });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: CLIENT_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
