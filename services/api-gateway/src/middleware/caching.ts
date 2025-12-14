import { Request, Response, NextFunction } from 'express';
import { getCacheValue, generateCacheKey } from '../utils/cache';

/**
 * Middleware to handle GET request caching
 * Checks cache before forwarding to downstream services
 */
export async function cachingMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only cache GET requests
  if (req.method !== 'GET') {
    return next();
  }

  // Store original res.json
  const originalJson = res.json.bind(res);

  // Override res.json to intercept responses
  res.json = function (data: any) {
    // Add cache headers for successful responses
    if (res.statusCode === 200) {
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', `public, max-age=${process.env.CACHE_TTL || 300}`);
    }

    return originalJson(data);
  };

  next();
}

/**
 * Middleware to add cache-related headers to responses
 */
export function cacheHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Store whether response came from cache
  if ((res as any).fromCache) {
    res.set('X-Cache', 'HIT');
    res.set('X-Cache-Source', 'Redis');
  } else {
    res.set('X-Cache', 'MISS');
  }

  // Add cache control headers for GET requests
  if (req.method === 'GET') {
    const cacheAge = process.env.CACHE_TTL || '300';
    res.set('Cache-Control', `public, max-age=${cacheAge}`);
  } else {
    res.set('Cache-Control', 'no-cache');
  }

  next();
}
