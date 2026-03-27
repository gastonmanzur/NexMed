import { ActionTokenModel, type ActionTokenDocument } from '../models/action-token.model.js';

export type ActionTokenType = 'verify_email' | 'reset_password';

export class ActionTokenRepository {
  async create(input: {
    userId: string;
    tokenHash: string;
    type: ActionTokenType;
    expiresAt: Date;
  }): Promise<ActionTokenDocument> {
    return ActionTokenModel.create(input);
  }

  async findActiveByHash(tokenHash: string, type: ActionTokenType): Promise<ActionTokenDocument | null> {
    return ActionTokenModel.findOne({ tokenHash, type, consumedAt: null, expiresAt: { $gt: new Date() } }).exec();
  }

  async consumeByHash(tokenHash: string): Promise<void> {
    await ActionTokenModel.updateOne({ tokenHash, consumedAt: null }, { $set: { consumedAt: new Date() } }).exec();
  }

  async consumeByUser(userId: string, type: ActionTokenType): Promise<void> {
    await ActionTokenModel.updateMany({ userId, type, consumedAt: null }, { $set: { consumedAt: new Date() } }).exec();
  }
}
