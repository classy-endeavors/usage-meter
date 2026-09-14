import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cached = globalForMongoose.mongooseCache ?? {
  conn: null,
  promise: null,
};

export async function dbConnect() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local");
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    // Cache one client on globalThis so Next.js HMR and serverless
    // invocations reuse it. Driver pool defaults are enough for this
    // low-traffic internal dashboard.
    cached.promise = mongoose.connect(MONGODB_URI, {
      // Fail quickly when MongoDB is down so the dashboard can show an error
      // instead of waiting on the driver default (~30s).
      serverSelectionTimeoutMS: 5000,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  globalForMongoose.mongooseCache = cached;
  return cached.conn;
}
