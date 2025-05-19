import mongoose from 'mongoose';

// Read the MongoDB URI from environment variables
// Use a fallback connection string if MONGODB_URI is not defined
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/compliance-track';
console.log(`MongoDB URI is ${MONGODB_URI ? 'defined' : 'not defined'}`);
console.log(`Using MongoDB URI: ${MONGODB_URI.replace(/\/\/(.+?)@/, '//***@')}`); // Mask credentials in logs

// Validate the connection string
if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

// Define a cache interface for mongoose connection
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Extend the global object to store our cache
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache;
}

// Initialize or reuse the existing cache
const cache: MongooseCache = global.mongooseCache || { conn: null, promise: null };
if (!global.mongooseCache) {
  global.mongooseCache = cache;
}

// Export a default function to connect to MongoDB
export default async function dbConnect(): Promise<typeof mongoose> {
  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    console.log(`Connecting to MongoDB at ${MONGODB_URI.replace(/\/\/(.+?)@/, '//***@')}`); // Mask credentials in logs

    // Set mongoose connection options
    const options = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4 // Use IPv4, skip trying IPv6
    };

    cache.promise = mongoose.connect(MONGODB_URI, options).then((mongoose) => mongoose);
  }

  try {
    cache.conn = await cache.promise;
    console.log('MongoDB connected successfully');
    return cache.conn;
  } catch (e) {
    console.error('MongoDB connection error:', e);
    throw e;
  }
}