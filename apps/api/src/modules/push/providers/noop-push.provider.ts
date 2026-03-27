import type { PushDeliveryResult, PushMessage, PushProvider } from './push-provider.js';

export class NoopPushProvider implements PushProvider {
  async send(messages: PushMessage[]): Promise<PushDeliveryResult[]> {
    return messages.map((message) => ({
      token: message.token,
      success: true,
      providerMessageId: 'noop',
      shouldInvalidateToken: false
    }));
  }
}
