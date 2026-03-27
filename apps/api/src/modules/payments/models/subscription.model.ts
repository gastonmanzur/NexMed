import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const subscriptionPeriods = ['monthly', 'yearly'] as const;
export const subscriptionStatuses = ['pending', 'authorized', 'paused', 'cancelled', 'ended'] as const;

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    planCode: { type: String, required: true },
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'ARS' },
    period: { type: String, enum: subscriptionPeriods, required: true },
    status: { type: String, enum: subscriptionStatuses, required: true, default: 'pending' },
    provider: { type: String, required: true, default: 'mercadopago' },
    providerPreapprovalId: { type: String, required: false, unique: true, sparse: true },
    providerInitPoint: { type: String, required: false },
    externalReference: { type: String, required: true, unique: true },
    nextBillingDate: { type: Date, required: false },
    metadata: { type: mongoose.Schema.Types.Mixed, required: false }
  },
  { timestamps: true }
);

export type SubscriptionDocument = InferSchemaType<typeof subscriptionSchema> & { _id: mongoose.Types.ObjectId };
export const SubscriptionModel: Model<SubscriptionDocument> = mongoose.model<SubscriptionDocument>('Subscription', subscriptionSchema);
