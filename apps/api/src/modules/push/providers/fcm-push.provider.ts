import type { App } from 'firebase-admin/app';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, type BatchResponse, type Message } from 'firebase-admin/messaging';
import { env } from '../../../config/env.js';
import { AppError } from '../../../core/errors.js';
import type { PushDeliveryResult, PushMessage, PushProvider } from './push-provider.js';

const INVALID_TOKEN_CODES = new Set(['messaging/invalid-registration-token', 'messaging/registration-token-not-registered']);

export class FcmPushProvider implements PushProvider {
  private readonly app: App;

  constructor() {
    if (!env.FCM_PROJECT_ID || !env.FCM_CLIENT_EMAIL || !env.FCM_PRIVATE_KEY) {
      throw new AppError('PUSH_PROVIDER_MISCONFIGURED', 500, 'FCM credentials are not configured');
    }

    this.app =
      getApps()[0] ??
      initializeApp({
        credential: cert({
          projectId: env.FCM_PROJECT_ID,
          clientEmail: env.FCM_CLIENT_EMAIL,
          privateKey: env.FCM_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
  }

  async send(messages: PushMessage[]): Promise<PushDeliveryResult[]> {
    if (messages.length === 0) return [];

    const providerMessages: Message[] = messages.map((message) => ({
      token: message.token,
      notification: { title: message.title, body: message.body },
      webpush: {
        notification: {
          title: message.title,
          body: message.body
        },
        ...(message.data?.link ? { fcmOptions: { link: message.data.link } } : {})
      },
      ...(message.data ? { data: message.data } : {})
    }));

    const response = await getMessaging(this.app).sendEach(providerMessages);
    return this.mapResults(messages, response);
  }

  private mapResults(messages: PushMessage[], batch: BatchResponse): PushDeliveryResult[] {
    return batch.responses.map((result, index) => {
      const code = result.error?.code;
      const token = messages[index]?.token ?? 'unknown';
      return {
        token,
        success: result.success,
        ...(result.messageId ? { providerMessageId: result.messageId } : {}),
        ...(code ? { errorCode: code } : {}),
        shouldInvalidateToken: Boolean(code && INVALID_TOKEN_CODES.has(code))
      };
    });
  }
}
