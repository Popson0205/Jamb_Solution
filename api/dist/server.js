"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const student_1 = __importDefault(require("./routes/student"));
const logger_1 = require("./middleware/logger");
const admin_1 = __importDefault(require("./routes/admin"));
const db_1 = require("./db");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
const allowedOrigins = [
    process.env.CLIENT_URL,
    process.env.ADMIN_URL,
    /\.onrender\.com$/,
    'http://localhost:5173',
    'http://localhost:5174',
].filter(Boolean);
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        const allowed = allowedOrigins.some((o) => {
            if (!o)
                return false;
            if (o instanceof RegExp)
                return o.test(origin);
            return o === origin;
        });
        if (allowed)
            return callback(null, true);
        console.warn(`CORS blocked: ${origin}`);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
// Preflight must be BEFORE all other middleware
app.options('*', (0, cors_1.default)(corsOptions));
app.use((0, cors_1.default)(corsOptions));
// Trust Render's proxy (fixes X-Forwarded-For rate limit warning)
app.set('trust proxy', 1);
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express_1.default.json());
// ── Request logger — logs every API hit to request_logs table
app.use(logger_1.requestLogger);
app.use('/api/student/register', (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many registration attempts. Please try again later.' },
}));
app.use('/api/student', student_1.default);
app.use('/api/admin', admin_1.default);
app.get('/health', (_req, res) => res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
}));
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
// ── Debug: test email (public — remove after confirming email works)
app.get('/test-email', async (_req, res) => {
    const nodemailer = require('nodemailer');
    const result = {
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
    }
    catch (err) {
        return res.json({ ...result, status: 'failed', error: err.message, code: err.code });
    }
});
// ── Keep Neon DB alive (v3 — build 1778768553) (pings every 4 min — Neon pauses after 5 min idle)
setInterval(async () => {
    try {
        await db_1.db.raw('SELECT 1');
        console.log(`[${new Date().toISOString()}] DB keep-alive OK`);
    }
    catch (err) {
        console.error('DB keep-alive failed:', err.message);
    }
}, 4 * 60 * 1000);
app.listen(PORT, () => console.log(`🚀 JAMB API running on port ${PORT}`));
exports.default = app;
