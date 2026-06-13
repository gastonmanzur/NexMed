import { env } from '../../../config/env.js';
import { logger } from '../../../config/logger.js';
import { WhatsAppNotificationService } from './whatsapp-notification.service.js';

export class WhatsAppNotificationWorkerService {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  constructor(private readonly service = new WhatsAppNotificationService()) {}

  start(): void {
    if (!env.REMINDER_WORKER_ENABLED || this.timer) return;
    this.timer = setInterval(() => void this.tick(), env.REMINDER_WORKER_INTERVAL_MS);
    void this.tick();
    logger.info({ intervalMs: env.REMINDER_WORKER_INTERVAL_MS }, 'whatsapp notification worker started');
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.service.processDueNotifications(new Date());
      logger.info({ result }, 'whatsapp notification worker tick');
    } catch (error) {
      logger.error({ error }, 'whatsapp notification worker tick failed');
    } finally {
      this.running = false;
    }
  }
}
