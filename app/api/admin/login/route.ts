import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  adminAuthConfigured,
  createAdminSessionToken,
  validateAdminCredentials
} from '../../../../lib/admin-auth';

export async function POST(req: Request) {
  if (!adminAuthConfigured()) {
    return NextResponse.json({ ok: false, error: 'admin_not_configured' }, { status: 500 });
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
  }

  if (!validateAdminCredentials(body.email, body.password)) {
    return NextResponse.json({ ok: false, error: 'invalid_credentials' }, { status: 401 });
  }

  try {
    const token = await createAdminSessionToken(body.email, body.password);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ADMIN_SESSION_TTL_SECONDS
    });
    return response;
  } catch (error) {
    console.error('Erro ao preparar o acesso administrativo:', error);
    return NextResponse.json({ ok: false, error: 'admin_storage_unavailable' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
  return response;
}
