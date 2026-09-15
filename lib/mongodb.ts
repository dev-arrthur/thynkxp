import { Db, MongoClient, type MongoClientOptions } from 'mongodb';

type MongoState = {
  uri: string;
  client: MongoClient | null;
  promise: Promise<MongoClient> | null;
};

const globalMongo = globalThis as typeof globalThis & { __thynkxpMongo?: MongoState };
const state = globalMongo.__thynkxpMongo ??= { uri: '', client: null, promise: null };

const options: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 0,
  maxIdleTimeMS: 30_000,
  serverSelectionTimeoutMS: 5_000,
  connectTimeoutMS: 5_000,
  socketTimeoutMS: 15_000,
  retryReads: true,
  retryWrites: true,
};

function configuredUri() {
  const uri = String(process.env.MONGODB_URI || '').trim();
  if (!uri) throw new Error('MONGODB_URI is not configured');
  return uri;
}

async function connect(uri: string) {
  if (state.uri && state.uri !== uri) {
    const previous = state.client;
    state.client = null;
    state.promise = null;
    state.uri = '';
    if (previous) await previous.close().catch(() => undefined);
  }

  if (state.client) return state.client;
  if (state.promise) return state.promise;

  state.uri = uri;
  const client = new MongoClient(uri, options);
  state.promise = client.connect()
    .then((connected) => {
      state.client = connected;
      return connected;
    })
    .catch(async (error) => {
      state.promise = null;
      state.client = null;
      await client.close().catch(() => undefined);
      throw error;
    });

  return state.promise;
}

export async function getDb(): Promise<Db> {
  const client = await connect(configuredUri());
  return client.db(String(process.env.MONGODB_DB || 'thynkxp').trim() || 'thynkxp');
}

export async function checkDbConnection() {
  try {
    const database = await getDb();
    await database.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}
