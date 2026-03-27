import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorMiddleware } from '../../core/error-middleware.js';
import { notFoundMiddleware } from '../../core/not-found-middleware.js';
import { TokenService } from '../auth/services/token.service.js';
import { pushRouter } from './push.routes.js';

const tokenService = new TokenService();

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/push', pushRouter);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
};

describe('push routes guards and validation', () => {
  it('rejects unauthenticated device register', async () => {
    const app = createTestApp();
    const response = await request(app).post('/api/push/devices').send({ token: 't'.repeat(30), platform: 'web', channel: 'web_push' });
    expect(response.status).toBe(401);
  });


  it('rejects unauthenticated send-test call', async () => {
    const app = createTestApp();
    const response = await request(app).post('/api/push/send-test').send({ title: 'test', body: 'body' });
    expect(response.status).toBe(401);
  });

  it('rejects non-admin call to admin send endpoint', async () => {
    const app = createTestApp();
    const userToken = tokenService.generateAccessToken({ sub: 'u1', role: 'user', email: 'user@test.com' });

    const response = await request(app)
      .post('/api/push/admin/send')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ targetUserId: 'u2-userid', title: 't', body: 'b' });

    expect(response.status).toBe(403);
  });

});
