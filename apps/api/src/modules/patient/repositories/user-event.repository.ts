import type { UserEventDto } from '@starter/shared-types';
import { UserEventModel, type UserEventDocument } from '../models/user-event.model.js';

interface CreateUserEventInput {
  userId: string;
  organizationId?: string | null;
  type: UserEventDto['type'];
  title: string;
  body?: string | null;
}

export class UserEventRepository {
  async create(input: CreateUserEventInput): Promise<UserEventDocument> {
    return UserEventModel.create({
      userId: input.userId,
      organizationId: input.organizationId ?? null,
      type: input.type,
      title: input.title,
      body: input.body ?? null
    });
  }

  async listByUser(userId: string, limit = 50): Promise<UserEventDocument[]> {
    return UserEventModel.find({ userId }).sort({ createdAt: -1 }).limit(limit).exec();
  }

  async markAllRead(userId: string): Promise<void> {
    await UserEventModel.updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } }).exec();
  }
}
