import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const discountRedemptionStatuses = ['checkout_created', 'active'] as const;

const discountRedemptionSchema = new mongoose.Schema(
  {
    discountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Discount', required: true, index: true },
    discountCode: { type: String, required: true, trim: true, uppercase: true, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true, index: true },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationSubscription', required: false, index: true },
    appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, required: true, min: 0 },
    originalAmount: { type: Number, required: true, min: 0 },
    finalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true, uppercase: true },
    provider: { type: String, required: true, enum: ['mercadopago', 'internal'] },
    providerReference: { type: String, required: false, index: true },
    status: { type: String, enum: discountRedemptionStatuses, required: true },
    appliedAt: { type: Date, required: true, default: Date.now }
  },
  { timestamps: true }
);

discountRedemptionSchema.index({ discountId: 1, organizationId: 1, status: 1 });
discountRedemptionSchema.index({ provider: 1, providerReference: 1 });

export type DiscountRedemptionDocument = InferSchemaType<typeof discountRedemptionSchema> & { _id: mongoose.Types.ObjectId };
export const DiscountRedemptionModel: Model<DiscountRedemptionDocument> = mongoose.model<DiscountRedemptionDocument>(
  'DiscountRedemption',
  discountRedemptionSchema
);
