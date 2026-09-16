import { NextResponse } from 'next/server';
import { CLIENT_SESSION_COOKIE } from '../../../../lib/clientPortalAuth';
import { CLIENT_V3_COOKIE } from '../../../../lib/clientPortalSessionV3';
import { ApiError, apiError, getWorkspaceDb, objectId, requireActor } from '../../../../lib/workspace';
import { clean, safeObject } from '../../../../lib/clientManagement';

function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(req.url).origin; } catch { return false; }
}

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, { status, headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request, 'client');
    if (actor.role !== 'client' || !actor.clientId) throw new ApiError(401, 'unauthorized');
    const account = await (await getWorkspaceDb()).collection('clients').findOne({ _id: objectId(actor.clientId) }, { maxTimeMS: 5000, projection: { business: 1 } });
    const business = safeObject(account?.business);
    return json({ authenticated: true, user: { email: actor.email, name: actor.name, company: clean(business.tradeName, 180) || clean(business.legalName, 180), clientId: actor.clientId } });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return json({ authenticated: false, error: 'unauthorized' }, 401);
    return apiError(error);
  }
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
