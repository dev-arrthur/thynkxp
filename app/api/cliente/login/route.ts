import { NextResponse } from 'next/server';
import { CLIENT_SESSION_COOKIE, CLIENT_SESSION_MAX_AGE, createClientSession, validateClientCredentials } from '../../../../lib/clientPortalAuth';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; password?: string };
    const email = body.email || '';
    const password = body.password || '';

    if (!validateClientCredentials(email, password)) {
      return NextResponse.json({ ok: false, error: 'invalid_credentials' }, { status: 401 });
    }

    const response = NextResponse.json({
      ok: true,
      user: { email, name: 'Cliente ThynkXP' },
    });

    response.cookies.set({
      name: CLIENT_SESSION_COOKIE,
      value: createClientSession(email),
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: CLIENT_SESSION_MAX_AGE,
    });

    return response;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
  }
}
