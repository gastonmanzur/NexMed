import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorMiddleware } from './error-middleware.js';
import { createRateLimiter } from './rate-limit-middleware.js';

describe('createRateLimiter', () => {
  it('blocks calls when max is exceeded', async () => {
    const app = express();
    const limiter = createRateLimiter({ keyPrefix: 'test', windowMs: 10_000, max: 2 });

    app.post('/api/test', limiter, (_req, res) => {
      res.status(200).json({ ok: true });
    });
    app.use(errorMiddleware);

    await request(app).post('/api/test').expect(200);
    await request(app).post('/api/test').expect(200);
    await request(app).post('/api/test').expect(429);
  });
});
