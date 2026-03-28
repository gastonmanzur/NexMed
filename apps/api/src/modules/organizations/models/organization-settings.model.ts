import mongoose, { type InferSchemaType, type Model } from 'mongoose';

const organizationSettingsSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, ref: 'Organization', index: true },
    timezone: { type: String, required: true, trim: true },
    locale: { type: String, required: false, trim: true },
    currency: { type: String, required: false, trim: true },
    onboardingStep: { type: String, required: false, trim: true }
  },
  { timestamps: true }
);

export type OrganizationSettingsDocument = InferSchemaType<typeof organizationSettingsSchema> & { _id: mongoose.Types.ObjectId };

export const OrganizationSettingsModel: Model<OrganizationSettingsDocument> = mongoose.model<OrganizationSettingsDocument>(
  'OrganizationSettings',
  organizationSettingsSchema
);
