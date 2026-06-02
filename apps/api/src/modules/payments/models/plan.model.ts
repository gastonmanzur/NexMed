import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const planStatuses = ['active', 'inactive'] as const;

const planSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    displayPriceUsd: { type: Number, required: true, min: 0, default: 0 },
    billingPriceArs: { type: Number, required: true, min: 0, default: 0 },
    displayCurrency: { type: String, required: true, enum: ['USD'], default: 'USD', trim: true },
    billingCurrency: { type: String, required: true, enum: ['ARS'], default: 'ARS', trim: true },
    price: { type: Number, required: true, min: 0, default: 0 },
    currency: { type: String, required: true, default: 'ARS', trim: true },
    maxProfessionalsActive: { type: Number, required: true, min: 1 },
    status: { type: String, enum: planStatuses, required: true, default: 'active' },
    description: { type: String, required: false, trim: true },
    isRecommended: { type: Boolean, required: true, default: false }
  },
  { timestamps: true }
);

export type PlanDocument = InferSchemaType<typeof planSchema> & { _id: mongoose.Types.ObjectId };
export const PlanModel: Model<PlanDocument> = mongoose.model<PlanDocument>('Plan', planSchema);
