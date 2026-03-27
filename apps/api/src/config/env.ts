import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const envFileCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'apps/api/.env'),
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env')
];

for (const envPath of envFileCandidates) {
  dotenv.config({ path: envPath, override: false });
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    MONGO_URI: z.string().min(1).default('mongodb://localhost:27017/starter'),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    EMAIL_TOKEN_EXPIRES_IN_MINUTES: z.coerce.number().int().positive().default(60),
    RESET_TOKEN_EXPIRES_IN_MINUTES: z.coerce.number().int().positive().default(30),
    APP_BASE_URL: z.string().url().default('http://localhost:4000'),
    WEB_BASE_URL: z.string().url().default('http://localhost:5173'),
    AVATAR_STORAGE_DIR: z.string().default('storage/avatars'),
    AVATAR_PUBLIC_BASE_PATH: z.string().default('/media/avatars'),
    AVATAR_MAX_SIZE_BYTES: z.coerce.number().int().positive().default(2_097_152),
    GOOGLE_CLIENT_ID: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().email().default('no-reply@example.com'),
    PUSH_PROVIDER: z.enum(['noop', 'fcm']).default('noop'),
    FCM_PROJECT_ID: z.string().optional(),
    FCM_CLIENT_EMAIL: z.string().optional(),
    FCM_PRIVATE_KEY: z.string().optional(),
    MONETIZATION_MODE: z.enum(['one_time_only', 'subscriptions_only', 'both']).default('both'),
    SUBSCRIPTION_PERIOD_MODE: z.enum(['monthly', 'yearly', 'both']).default('both'),
    MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),
    MP_ACCESS_TOKEN: z.string().optional(),
    MP_PUBLIC_KEY: z.string().optional(),
    MERCADOPAGO_WEBHOOK_SECRET: z.string().optional(),
    MP_WEBHOOK_SECRET: z.string().optional(),
    MERCADOPAGO_API_BASE_URL: z.string().url().default('https://api.mercadopago.com'),
    MERCADOPAGO_CHECKOUT_SUCCESS_URL: z.string().url().optional(),
    MERCADOPAGO_CHECKOUT_FAILURE_URL: z.string().url().optional(),
    MERCADOPAGO_CHECKOUT_PENDING_URL: z.string().url().optional(),
    MERCADOPAGO_STATEMENT_DESCRIPTOR: z.string().max(16).optional(),
    AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
    WEBHOOK_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    WEBHOOK_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
    PUSH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    PUSH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(40)
  })
  .transform((data) => {
    const corsOrigins = data.CORS_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    for (const origin of corsOrigins) {
      z.string().url().parse(origin);
    }

    return {
      ...data,
      MERCADOPAGO_ACCESS_TOKEN: data.MERCADOPAGO_ACCESS_TOKEN ?? data.MP_ACCESS_TOKEN,
      MERCADOPAGO_WEBHOOK_SECRET: data.MERCADOPAGO_WEBHOOK_SECRET ?? data.MP_WEBHOOK_SECRET,
      CORS_ORIGIN: corsOrigins.length > 0 ? corsOrigins : [data.WEB_BASE_URL]
    };
  })
  .superRefine((data, ctx) => {
    if (data.PUSH_PROVIDER === 'fcm' && (!data.FCM_PROJECT_ID || !data.FCM_CLIENT_EMAIL || !data.FCM_PRIVATE_KEY)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'FCM credentials are required when PUSH_PROVIDER=fcm' });
    }

    if (data.NODE_ENV === 'production' && !data.MERCADOPAGO_WEBHOOK_SECRET) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'MERCADOPAGO_WEBHOOK_SECRET is required in production' });
    }
  });

export const env = envSchema.parse(process.env);
