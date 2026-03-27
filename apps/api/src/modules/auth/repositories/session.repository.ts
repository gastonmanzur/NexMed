import { SessionModel, type SessionDocument } from '../models/session.model.js';

export class SessionRepository {
  async create(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<SessionDocument> {
    return SessionModel.create(input);
  }

  async findActiveByHash(tokenHash: string): Promise<SessionDocument | null> {
    return SessionModel.findOne({ tokenHash, revokedAt: null, expiresAt: { $gt: new Date() } }).exec();
  }

  async revokeByHash(tokenHash: string): Promise<void> {
    await SessionModel.updateOne({ tokenHash, revokedAt: null }, { $set: { revokedAt: new Date() } }).exec();
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await SessionModel.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } }).exec();
  }
}
