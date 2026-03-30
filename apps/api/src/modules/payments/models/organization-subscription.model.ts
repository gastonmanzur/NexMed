import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const organizationSubscriptionStatuses = ['trial', 'active', 'past_due', 'suspended', 'canceled'] as const;

const organizationSubscriptionSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true, unique: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true, index: true },
    provider: { type: String, required: true, default: 'manual' },
    providerReference: { type: String, required: false },
    status: { type: String, enum: organizationSubscriptionStatuses, required: true, default: 'trial' },
    startedAt: { type: Date, required: false },
    expiresAt: { type: Date, required: false },
    autoRenew: { type: Boolean, required: false, default: true }
  },
  { timestamps: true }
);

export type OrganizationSubscriptionDocument = InferSchemaType<typeof organizationSubscriptionSchema> & { _id: mongoose.Types.ObjectId };
export const OrganizationSubscriptionModel: Model<OrganizationSubscriptionDocument> = mongoose.model<OrganizationSubscriptionDocument>(
  'OrganizationSubscription',
  organizationSubscriptionSchema
);
