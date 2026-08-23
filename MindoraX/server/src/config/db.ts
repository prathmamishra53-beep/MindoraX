import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Connects to MongoDB Atlas.
 * In development, logs a warning if MONGO_URI is a placeholder but does NOT exit —
 * this allows the frontend to load and non-DB routes (like /api/health) to respond.
 */
export async function connectDB() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri || mongoUri.includes('REPLACE_ME')) {
    console.warn('⚠️  WARNING: MONGO_URI is not set or is still a placeholder.');
    console.warn('   Add your real MongoDB Atlas URI to server/.env to enable auth features.');
    console.warn('   The server will start, but any route that touches the DB will fail.');
    return; // Don't exit — allow server to start for frontend development
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`✅  MongoDB Atlas connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error('❌  Error connecting to MongoDB:', error.message);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1); // Only hard-exit in production
    }
    console.warn('   Running without DB in development mode.');
  }
}

export default connectDB;
