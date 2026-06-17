import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const professionalAccessInviteStatuses = ['pending', 'accepted', 'expired', 'revoked'] as const;

const professionalAccessInviteSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
    professionalId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Professional', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: professionalAccessInviteStatuses, default: 'pending', index: true },
    expiresAt: { type: Date, required: true, index: true },
    acceptedAt: { type: Date, required: false, default: null },
    revokedAt: { type: Date, required: false, default: null },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' }
  },
  { timestamps: true }
);

professionalAccessInviteSchema.index({ organizationId: 1, professionalId: 1, status: 1 });

export type ProfessionalAccessInviteDocument = InferSchemaType<typeof professionalAccessInviteSchema> & { _id: mongoose.Types.ObjectId };
export const ProfessionalAccessInviteModel: Model<ProfessionalAccessInviteDocument> = mongoose.model<ProfessionalAccessInviteDocument>('ProfessionalAccessInvite', professionalAccessInviteSchema);
