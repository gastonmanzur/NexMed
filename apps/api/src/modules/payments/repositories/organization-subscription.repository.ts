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
          ...(input.autoRenew !== undefined ? { autoRenew: input.autoRenew } : {})
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
  }): Promise<OrganizationSubscriptionDocument | null> {
    return OrganizationSubscriptionModel.findOneAndUpdate(
      { provider: 'mercadopago', providerReference: input.providerReference },
      {
        $set: {
          status: input.status,
          ...(input.startedAt !== undefined ? { startedAt: input.startedAt } : {}),
          ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
          ...(input.autoRenew !== undefined ? { autoRenew: input.autoRenew } : {})
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
