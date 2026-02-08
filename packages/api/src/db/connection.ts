import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mirmirops';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[DB] Connected to MongoDB');
  } catch (error) {
    console.error('[DB] Connection error:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  console.log('[DB] Disconnected from MongoDB');
}

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('[DB] MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('[DB] MongoDB disconnected');
});

process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});
