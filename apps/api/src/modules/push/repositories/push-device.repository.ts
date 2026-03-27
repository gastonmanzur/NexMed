import mongoose from 'mongoose';
import { PushDeviceModel, type PushChannel, type PushDeviceDocument, type PushPlatform } from '../models/push-device.model.js';

export interface UpsertPushDeviceInput {
  userId: string;
  token: string;
  channel: PushChannel;
  platform: PushPlatform;
  deviceName?: string | undefined;
  appVersion?: string | undefined;
  osVersion?: string | undefined;
  userAgent?: string | undefined;
}

export class PushDeviceRepository {
  async upsert(input: UpsertPushDeviceInput): Promise<PushDeviceDocument> {
    const now = new Date();

    return PushDeviceModel.findOneAndUpdate(
      { token: input.token },
      {
        $set: {
          userId: new mongoose.Types.ObjectId(input.userId),
          channel: input.channel,
          platform: input.platform,
          status: 'active',
          deviceName: input.deviceName,
          appVersion: input.appVersion,
          osVersion: input.osVersion,
          userAgent: input.userAgent,
          lastSeenAt: now,
          invalidatedAt: null
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).orFail();
  }

  async refreshToken(userId: string, oldToken: string, newToken: string): Promise<PushDeviceDocument | null> {
    const found = await PushDeviceModel.findOne({ userId, token: oldToken, status: 'active' });
    if (!found) {
      return null;
    }

    await PushDeviceModel.updateOne({ token: newToken }, { $set: { status: 'revoked', invalidatedAt: new Date() } });

    found.token = newToken;
    found.lastSeenAt = new Date();
    found.status = 'active';
    found.invalidatedAt = null;
    await found.save();

    return found;
  }

  async listByUser(userId: string): Promise<PushDeviceDocument[]> {
    return PushDeviceModel.find({ userId }).sort({ createdAt: -1 });
  }

  async deleteByToken(userId: string, token: string): Promise<boolean> {
    const result = await PushDeviceModel.deleteOne({ userId, token });
    return result.deletedCount > 0;
  }

  async invalidateToken(token: string): Promise<void> {
    await PushDeviceModel.updateOne({ token }, { $set: { status: 'invalid', invalidatedAt: new Date() } });
  }

  async getActiveTokensByUser(userId: string): Promise<string[]> {
    const devices = await PushDeviceModel.find({ userId, status: 'active' }, { token: 1 }).lean();
    return devices.map((device) => device.token);
  }
}
