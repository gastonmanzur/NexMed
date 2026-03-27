import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../../config/env.js';

export interface AccessTokenPayload {
  sub: string;
  role: 'admin' | 'user';
  email: string;
}

export class TokenService {
  generateAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as SignOptions);
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  }

  generateRefreshToken(): string {
    return crypto.randomBytes(48).toString('hex');
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  getRefreshExpiryDate(): Date {
    const ms = this.parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN);
    return new Date(Date.now() + ms);
  }

  getEmailVerificationExpiryDate(): Date {
    return new Date(Date.now() + env.EMAIL_TOKEN_EXPIRES_IN_MINUTES * 60_000);
  }

  getResetPasswordExpiryDate(): Date {
    return new Date(Date.now() + env.RESET_TOKEN_EXPIRES_IN_MINUTES * 60_000);
  }

  private parseDurationToMs(value: string): number {
    const amount = Number.parseInt(value, 10);
    if (value.endsWith('d')) return amount * 24 * 60 * 60 * 1000;
    if (value.endsWith('h')) return amount * 60 * 60 * 1000;
    if (value.endsWith('m')) return amount * 60 * 1000;
    return amount * 1000;
  }
}
