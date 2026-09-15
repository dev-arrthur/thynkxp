import { NextResponse } from 'next/server';
import { adminSessionHasDedicatedSecret, getAdminSessionFromRequest } from '../../../../lib/admin-auth';
import { checkDbConnection } from '../../../../lib/mongodb';

export async function GET(req: Request) {
  if (!(await getAdminSessionFromRequest(req))) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }

  const database = await checkDbConnection();
  return NextResponse.json(
    {
      ok: database,
      services: {
        adminSession: 'ready',
        database: database ? 'ready' : 'unavailable',
        leadRadar: 'ready',
      },
      security: {
        dedicatedSessionSecret: adminSessionHasDedicatedSecret(),
      },
    },
    {
      status: database ? 200 : 503,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    },
  );
}
