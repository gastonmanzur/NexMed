import { ProfessionalAccessInviteModel, type ProfessionalAccessInviteDocument } from '../models/professional-access-invite.model.js';

export class ProfessionalAccessInviteRepository {
  async revokePendingForProfessional(organizationId: string, professionalId: string): Promise<void> {
    await ProfessionalAccessInviteModel.updateMany(
      { organizationId, professionalId, status: 'pending' },
      { $set: { status: 'revoked', revokedAt: new Date() } }
    ).exec();
  }

  async create(input: {
    organizationId: string;
    professionalId: string;
    userId: string;
    email: string;
    tokenHash: string;
    expiresAt: Date;
    createdByUserId: string;
  }): Promise<ProfessionalAccessInviteDocument> {
    return ProfessionalAccessInviteModel.create(input);
  }

  async findByTokenHash(tokenHash: string): Promise<ProfessionalAccessInviteDocument | null> {
    return ProfessionalAccessInviteModel.findOne({ tokenHash }).exec();
  }

  async accept(inviteId: string): Promise<void> {
    await ProfessionalAccessInviteModel.updateOne({ _id: inviteId }, { $set: { status: 'accepted', acceptedAt: new Date() } }).exec();
  }

  async expire(inviteId: string): Promise<void> {
    await ProfessionalAccessInviteModel.updateOne({ _id: inviteId }, { $set: { status: 'expired' } }).exec();
  }
}
