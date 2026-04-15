import mongoose from 'mongoose';
import { DiscountModel, type DiscountDocument } from '../models/discount.model.js';

export class DiscountRepository {
  list(): Promise<DiscountDocument[]> {
    return DiscountModel.find().sort({ createdAt: -1 }).lean();
  }

  findById(discountId: string): Promise<DiscountDocument | null> {
    if (!mongoose.isValidObjectId(discountId)) return Promise.resolve(null);
    return DiscountModel.findById(discountId).lean();
  }

  findByCode(code: string): Promise<DiscountDocument | null> {
    return DiscountModel.findOne({ code }).lean();
  }

  create(input: {
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    currency?: string | undefined;
    appliesToPlanIds?: string[] | undefined;
    onlyForNewOrganizations?: boolean | undefined;
    onlyDuringTrial?: boolean | undefined;
    maxRedemptions?: number | undefined;
    maxRedemptionsPerOrganization?: number | undefined;
    startsAt?: Date | undefined;
    endsAt?: Date | undefined;
    isActive?: boolean | undefined;
  }): Promise<DiscountDocument> {
    return DiscountModel.create({
      code: input.code,
      discountType: input.discountType,
      discountValue: input.discountValue,
      ...(input.currency ? { currency: input.currency } : {}),
      ...(input.appliesToPlanIds ? { appliesToPlanIds: input.appliesToPlanIds } : {}),
      onlyForNewOrganizations: input.onlyForNewOrganizations ?? false,
      onlyDuringTrial: input.onlyDuringTrial ?? false,
      ...(input.maxRedemptions !== undefined ? { maxRedemptions: input.maxRedemptions } : {}),
      ...(input.maxRedemptionsPerOrganization !== undefined
        ? { maxRedemptionsPerOrganization: input.maxRedemptionsPerOrganization }
        : {}),
      ...(input.startsAt ? { startsAt: input.startsAt } : {}),
      ...(input.endsAt ? { endsAt: input.endsAt } : {}),
      isActive: input.isActive ?? true
    }).then((result) => result.toObject());
  }

  updateById(
    discountId: string,
    data: Partial<{
      code: string;
      discountType: 'percentage' | 'fixed';
      discountValue: number;
      currency?: string | null;
      appliesToPlanIds: string[];
      onlyForNewOrganizations: boolean;
      onlyDuringTrial: boolean;
      maxRedemptions?: number | null;
      maxRedemptionsPerOrganization?: number | null;
      startsAt?: Date | null;
      endsAt?: Date | null;
      isActive: boolean;
    }>
  ): Promise<DiscountDocument | null> {
    if (!mongoose.isValidObjectId(discountId)) return Promise.resolve(null);

    const update: Record<string, unknown> = {
      ...(data.code !== undefined ? { code: data.code } : {}),
      ...(data.discountType !== undefined ? { discountType: data.discountType } : {}),
      ...(data.discountValue !== undefined ? { discountValue: data.discountValue } : {}),
      ...(data.currency !== undefined ? { currency: data.currency } : {}),
      ...(data.appliesToPlanIds !== undefined ? { appliesToPlanIds: data.appliesToPlanIds } : {}),
      ...(data.onlyForNewOrganizations !== undefined
        ? { onlyForNewOrganizations: data.onlyForNewOrganizations }
        : {}),
      ...(data.onlyDuringTrial !== undefined ? { onlyDuringTrial: data.onlyDuringTrial } : {}),
      ...(data.maxRedemptions !== undefined ? { maxRedemptions: data.maxRedemptions } : {}),
      ...(data.maxRedemptionsPerOrganization !== undefined
        ? { maxRedemptionsPerOrganization: data.maxRedemptionsPerOrganization }
        : {}),
      ...(data.startsAt !== undefined ? { startsAt: data.startsAt } : {}),
      ...(data.endsAt !== undefined ? { endsAt: data.endsAt } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {})
    };

    return DiscountModel.findByIdAndUpdate(discountId, { $set: update }, { new: true }).lean();
  }
}
