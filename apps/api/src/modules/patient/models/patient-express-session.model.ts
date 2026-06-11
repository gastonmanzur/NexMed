import mongoose, { type InferSchemaType, type Model } from 'mongoose';

const patientExpressSessionSchema = new mongoose.Schema(
  {
    patientIdentityId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'PatientIdentity', index: true },
    tokenHash: { type: String, required: true, trim: true, unique: true, index: true },
    lastUsedAt: { type: Date, required: true, default: () => new Date() },
    expiresAt: { type: Date, required: true },
    userAgentHash: { type: String, required: false, trim: true, default: null },
    revokedAt: { type: Date, required: false, default: null }
  },
  { timestamps: true }
);

patientExpressSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
patientExpressSessionSchema.index({ patientIdentityId: 1, revokedAt: 1, expiresAt: 1 });

export type PatientExpressSessionDocument = InferSchemaType<typeof patientExpressSessionSchema> & { _id: mongoose.Types.ObjectId };

export const PatientExpressSessionModel: Model<PatientExpressSessionDocument> = mongoose.model<PatientExpressSessionDocument>(
  'PatientExpressSession',
  patientExpressSessionSchema
);
