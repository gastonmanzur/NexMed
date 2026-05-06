import type { App } from 'firebase-admin/app';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, type BatchResponse, type Message } from 'firebase-admin/messaging';
import { env } from '../../../config/env.js';
import { logger } from '../../../config/logger.js';
import { AppError } from '../../../core/errors.js';
import type { PushDeliveryResult, PushMessage, PushProvider } from './push-provider.js';

const INVALID_TOKEN_CODES = new Set(['messaging/invalid-registration-token', 'messaging/registration-token-not-registered']);

export class FcmPushProvider implements PushProvider {
  private readonly app: App;
  private readonly projectId: string;
  private readonly clientEmail: string;

  constructor() {
    if (!env.FCM_PROJECT_ID || !env.FCM_CLIENT_EMAIL || !env.FCM_PRIVATE_KEY) {
      throw new AppError('PUSH_PROVIDER_MISCONFIGURED', 500, 'FCM credentials are not configured');
    }

    this.projectId = env.FCM_PROJECT_ID.trim();
    this.clientEmail = env.FCM_CLIENT_EMAIL.trim();
    const parsedPrivateKey = env.FCM_PRIVATE_KEY.replace(/\\n/g, '\n').trim();

    if (this.projectId.includes('.apps.googleusercontent.com')) {
      throw new AppError('PUSH_PROVIDER_MISCONFIGURED', 500, 'FCM_PROJECT_ID must be a Firebase project ID, not an OAuth client ID');
    }

    if (!this.clientEmail.endsWith(`@${this.projectId}.iam.gserviceaccount.com`)) {
      throw new AppError('PUSH_PROVIDER_MISCONFIGURED', 500, 'FCM_CLIENT_EMAIL does not match FCM_PROJECT_ID');
    }

    if (!parsedPrivateKey.includes('BEGIN PRIVATE KEY') || !parsedPrivateKey.includes('END PRIVATE KEY')) {
      throw new AppError('PUSH_PROVIDER_MISCONFIGURED', 500, 'FCM_PRIVATE_KEY is malformed');
    }

    const appName = `push-fcm-${this.projectId}`;
    this.app =
      getApps().find((candidate) => candidate.name === appName) ??
      initializeApp({
        credential: cert({
          projectId: this.projectId,
          clientEmail: this.clientEmail,
          privateKey: parsedPrivateKey
        }),
        projectId: this.projectId
      }, appName);

    logger.info(
      {
        push: {
          provider: 'fcm',
          firebaseProjectId: this.projectId,
          firebaseClientEmail: this.clientEmail,
          firebaseAppName: this.app.name
        }
      },
      'Initialized Firebase Admin for push delivery'
    );
  }

  getProviderInfo(): Record<string, string | null> {
    return {
      provider: 'fcm',
      firebaseProjectId: this.projectId,
      firebaseAppName: this.app.name
    };
  }

  private sanitizeToken(token: string): string {
    if (token.length <= 16) return token;
    return `${token.slice(0, 8)}...${token.slice(-8)}`;
  }

  private buildMessage(message: PushMessage): Message {
    return {
      token: message.token,
      notification: { title: message.title, body: message.body },
      webpush: {
        headers: { Urgency: 'high' },
        notification: {
          title: message.title,
          body: message.body
        },
        ...(message.data?.link ? { fcmOptions: { link: message.data.link } } : {})
      },
      ...(message.data ? { data: message.data } : {})
    };
  }

  async send(messages: PushMessage[]): Promise<PushDeliveryResult[]> {
    if (messages.length === 0) return [];

    const providerMessages: Message[] = messages.map((message) => this.buildMessage(message));
    logger.info(
      {
        push: {
          provider: 'fcm',
          firebaseProjectId: this.projectId,
          firebaseAppName: this.app.name,
          tokens: messages.map((message) => this.sanitizeToken(message.token))
        }
      },
      'Sending push batch through FCM'
    );

    const response = await getMessaging(this.app).sendEach(providerMessages);
    return this.mapResults(messages, response);
  }

  private mapResults(messages: PushMessage[], batch: BatchResponse): PushDeliveryResult[] {
    return batch.responses.map((result, index) => {
      const code = result.error?.code;
      const errorMessage = result.error?.message;
      const token = messages[index]?.token ?? 'unknown';
      return {
        token,
        success: result.success,
        ...(result.messageId ? { providerMessageId: result.messageId } : {}),
        ...(code ? { errorCode: code } : {}),
        ...(errorMessage ? { errorMessage } : {}),
        shouldInvalidateToken: Boolean(code && INVALID_TOKEN_CODES.has(code))
      };
    });
  }
}
