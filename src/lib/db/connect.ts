// 📄 src/lib/db/connect.ts
// v2 (pool controlado):
// - O cluster é um Atlas M0: máximo de 500 conexões POR NÓ, somando todas as
//   instâncias de função da Vercel (deploy atual + deploys anteriores ainda
//   vivos). Com os valores por omissão do driver (maxPoolSize 100, conexões
//   ociosas nunca fechadas) bastavam 4–5 instâncias para o Atlas disparar o
//   alerta "Connections % of configured limit has gone above 80".
// - Agora cada instância abre no máximo MAX_POOL_SIZE conexões e fecha as
//   ociosas ao fim de MAX_IDLE_TIME_MS.
// - attachDatabasePool (Fluid compute): mantém a instância acordada só o
//   tempo necessário para o driver fechar as conexões ociosas ANTES de a
//   Vercel a suspender — sem isto, uma instância suspensa fica a segurar os
//   sockets abertos indefinidamente. Fora da Vercel (dev local) não faz nada.
import mongoose, { type ConnectOptions } from 'mongoose';
import { attachDatabasePool } from '@vercel/functions';

// Teto de conexões por instância. Em Fluid compute uma instância atende
// vários pedidos em simultâneo, por isso 1 seria um gargalo; 10 chega para
// os Promise.all das rotas e fica muito abaixo do limite do M0.
const MAX_POOL_SIZE = 10;

// Conexão parada há mais de 10 s é fechada pelo driver.
const MAX_IDLE_TIME_MS = 10_000;

const CONNECT_OPTIONS: ConnectOptions = {
  bufferCommands: false,
  maxPoolSize: MAX_POOL_SIZE,
  minPoolSize: 0, // nenhuma conexão "fixa": instância ociosa volta a zero
  maxIdleTimeMS: MAX_IDLE_TIME_MS,
  serverSelectionTimeoutMS: 10_000, // falha rápido em vez de esperar 30 s
  socketTimeoutMS: 45_000,
};

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

// Cache global: sobrevive ao hot reload em dev e é partilhado por todos os
// pedidos atendidos pela mesma instância em produção.
const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

async function connectDB(): Promise<typeof mongoose> {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI não definida. Adicione ao .env.local');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, CONNECT_OPTIONS).then(m => {
      // Regista o pool na Vercel uma única vez por instância.
      attachDatabasePool(m.connection.getClient());
      console.log('✅ MongoDB connected');
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
