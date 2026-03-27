import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const organizationTypes = ['clinic', 'office', 'esthetic_center', 'professional_cabinet', 'other'] as const;
export const organizationStatuses = ['onboarding', 'active', 'inactive'] as const;

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: false, unique: true, sparse: true, trim: true },
    type: { type: String, enum: organizationTypes, required: true },
    contactEmail: { type: String, required: false, trim: true, lowercase: true },
    phone: { type: String, required: false, trim: true },
    address: { type: String, required: false, trim: true },
    city: { type: String, required: false, trim: true },
    country: { type: String, required: false, trim: true },
    status: { type: String, enum: organizationStatuses, default: 'onboarding' },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' }
  },
  { timestamps: true }
);

export type OrganizationDocument = InferSchemaType<typeof organizationSchema> & { _id: mongoose.Types.ObjectId };
export const OrganizationModel: Model<OrganizationDocument> = mongoose.model<OrganizationDocument>('Organization', organizationSchema);
