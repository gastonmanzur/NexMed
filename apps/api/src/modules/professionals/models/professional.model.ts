import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const professionalStatuses = ['active', 'inactive', 'archived'] as const;

const professionalSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    displayName: { type: String, required: false, trim: true },
    email: { type: String, required: false, trim: true, lowercase: true },
    phone: { type: String, required: false, trim: true },
    licenseNumber: { type: String, required: false, trim: true },
    notes: { type: String, required: false, trim: true },
    status: { type: String, enum: professionalStatuses, default: 'active', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'User', default: null }
  },
  { timestamps: true }
);

professionalSchema.index({ organizationId: 1, lastName: 1, firstName: 1 });

export type ProfessionalDocument = InferSchemaType<typeof professionalSchema> & { _id: mongoose.Types.ObjectId };

export const ProfessionalModel: Model<ProfessionalDocument> = mongoose.model<ProfessionalDocument>('Professional', professionalSchema);
