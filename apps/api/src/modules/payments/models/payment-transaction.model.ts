import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import { internalPaymentStatuses } from './payment-order.model.js';

const paymentTransactionSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentOrder', required: true, index: true },
    provider: { type: String, required: true, default: 'mercadopago' },
    providerPaymentId: { type: String, required: true, index: true },
    status: { type: String, enum: internalPaymentStatuses, required: true },
    statusDetail: { type: String, required: false },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'ARS' },
    methodType: { type: String, required: false },
    rawPayload: { type: mongoose.Schema.Types.Mixed, required: false }
  },
  { timestamps: true }
);

paymentTransactionSchema.index({ provider: 1, providerPaymentId: 1 }, { unique: true });

export type PaymentTransactionDocument = InferSchemaType<typeof paymentTransactionSchema> & { _id: mongoose.Types.ObjectId };
export const PaymentTransactionModel: Model<PaymentTransactionDocument> = mongoose.model<PaymentTransactionDocument>(
  'PaymentTransaction',
  paymentTransactionSchema
);
