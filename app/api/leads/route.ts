import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { getAdminSessionFromRequest } from '../../../lib/admin-auth';

let client: MongoClient | null = null;

async function db() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI não configurada');
  client ??= new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  return client.db(process.env.MONGODB_DB || 'thynkxp');
}

export async function GET(req: Request) {
  if (!getAdminSessionFromRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const database = await db();
    const leads = await database
      .collection('leads')
      .find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    return NextResponse.json({ leads });
  } catch (error) {
    console.error('Erro ao carregar leads:', error);
    return NextResponse.json({ error: 'leads_unavailable', leads: [] }, { status: 500 });
  }
}
