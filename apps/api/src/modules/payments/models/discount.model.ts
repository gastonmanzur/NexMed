import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const discountTypes = ['percentage', 'fixed'] as const;

const discountSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, index: true },
    discountType: { type: String, enum: discountTypes, required: true },
    discountValue: { type: Number, required: true, min: 0 },
    currency: { type: String, required: false, trim: true, maxlength: 10 },
    appliesToPlanIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: false }],
    onlyForNewOrganizations: { type: Boolean, required: true, default: false },
    onlyDuringTrial: { type: Boolean, required: true, default: false },
    maxRedemptions: { type: Number, required: false, min: 1 },
    maxRedemptionsPerOrganization: { type: Number, required: false, min: 1 },
    redemptionCount: { type: Number, required: true, default: 0, min: 0 },
    startsAt: { type: Date, required: false },
    endsAt: { type: Date, required: false },
    isActive: { type: Boolean, required: true, default: true }
  },
  { timestamps: true }
);

export type DiscountDocument = InferSchemaType<typeof discountSchema> & { _id: mongoose.Types.ObjectId };
export const DiscountModel: Model<DiscountDocument> = mongoose.model<DiscountDocument>('Discount', discountSchema);
