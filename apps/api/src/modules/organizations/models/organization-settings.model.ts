import mongoose, { type InferSchemaType, type Model } from 'mongoose';

const organizationSettingsSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, ref: 'Organization', index: true },
    timezone: { type: String, required: true, trim: true },
    locale: { type: String, required: false, trim: true },
    currency: { type: String, required: false, trim: true },
    onboardingStep: { type: String, required: false, trim: true },
    patientCancellationAllowed: { type: Boolean, required: true, default: true },
    patientCancellationHoursLimit: { type: Number, required: true, default: 24, min: 0, max: 720 },
    patientRescheduleAllowed: { type: Boolean, required: true, default: true },
    patientRescheduleHoursLimit: { type: Number, required: true, default: 24, min: 0, max: 720 }
  },
  { timestamps: true }
);

export type OrganizationSettingsDocument = InferSchemaType<typeof organizationSettingsSchema> & { _id: mongoose.Types.ObjectId };

export const OrganizationSettingsModel: Model<OrganizationSettingsDocument> = mongoose.model<OrganizationSettingsDocument>(
  'OrganizationSettings',
  organizationSettingsSchema
);
