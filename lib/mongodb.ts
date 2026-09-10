import { Db, MongoClient } from 'mongodb';

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured');

  if (!clientPromise) {
    client = new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 5000 });
    clientPromise = client.connect();
  }

  const connectedClient = await clientPromise;
  return connectedClient.db(process.env.MONGODB_DB || 'thynkxp');
}
