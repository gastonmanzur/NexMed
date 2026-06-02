import { PlanModel, type PlanDocument } from '../models/plan.model.js';

export class PlanRepository {
  listActive(): Promise<PlanDocument[]> {
    return PlanModel.find({ status: 'active' }).sort({ billingPriceArs: 1, price: 1, createdAt: 1 }).lean();
  }

  findById(planId: string): Promise<PlanDocument | null> {
    return PlanModel.findById(planId).lean();
  }

  findByCode(code: string): Promise<PlanDocument | null> {
    return PlanModel.findOne({ code }).lean();
  }

  async ensureDefaults(): Promise<void> {
    const defaults = [
      {
        code: 'starter',
        name: 'Starter',
        displayPriceUsd: 10,
        billingPriceArs: 15000,
        displayCurrency: 'USD',
        billingCurrency: 'ARS',
        price: 15000,
        currency: 'ARS',
        maxProfessionalsActive: 3,
        status: 'active',
        isRecommended: false,
        description: 'Plan base para consultorios que necesitan comenzar con una suscripción paga.'
      },
      {
        code: 'growth',
        name: 'Growth',
        displayPriceUsd: 20,
        billingPriceArs: 30000,
        displayCurrency: 'USD',
        billingCurrency: 'ARS',
        price: 30000,
        currency: 'ARS',
        maxProfessionalsActive: 10,
        status: 'active',
        isRecommended: true,
        description: 'Más capacidad para centros en crecimiento.'
      },
      {
        code: 'scale',
        name: 'Scale',
        displayPriceUsd: 35,
        billingPriceArs: 50000,
        displayCurrency: 'USD',
        billingCurrency: 'ARS',
        price: 50000,
        currency: 'ARS',
        maxProfessionalsActive: 50,
        status: 'active',
        isRecommended: false,
        description: 'Operación avanzada para equipos grandes.'
      }
    ] as const;

    for (const plan of defaults) {
      const existing = await PlanModel.findOne({ code: plan.code }).lean();
      if (!existing) {
        await PlanModel.create(plan);
        continue;
      }

      const missingFields: Record<string, unknown> = {};
      if (existing.displayPriceUsd === undefined) missingFields.displayPriceUsd = plan.displayPriceUsd;
      if (existing.billingPriceArs === undefined) missingFields.billingPriceArs = existing.price ?? plan.billingPriceArs;
      if (existing.displayCurrency === undefined) missingFields.displayCurrency = 'USD';
      if (existing.billingCurrency === undefined) missingFields.billingCurrency = 'ARS';
      if (existing.price === undefined) missingFields.price = existing.billingPriceArs ?? plan.billingPriceArs;
      if (existing.currency === undefined) missingFields.currency = 'ARS';

      if (Object.keys(missingFields).length > 0) {
        await PlanModel.updateOne({ _id: existing._id }, { $set: missingFields });
      }
    }
  }
}
