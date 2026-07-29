import { MongoClient, Db, ServerApiVersion } from "mongodb";

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | undefined;

function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Falta MONGODB_URI en .env.local");
  }
  return new MongoClient(uri, options).connect();
}

// La conexión se abre al primer uso, no al importar, para no exigir credenciales en el build
function getClientPromise() {
  // En desarrollo se guarda en global para que el hot reload no abra una conexión nueva
  if (process.env.NODE_ENV === "development") {
    global._mongoClientPromise ??= connect();
    return global._mongoClientPromise;
  }

  clientPromise ??= connect();
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(process.env.MONGODB_DB ?? "webstorage");
}
