import { PaymentOrderModel, type PaymentOrderDocument } from '../models/payment-order.model.js';
import { PaymentTransactionModel } from '../models/payment-transaction.model.js';

export class PaymentRepository {
  createOrder(input: {
    userId: string;
    type: 'one_time' | 'subscription';
    description: string;
    amount: number;
    currency: string;
    externalReference: string;
    metadata?: Record<string, unknown>;
  }) {
    return PaymentOrderModel.create(input);
  }

  updateOrderProviderData(orderId: string, data: { providerOrderId?: string; providerPreferenceId?: string }) {
    return PaymentOrderModel.findByIdAndUpdate(orderId, data, { new: true });
  }

  updateOrderStatus(orderId: string, status: PaymentOrderDocument['status']) {
    return PaymentOrderModel.findByIdAndUpdate(orderId, { status }, { new: true });
  }

  getOrderById(orderId: string) {
    return PaymentOrderModel.findById(orderId).lean();
  }

  getOrderByExternalReference(externalReference: string) {
    return PaymentOrderModel.findOne({ externalReference });
  }

  upsertTransaction(input: {
    orderId: string;
    providerPaymentId: string;
    status: PaymentOrderDocument['status'];
    statusDetail?: string;
    amount: number;
    currency: string;
    methodType?: string;
    rawPayload?: unknown;
  }) {
    return PaymentTransactionModel.findOneAndUpdate(
      { provider: 'mercadopago', providerPaymentId: input.providerPaymentId },
      {
        ...input,
        provider: 'mercadopago'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  listTransactions(limit = 50) {
    return PaymentTransactionModel.find().sort({ createdAt: -1 }).limit(limit).lean();
  }
}
