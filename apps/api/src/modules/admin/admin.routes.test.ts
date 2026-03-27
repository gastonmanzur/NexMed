import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorMiddleware } from '../../core/error-middleware.js';
import { notFoundMiddleware } from '../../core/not-found-middleware.js';
import { TokenService } from '../auth/services/token.service.js';
import { adminRouter } from './admin.routes.js';

const tokenService = new TokenService();

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
};

describe('admin routes guards and validation', () => {
  it('rejects unauthenticated access', async () => {
    const app = createTestApp();
    const response = await request(app).get('/api/admin/dashboard');
    expect(response.status).toBe(401);
  });

  it('rejects non-admin access', async () => {
    const app = createTestApp();
    const userToken = tokenService.generateAccessToken({ sub: 'u1', role: 'user', email: 'user@test.com' });

    const response = await request(app).get('/api/admin/payments').set('Authorization', `Bearer ${userToken}`);
    expect(response.status).toBe(403);
  });

  it('validates notification payload for admins', async () => {
    const app = createTestApp();
    const adminToken = tokenService.generateAccessToken({ sub: 'u1u1u1u1', role: 'admin', email: 'admin@test.com' });

    const response = await request(app)
      .post('/api/admin/notifications/send')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ targetUserId: 'x', title: '', body: '' });

    expect(response.status).toBe(400);
  });
});
