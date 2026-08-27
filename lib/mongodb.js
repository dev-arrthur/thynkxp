import { MongoClient } from 'mongodb';

let client;
let clientPromise;

export async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured');

  if (!clientPromise) {
    client = new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 5000 });
    clientPromise = client.connect();
  }

  await clientPromise;
  return client.db(process.env.MONGODB_DB || 'thynkxp');
}
