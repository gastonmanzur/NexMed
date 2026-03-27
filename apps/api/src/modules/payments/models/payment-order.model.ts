import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const orderTypes = ['one_time', 'subscription'] as const;
export const internalPaymentStatuses = ['pending', 'approved', 'rejected', 'cancelled', 'refunded', 'in_process'] as const;

const paymentOrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: orderTypes, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'ARS' },
    status: { type: String, enum: internalPaymentStatuses, required: true, default: 'pending' },
    externalReference: { type: String, required: true, unique: true },
    provider: { type: String, required: true, default: 'mercadopago' },
    providerOrderId: { type: String, required: false },
    providerPreferenceId: { type: String, required: false },
    metadata: { type: mongoose.Schema.Types.Mixed, required: false }
  },
  { timestamps: true }
);

export type PaymentOrderDocument = InferSchemaType<typeof paymentOrderSchema> & { _id: mongoose.Types.ObjectId };
export const PaymentOrderModel: Model<PaymentOrderDocument> = mongoose.model<PaymentOrderDocument>('PaymentOrder', paymentOrderSchema);
