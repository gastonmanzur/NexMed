import { OrganizationSubscriptionModel, type OrganizationSubscriptionDocument } from '../models/organization-subscription.model.js';

export class OrganizationSubscriptionRepository {
  findByOrganizationId(organizationId: string): Promise<OrganizationSubscriptionDocument | null> {
    return OrganizationSubscriptionModel.findOne({ organizationId }).lean();
  }

  upsertByOrganizationId(input: {
    organizationId: string;
    planId: string;
    provider?: string;
    providerReference?: string;
    status?: 'trial' | 'active' | 'past_due' | 'suspended' | 'canceled';
    startedAt?: Date;
    expiresAt?: Date;
    autoRenew?: boolean;
    discountId?: string;
    discountCode?: string;
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    discountAmount?: number;
    originalAmount?: number;
    finalAmount?: number;
    billingMode?: 'standard' | 'complimentary' | 'not_applicable';
    billingExemptionReason?: 'internal_admin' | 'test_account' | 'manual';
    billingExemptAt?: Date;
    discountAppliedAt?: Date;
    discountAppliedBy?: string;
  }): Promise<OrganizationSubscriptionDocument> {
    return OrganizationSubscriptionModel.findOneAndUpdate(
      { organizationId: input.organizationId },
      {
        $set: {
          planId: input.planId,
          provider: input.provider ?? 'manual',
          ...(input.providerReference !== undefined ? { providerReference: input.providerReference } : {}),
          status: input.status ?? 'trial',
          ...(input.startedAt !== undefined ? { startedAt: input.startedAt } : {}),
          ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
          ...(input.autoRenew !== undefined ? { autoRenew: input.autoRenew } : {}),
          ...(input.discountId !== undefined ? { discountId: input.discountId } : {}),
          ...(input.discountCode !== undefined ? { discountCode: input.discountCode } : {}),
          ...(input.discountType !== undefined ? { discountType: input.discountType } : {}),
          ...(input.discountValue !== undefined ? { discountValue: input.discountValue } : {}),
          ...(input.discountAmount !== undefined ? { discountAmount: input.discountAmount } : {}),
          ...(input.originalAmount !== undefined ? { originalAmount: input.originalAmount } : {}),
          ...(input.finalAmount !== undefined ? { finalAmount: input.finalAmount } : {}),
          ...(input.billingMode !== undefined ? { billingMode: input.billingMode } : {}),
          ...(input.billingExemptionReason !== undefined ? { billingExemptionReason: input.billingExemptionReason } : {}),
          ...(input.billingExemptAt !== undefined ? { billingExemptAt: input.billingExemptAt } : {}),
          ...(input.discountAppliedAt !== undefined ? { discountAppliedAt: input.discountAppliedAt } : {}),
          ...(input.discountAppliedBy !== undefined ? { discountAppliedBy: input.discountAppliedBy } : {})
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean() as Promise<OrganizationSubscriptionDocument>;
  }

  updateByProviderReference(input: {
    providerReference: string;
    status: 'trial' | 'active' | 'past_due' | 'suspended' | 'canceled';
    startedAt?: Date;
    expiresAt?: Date;
    autoRenew?: boolean;
    discountId?: string;
    discountCode?: string;
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    discountAmount?: number;
    originalAmount?: number;
    finalAmount?: number;
    billingMode?: 'standard' | 'complimentary' | 'not_applicable';
    billingExemptionReason?: 'internal_admin' | 'test_account' | 'manual';
    billingExemptAt?: Date;
    discountAppliedAt?: Date;
    discountAppliedBy?: string;
  }): Promise<OrganizationSubscriptionDocument | null> {
    return OrganizationSubscriptionModel.findOneAndUpdate(
      { provider: 'mercadopago', providerReference: input.providerReference },
      {
        $set: {
          status: input.status,
          ...(input.startedAt !== undefined ? { startedAt: input.startedAt } : {}),
          ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
          ...(input.autoRenew !== undefined ? { autoRenew: input.autoRenew } : {}),
          ...(input.discountId !== undefined ? { discountId: input.discountId } : {}),
          ...(input.discountCode !== undefined ? { discountCode: input.discountCode } : {}),
          ...(input.discountType !== undefined ? { discountType: input.discountType } : {}),
          ...(input.discountValue !== undefined ? { discountValue: input.discountValue } : {}),
          ...(input.discountAmount !== undefined ? { discountAmount: input.discountAmount } : {}),
          ...(input.originalAmount !== undefined ? { originalAmount: input.originalAmount } : {}),
          ...(input.finalAmount !== undefined ? { finalAmount: input.finalAmount } : {}),
          ...(input.billingMode !== undefined ? { billingMode: input.billingMode } : {}),
          ...(input.billingExemptionReason !== undefined ? { billingExemptionReason: input.billingExemptionReason } : {}),
          ...(input.billingExemptAt !== undefined ? { billingExemptAt: input.billingExemptAt } : {}),
          ...(input.discountAppliedAt !== undefined ? { discountAppliedAt: input.discountAppliedAt } : {}),
          ...(input.discountAppliedBy !== undefined ? { discountAppliedBy: input.discountAppliedBy } : {})
        }
      },
      { new: true }
    ).lean();
  }

  countByStatus(): Promise<Array<{ _id: string; count: number }>> {
    return OrganizationSubscriptionModel.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
  }
}
