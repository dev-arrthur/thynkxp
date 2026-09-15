import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '../../../../lib/admin-auth';

export async function GET(req: Request) {
  const authenticated = await getAdminSessionFromRequest(req);
  return NextResponse.json(
    { ok: authenticated },
    {
      status: authenticated ? 200 : 401,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    },
  );
}
