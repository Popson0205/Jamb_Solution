import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
dotenv.config();

import studentRouter from './routes/student';
import adminRouter from './routes/admin';

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS
// In production, allow any *.onrender.com subdomain + explicit env var origins
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.ADMIN_URL,
  /\.onrender\.com$/,   // covers all Render subdomains automatically
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some(o => {
      if (!o) return false;
      if (o instanceof RegExp) return o.test(origin);
      return o === origin;
    });
    if (allowed) return callback(null, true);
    console.warn(`CORS blocked: ${origin}`);
    callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json());

// Rate limiting on registration only
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

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

app.listen(PORT, () => console.log(`🚀 JAMB API running on port ${PORT}`));
export default app;
