import { MongoClient, Db, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "webstorage";

if (!uri) {
  throw new Error("Falta MONGODB_URI en .env.local");
}

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

let clientPromise: Promise<MongoClient>;

// En desarrollo se reutiliza la conexión para que el hot reload no abra una nueva
if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri, options).connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = new MongoClient(uri, options).connect();
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

export default clientPromise;
