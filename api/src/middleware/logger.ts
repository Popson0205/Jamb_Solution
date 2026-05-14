import { Request, Response, NextFunction } from 'express';
import { db } from '../db';

// ── Request Logger Middleware
// Logs every API request to the request_logs table
// Captures: method, path, status, response time, IP, user agent, body summary, error

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || '';

  // Capture response finish
  res.on('finish', async () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    // Sanitise body — remove sensitive fields
    let bodySummary: string | null = null;
    if (req.body && Object.keys(req.body).length > 0) {
      const safe = { ...req.body };
      delete safe.password;
      delete safe.password_hash;
      bodySummary = JSON.stringify(safe).substring(0, 500);
    }

    // Determine log level
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

    // Extract user from JWT if available
    const user = (req as any).user;
    const userId = user?.id || null;

    try {
      await db('request_logs').insert({
        method: req.method,
        path: req.path,
        query: Object.keys(req.query).length > 0 ? JSON.stringify(req.query).substring(0, 200) : null,
        status_code: status,
        duration_ms: duration,
        ip_address: ip.split(',')[0].trim(),
        user_agent: userAgent.substring(0, 255),
        user_id: userId,
        body_summary: bodySummary,
        level,
        created_at: new Date(),
      });
    } catch {
      // Never let logging crash the app
    }
  });

  next();
}

// ── Error Logger
// Captures unhandled errors with full stack trace
export async function logError(
  error: Error,
  req: Request,
  context?: string
): Promise<void> {
  const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  try {
    await db('request_logs').insert({
      method: req.method,
      path: req.path,
      status_code: 500,
      duration_ms: 0,
      ip_address: ip.split(',')[0].trim(),
      level: 'error',
      body_summary: context ? `${context}: ${error.message}` : error.message,
      user_agent: (req.headers['user-agent'] || '').substring(0, 255),
      created_at: new Date(),
    });
  } catch {
    // Silently fail
  }
}
