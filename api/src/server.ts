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

app.use(helmet());
app.use(cors({
  origin: [process.env.CLIENT_URL || 'http://localhost:5173', process.env.ADMIN_URL || 'http://localhost:5174'],
  credentials: true,
}));
app.use(express.json());
app.use('/api/student/register', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many requests' }));

app.use('/api/student', studentRouter);
app.use('/api/admin', adminRouter);
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.listen(PORT, () => console.log(`🚀 JAMB API running on port ${PORT}`));
export default app;
