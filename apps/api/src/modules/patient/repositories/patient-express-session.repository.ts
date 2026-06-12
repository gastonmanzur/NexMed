import { PatientExpressSessionModel, type PatientExpressSessionDocument } from '../models/patient-express-session.model.js';

interface PatientExpressSessionCreateInput {
  patientIdentityId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgentHash?: string | null;
}

export class PatientExpressSessionRepository {
  async create(input: PatientExpressSessionCreateInput): Promise<PatientExpressSessionDocument> {
    return PatientExpressSessionModel.create({
      patientIdentityId: input.patientIdentityId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      userAgentHash: input.userAgentHash ?? null,
      lastUsedAt: new Date(),
      revokedAt: null
    });
  }

  async findByTokenHash(tokenHash: string): Promise<PatientExpressSessionDocument | null> {
    return PatientExpressSessionModel.findOne({ tokenHash, revokedAt: null }).exec();
  }

  async findValidByTokenHash(tokenHash: string, now = new Date()): Promise<PatientExpressSessionDocument | null> {
    return PatientExpressSessionModel.findOne({ tokenHash, revokedAt: null, expiresAt: { $gt: now } }).exec();
  }

  async touch(id: string): Promise<void> {
    await PatientExpressSessionModel.updateOne({ _id: id }, { $set: { lastUsedAt: new Date() } }).exec();
  }
}
