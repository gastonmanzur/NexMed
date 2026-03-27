import { createHash } from 'node:crypto';
import { WebhookEventModel } from '../models/webhook-event.model.js';

export class WebhookEventRepository {
  async registerIfFirst(provider: string, eventKey: string, topic: string, payload: unknown): Promise<boolean> {
    try {
      const payloadHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
      await WebhookEventModel.create({ provider, eventKey, topic, payloadHash });
      return true;
    } catch {
      return false;
    }
  }
}
