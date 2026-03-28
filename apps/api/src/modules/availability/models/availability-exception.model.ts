import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const availabilityExceptionTypes = ['full_day_block', 'partial_block'] as const;
export const availabilityExceptionStatuses = ['active', 'inactive', 'archived'] as const;

const availabilityExceptionSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
    professionalId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Professional', index: true },
    date: { type: String, required: true, trim: true, index: true },
    type: { type: String, enum: availabilityExceptionTypes, required: true, index: true },
    startTime: { type: String, required: false, trim: true },
    endTime: { type: String, required: false, trim: true },
    reason: { type: String, required: false, trim: true },
    status: { type: String, enum: availabilityExceptionStatuses, default: 'active', index: true }
  },
  { timestamps: true }
);

availabilityExceptionSchema.index({ organizationId: 1, professionalId: 1, date: 1, status: 1 });

export type AvailabilityExceptionDocument = InferSchemaType<typeof availabilityExceptionSchema> & { _id: mongoose.Types.ObjectId };

export const AvailabilityExceptionModel: Model<AvailabilityExceptionDocument> = mongoose.model<AvailabilityExceptionDocument>(
  'AvailabilityException',
  availabilityExceptionSchema
);
