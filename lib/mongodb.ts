import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not defined');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// In development, Next.js hot-reloads modules — storing the connection on
// the global object prevents a new connection on every reload.
declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cached;

export async function connectToDatabase(): Promise<typeof mongoose> {
  // Return the existing connection if already established.
  if (cached.conn) {
    return cached.conn;
  }

  // Start a new connection only if one isn't already in progress.
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      // Disable Mongoose's internal request buffering so operations fail
      // immediately when the connection is not yet ready.
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
