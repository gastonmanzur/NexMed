import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const availabilityRuleStatuses = ['active', 'inactive', 'archived'] as const;

const availabilityRuleSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
    professionalId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Professional', index: true },
    weekday: { type: Number, required: true, min: 0, max: 6, index: true },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    appointmentDurationMinutes: { type: Number, required: true, min: 1 },
    bufferMinutes: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: availabilityRuleStatuses, default: 'active', index: true }
  },
  { timestamps: true }
);

availabilityRuleSchema.index({ organizationId: 1, professionalId: 1, weekday: 1, status: 1 });

export type AvailabilityRuleDocument = InferSchemaType<typeof availabilityRuleSchema> & { _id: mongoose.Types.ObjectId };

export const AvailabilityRuleModel: Model<AvailabilityRuleDocument> = mongoose.model<AvailabilityRuleDocument>(
  'AvailabilityRule',
  availabilityRuleSchema
);
