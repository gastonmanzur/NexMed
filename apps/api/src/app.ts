import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorMiddleware } from './core/error-middleware.js';
import { notFoundMiddleware } from './core/not-found-middleware.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { avatarRouter } from './modules/avatar/avatar.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { pushRouter } from './modules/push/push.routes.js';
import { paymentsRouter } from './modules/payments/payments.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';

export const createApp = () => {
  const app = express();

  app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.CORS_ORIGIN.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error('Not allowed by CORS'));
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.use(
    env.AVATAR_PUBLIC_BASE_PATH,
    express.static(path.resolve(process.cwd(), env.AVATAR_STORAGE_DIR), {
      fallthrough: false,
      index: false,
      immutable: true,
      maxAge: '7d'
    })
  );

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/avatars', avatarRouter);
  app.use('/api/push', pushRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/admin', adminRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};
