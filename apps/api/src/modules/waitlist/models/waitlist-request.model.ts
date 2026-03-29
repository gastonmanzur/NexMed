import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const waitlistStatuses = ['active', 'matched', 'inactive', 'expired', 'canceled'] as const;

const waitlistRequestSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
    patientProfileId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'PatientProfile', index: true },
    specialtyId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Specialty', default: null, index: true },
    professionalId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Professional', default: null, index: true },
    startDate: { type: String, required: true, trim: true, index: true },
    endDate: { type: String, required: true, trim: true, index: true },
    timeWindowStart: { type: String, required: false, trim: true, default: null },
    timeWindowEnd: { type: String, required: false, trim: true, default: null },
    status: { type: String, enum: waitlistStatuses, default: 'active', index: true },
    matchedAt: { type: Date, required: false, default: null },
    lastNotifiedAt: { type: Date, required: false, default: null }
  },
  { timestamps: true }
);

waitlistRequestSchema.index({ organizationId: 1, status: 1, startDate: 1, endDate: 1 });

export type WaitlistRequestDocument = InferSchemaType<typeof waitlistRequestSchema> & { _id: mongoose.Types.ObjectId };

export const WaitlistRequestModel: Model<WaitlistRequestDocument> = mongoose.model<WaitlistRequestDocument>('WaitlistRequest', waitlistRequestSchema);
