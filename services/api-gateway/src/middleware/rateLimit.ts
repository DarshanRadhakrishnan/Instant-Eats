import { Request, Response, NextFunction } from 'express';

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;

const clientRequests: Record<string, number[]> = {};

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const clientIP = req.ip || 'unknown';
  const now = Date.now();

  if (!clientRequests[clientIP]) {
    clientRequests[clientIP] = [];
  }

  // Remove old requests outside the window
  clientRequests[clientIP] = clientRequests[clientIP].filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW
  );

  if (clientRequests[clientIP].length >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
    });
  }

  clientRequests[clientIP].push(now);
  next();
}
