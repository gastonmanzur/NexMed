import { env } from '../../../config/env.js';
import { logger } from '../../../config/logger.js';
import { ReminderService } from './reminder.service.js';

export class ReminderWorkerService {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  constructor(private readonly reminders = new ReminderService()) {}

  start(): void {
    if (!env.REMINDER_WORKER_ENABLED || this.timer) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, env.REMINDER_WORKER_INTERVAL_MS);
    void this.tick();
    logger.info({ intervalMs: env.REMINDER_WORKER_INTERVAL_MS }, 'reminder worker started');
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.reminders.runDueReminders(new Date());
      logger.info({ result }, 'reminder worker tick');
    } catch (error) {
      logger.error({ error }, 'reminder worker tick failed');
    } finally {
      this.running = false;
    }
  }
}
