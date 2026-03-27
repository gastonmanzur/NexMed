import { SubscriptionModel, subscriptionPeriods, subscriptionStatuses } from '../models/subscription.model.js';

export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

type SubscriptionPeriod = (typeof subscriptionPeriods)[number];

export class SubscriptionRepository {
  create(input: {
    userId: string;
    planCode: string;
    title: string;
    amount: number;
    currency: string;
    period: SubscriptionPeriod;
    externalReference: string;
    metadata?: Record<string, unknown>;
  }) {
    return SubscriptionModel.create(input);
  }

  updateProviderData(subscriptionId: string, data: { providerPreapprovalId?: string; providerInitPoint?: string }) {
    return SubscriptionModel.findByIdAndUpdate(subscriptionId, data, { new: true });
  }

  updateStatusByPreapprovalId(providerPreapprovalId: string, status: SubscriptionStatus, nextBillingDate?: Date) {
    return SubscriptionModel.findOneAndUpdate(
      { provider: 'mercadopago', providerPreapprovalId },
      { status, ...(nextBillingDate ? { nextBillingDate } : {}) },
      { new: true }
    );
  }

  updateStatusByExternalReference(
    externalReference: string,
    status: SubscriptionStatus,
    nextBillingDate?: Date,
    providerData?: { providerPreapprovalId?: string }
  ) {
    return SubscriptionModel.findOneAndUpdate(
      { provider: 'mercadopago', externalReference },
      {
        status,
        ...(nextBillingDate ? { nextBillingDate } : {}),
        ...(providerData?.providerPreapprovalId ? { providerPreapprovalId: providerData.providerPreapprovalId } : {})
      },
      { new: true }
    );
  }

  findByUserPlanPeriodWithStatuses(userId: string, planCode: string, period: SubscriptionPeriod, statuses: SubscriptionStatus[]) {
    return SubscriptionModel.findOne({ userId, planCode, period, status: { $in: statuses } }).sort({ createdAt: -1 }).lean();
  }

  findLatestByUser(userId: string, filters?: { planCode?: string; period?: SubscriptionPeriod }) {
    return SubscriptionModel.findOne({ userId, ...(filters ?? {}) }).sort({ createdAt: -1 }).lean();
  }

  getById(subscriptionId: string) {
    return SubscriptionModel.findById(subscriptionId).lean();
  }

  list(limit = 50) {
    return SubscriptionModel.find().sort({ createdAt: -1 }).limit(limit).lean();
  }
}
