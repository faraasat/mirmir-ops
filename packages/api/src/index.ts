import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDatabase } from './db/connection';
import { authRouter } from './routes/auth';
import { userRouter } from './routes/user';
import { subscriptionRouter } from './routes/subscription';
import { usageRouter } from './routes/usage';
import { licenseRouter } from './routes/license';
import { errorHandler } from './middleware/error-handler';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRouter);
app.use('/user', userRouter);
app.use('/subscription', subscriptionRouter);
app.use('/usage', usageRouter);
app.use('/license', licenseRouter);

// Error handler
app.use(errorHandler);

// Start server
async function start() {
  try {
    // Connect to MongoDB
    await connectDatabase();
    
    app.listen(PORT, () => {
      console.log(`[API] Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('[API] Failed to start server:', error);
    process.exit(1);
  }
}

start();
