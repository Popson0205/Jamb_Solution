import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
dotenv.config();

import studentRouter from './routes/student';
import adminRouter from './routes/admin';
import { db } from './db';

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.ADMIN_URL,
  /\.onrender\.com$/,
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean);

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some((o: any) => {
      if (!o) return false;
      if (o instanceof RegExp) return o.test(origin);
      return o === origin;
    });
    if (allowed) return callback(null, true);
    console.warn(`CORS blocked: ${origin}`);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Preflight must be BEFORE all other middleware
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json());

app.use('/api/student/register', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many registration attempts. Please try again later.' },
}));

app.use('/api/student', studentRouter);
app.use('/api/admin', adminRouter);

app.get('/health', (_req, res) => res.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  env: process.env.NODE_ENV,
}));

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Keep Neon DB alive (pings every 4 min — Neon pauses after 5 min idle)
setInterval(async () => {
  try {
    await db.raw('SELECT 1');
    console.log(`[${new Date().toISOString()}] DB keep-alive OK`);
  } catch (err: any) {
    console.error('DB keep-alive failed:', err.message);
  }
}, 4 * 60 * 1000);

app.listen(PORT, () => console.log(`🚀 JAMB API running on port ${PORT}`));

export default app;
