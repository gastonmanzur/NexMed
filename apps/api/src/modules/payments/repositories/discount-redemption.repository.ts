import { DiscountRedemptionModel, type DiscountRedemptionDocument } from '../models/discount-redemption.model.js';

export class DiscountRedemptionRepository {
  countByDiscount(discountId: string): Promise<number> {
    return DiscountRedemptionModel.countDocuments({ discountId, status: { $in: ['checkout_created', 'active'] } });
  }

  countByDiscountAndOrganization(discountId: string, organizationId: string): Promise<number> {
    return DiscountRedemptionModel.countDocuments({ discountId, organizationId, status: { $in: ['checkout_created', 'active'] } });
  }

  findActiveByDiscountAndOrganization(discountId: string, organizationId: string): Promise<DiscountRedemptionDocument | null> {
    return DiscountRedemptionModel.findOne({ discountId, organizationId, status: { $in: ['checkout_created', 'active'] } })
      .sort({ createdAt: -1 })
      .lean();
  }

  create(input: {
    discountId: string;
    discountCode: string;
    organizationId: string;
    planId: string;
    subscriptionId?: string | undefined;
    appliedBy: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    discountAmount: number;
    originalAmount: number;
    finalAmount: number;
    currency: string;
    provider: 'mercadopago' | 'internal';
    providerReference?: string | undefined;
    status: 'checkout_created' | 'active';
    appliedAt?: Date | undefined;
  }): Promise<DiscountRedemptionDocument> {
    return DiscountRedemptionModel.create({
      discountId: input.discountId,
      discountCode: input.discountCode,
      organizationId: input.organizationId,
      planId: input.planId,
      ...(input.subscriptionId ? { subscriptionId: input.subscriptionId } : {}),
      appliedBy: input.appliedBy,
      discountType: input.discountType,
      discountValue: input.discountValue,
      discountAmount: input.discountAmount,
      originalAmount: input.originalAmount,
      finalAmount: input.finalAmount,
      currency: input.currency,
      provider: input.provider,
      ...(input.providerReference ? { providerReference: input.providerReference } : {}),
      status: input.status,
      appliedAt: input.appliedAt ?? new Date()
    }).then((result) => result.toObject());
  }
}
