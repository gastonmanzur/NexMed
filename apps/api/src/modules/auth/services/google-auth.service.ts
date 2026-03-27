import { OAuth2Client } from 'google-auth-library';
import { AppError } from '../../../core/errors.js';
import { env } from '../../../config/env.js';

export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  picture: string | null;
}

export class GoogleAuthService {
  private readonly client = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

  async verifyIdToken(idToken: string): Promise<GoogleProfile> {
    if (!this.client || !env.GOOGLE_CLIENT_ID) {
      throw new AppError('GOOGLE_AUTH_NOT_CONFIGURED', 503, 'Google auth is not configured');
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();

      if (!payload?.sub || !payload.email) {
        throw new AppError('INVALID_GOOGLE_TOKEN', 401, 'Invalid Google token');
      }

      return {
        googleId: payload.sub,
        email: payload.email.toLowerCase(),
        emailVerified: Boolean(payload.email_verified),
        picture: typeof payload.picture === 'string' ? payload.picture : null
      };
    } catch (error) {
      console.error('Google token verification failed:', error);
      throw new AppError('INVALID_GOOGLE_TOKEN', 401, 'Invalid Google token');
    }
  }
}
