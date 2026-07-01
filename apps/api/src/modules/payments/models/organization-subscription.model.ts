import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const organizationSubscriptionStatuses = ['trial', 'active', 'past_due', 'suspended', 'canceled'] as const;
export const billingModes = ['standard', 'complimentary', 'not_applicable'] as const;
export const billingExemptionReasons = ['internal_admin', 'test_account', 'manual'] as const;

const organizationSubscriptionSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true, unique: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true, index: true },
    provider: { type: String, required: true, default: 'manual' },
    providerReference: { type: String, required: false },
    status: { type: String, enum: organizationSubscriptionStatuses, required: true, default: 'trial' },
    startedAt: { type: Date, required: false },
    expiresAt: { type: Date, required: false },
    autoRenew: { type: Boolean, required: false, default: true },
    discountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Discount', required: false },
    discountCode: { type: String, required: false, trim: true, uppercase: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: false },
    discountValue: { type: Number, required: false, min: 0 },
    discountAmount: { type: Number, required: false, min: 0 },
    originalAmount: { type: Number, required: false, min: 0 },
    finalAmount: { type: Number, required: false, min: 0 },
    billingMode: { type: String, enum: billingModes, required: true, default: 'standard', index: true },
    billingExemptionReason: { type: String, enum: billingExemptionReasons, required: false },
    billingExemptAt: { type: Date, required: false },
    discountAppliedAt: { type: Date, required: false },
    discountAppliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }
  },
  { timestamps: true }
);

export type OrganizationSubscriptionDocument = InferSchemaType<typeof organizationSubscriptionSchema> & { _id: mongoose.Types.ObjectId };
export const OrganizationSubscriptionModel: Model<OrganizationSubscriptionDocument> = mongoose.model<OrganizationSubscriptionDocument>(
  'OrganizationSubscription',
  organizationSubscriptionSchema
);
