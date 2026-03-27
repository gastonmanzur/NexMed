import { AppError } from '../../../core/errors.js';
import { UserRepository } from '../../auth/repositories/user.repository.js';
import { type PushChannel, type PushPlatform } from '../models/push-device.model.js';
import { FcmPushProvider } from '../providers/fcm-push.provider.js';
import { NoopPushProvider } from '../providers/noop-push.provider.js';
import type { PushDeliveryResult, PushProvider } from '../providers/push-provider.js';
import { PushDeviceRepository } from '../repositories/push-device.repository.js';
import { env } from '../../../config/env.js';

interface RegisterDeviceInput {
  userId: string;
  token: string;
  channel: PushChannel;
  platform: PushPlatform;
  deviceName?: string | undefined;
  appVersion?: string | undefined;
  osVersion?: string | undefined;
  userAgent?: string | undefined;
}

interface SendToUserInput {
  actorUserId: string;
  actorRole: 'admin' | 'user';
  targetUserId: string;
  title: string;
  body: string;
  data?: Record<string, string> | undefined;
}

export class PushService {
  constructor(
    private readonly devices = new PushDeviceRepository(),
    private readonly users = new UserRepository(),
    private readonly provider: PushProvider = env.PUSH_PROVIDER === 'fcm' ? new FcmPushProvider() : new NoopPushProvider()
  ) {}

  async registerDevice(input: RegisterDeviceInput) {
    await this.assertUserExists(input.userId);
    return this.devices.upsert(input);
  }

  async refreshDeviceToken(userId: string, oldToken: string, newToken: string) {
    if (oldToken === newToken) {
      throw new AppError('INVALID_TOKEN_REFRESH', 400, 'New token must be different from old token');
    }

    const updated = await this.devices.refreshToken(userId, oldToken, newToken);
    if (!updated) {
      throw new AppError('PUSH_DEVICE_NOT_FOUND', 404, 'Push device token not found');
    }

    return updated;
  }

  async unregisterDevice(userId: string, token: string): Promise<void> {
    const deleted = await this.devices.deleteByToken(userId, token);
    if (!deleted) {
      throw new AppError('PUSH_DEVICE_NOT_FOUND', 404, 'Push device token not found');
    }
  }

  async listMyDevices(userId: string) {
    return this.devices.listByUser(userId);
  }

  async sendToUser(input: SendToUserInput) {
    if (input.actorRole !== 'admin' && input.actorUserId !== input.targetUserId) {
      throw new AppError('FORBIDDEN', 403, 'Cannot send notifications to a different user');
    }

    await this.assertUserExists(input.targetUserId);

    const tokens = await this.devices.getActiveTokensByUser(input.targetUserId);
    if (tokens.length === 0) {
      return { sent: 0, failed: 0, invalidatedTokens: 0, results: [] };
    }

    let results: PushDeliveryResult[];
    try {
      results = await this.provider.send(
        tokens.map((token) => ({
          token,
          title: input.title,
          body: input.body,
          ...(input.data ? { data: input.data } : {})
        }))
      );
    } catch {
      throw new AppError('PUSH_PROVIDER_ERROR', 502, 'Push provider request failed');
    }

    const tokensToInvalidate = results.filter((result) => result.shouldInvalidateToken).map((result) => result.token);
    await Promise.all(tokensToInvalidate.map((token) => this.devices.invalidateToken(token)));

    return {
      sent: results.filter((result) => result.success).length,
      failed: results.filter((result) => !result.success).length,
      invalidatedTokens: tokensToInvalidate.length,
      results
    };
  }

  private async assertUserExists(userId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404, 'User not found');
    }
  }
}
