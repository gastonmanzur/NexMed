import type { NextFunction, Request, Response } from 'express';
import { AppError } from './errors.js';

interface Bucket {
  count: number;
  resetAt: number;
}

export const createRateLimiter = (config: { windowMs: number; max: number; keyPrefix: string }) => {
  const buckets = new Map<string, Bucket>();

  return (req: Request, _res: Response, next: NextFunction): void => {
    const now = Date.now();
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${config.keyPrefix}:${clientIp}:${req.path}`;
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + config.windowMs });
      next();
      return;
    }

    if (existing.count >= config.max) {
      next(new AppError('RATE_LIMITED', 429, 'Too many requests, please try again later'));
      return;
    }

    existing.count += 1;
    next();
  };
};
