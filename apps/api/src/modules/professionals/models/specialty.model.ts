import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const specialtyStatuses = ['active', 'inactive', 'archived'] as const;

const specialtySchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: false, trim: true },
    status: { type: String, enum: specialtyStatuses, default: 'active', index: true }
  },
  { timestamps: true }
);

specialtySchema.index({ organizationId: 1, name: 1 }, { unique: true });

export type SpecialtyDocument = InferSchemaType<typeof specialtySchema> & { _id: mongoose.Types.ObjectId };

export const SpecialtyModel: Model<SpecialtyDocument> = mongoose.model<SpecialtyDocument>('Specialty', specialtySchema);
