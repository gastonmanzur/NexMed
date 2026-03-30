import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const organizationAccessLinkStatuses = ['active', 'rotated', 'disabled'] as const;

const organizationAccessLinkSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', unique: true, index: true },
    token: { type: String, required: true, unique: true, index: true, trim: true },
    status: { type: String, enum: organizationAccessLinkStatuses, default: 'active' }
  },
  { timestamps: true }
);

export type OrganizationAccessLinkDocument = InferSchemaType<typeof organizationAccessLinkSchema> & { _id: mongoose.Types.ObjectId };

export const OrganizationAccessLinkModel: Model<OrganizationAccessLinkDocument> = mongoose.model<OrganizationAccessLinkDocument>(
  'OrganizationAccessLink',
  organizationAccessLinkSchema
);
