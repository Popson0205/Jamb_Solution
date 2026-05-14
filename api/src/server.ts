import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
dotenv.config();

import studentRouter from './routes/student';
import { requestLogger } from './middleware/logger';
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

// ── Request logger — logs every API hit to request_logs table
app.use(requestLogger);

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


// ── Debug: test email (public — remove after confirming email works)
app.get('/test-email', async (_req, res) => {
  const nodemailer = require('nodemailer');
  const result: any = {
    key_set: !!process.env.SENDGRID_API_KEY,
    from: process.env.SENDGRID_FROM_EMAIL || 'NOT SET',
  };
  if (!process.env.SENDGRID_API_KEY) {
    return res.json({ ...result, error: 'SENDGRID_API_KEY not set in Render environment' });
  }
  try {
    const t = nodemailer.createTransport({
      host: 'smtp.sendgrid.net', port: 587,
      auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY },
    });
    const info = await t.sendMail({
      from: `"JAMB Test" <${process.env.SENDGRID_FROM_EMAIL || 'noreply@jamb.gov.ng'}>`,
      to: 'roqeebateniolailiasu@gmail.com',
      subject: 'JAMB Email Test',
      html: '<p>✅ Email is working from JAMB CBT API.</p>',
    });
    return res.json({ ...result, status: 'sent', messageId: info.messageId, response: info.response });
  } catch (err: any) {
    return res.json({ ...result, status: 'failed', error: err.message, code: err.code });
  }
});


// ── Test notifications (public — remove after confirming works)
app.get('/test-notifications', async (_req, res) => {
  const results: any = {
    env: {
      twilio_sid_set: !!process.env.TWILIO_ACCOUNT_SID,
      twilio_token_set: !!process.env.TWILIO_AUTH_TOKEN,
      twilio_from_set: !!process.env.TWILIO_FROM_NUMBER,
      twilio_from: process.env.TWILIO_FROM_NUMBER || 'NOT SET',
      sendgrid_set: !!process.env.SENDGRID_API_KEY,
      sendgrid_from: process.env.SENDGRID_FROM_EMAIL || 'NOT SET',
    },
    sms: null,
    email: null,
  };

  // Test SMS
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
    try {
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const msg = await client.messages.create({
        body: 'JAMB CBT Test: Notification system is working correctly.',
        from: process.env.TWILIO_FROM_NUMBER,
        to: '+2349160420100',
      });
      results.sms = { status: 'sent', sid: msg.sid, to: '+2349160420100' };
    } catch (err: any) {
      results.sms = { status: 'failed', error: err.message, code: err.code };
    }
  } else {
    results.sms = { status: 'skipped', reason: 'Twilio env vars not set' };
  }

  // Test Email
  if (process.env.SENDGRID_API_KEY) {
    try {
      const nodemailer = require('nodemailer');
      const t = nodemailer.createTransport({
        host: 'smtp.sendgrid.net', port: 587,
        auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY },
      });
      await t.sendMail({
        from: `"JAMB Test" <${process.env.SENDGRID_FROM_EMAIL || 'noreply@jamb.gov.ng'}>`,
        to: 'Idrispopoola02@gmail.com',
        subject: 'JAMB CBT — Notification Test',
        html: '<p>✅ Email notification system is working correctly from JAMB CBT API.</p>',
      });
      results.email = { status: 'sent', to: 'Idrispopoola02@gmail.com' };
    } catch (err: any) {
      results.email = { status: 'failed', error: err.message };
    }
  } else {
    results.email = { status: 'skipped', reason: 'SENDGRID_API_KEY not set' };
  }

  return res.json(results);
});

// ── Keep Neon DB alive (v3 — build 1778768553) (pings every 4 min — Neon pauses after 5 min idle)
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
