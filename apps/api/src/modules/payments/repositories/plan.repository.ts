import { PlanModel, type PlanDocument } from '../models/plan.model.js';

export class PlanRepository {
  listActive(): Promise<PlanDocument[]> {
    return PlanModel.find({ status: 'active' }).sort({ price: 1, createdAt: 1 }).lean();
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
        price: 0,
        currency: 'ARS',
        maxProfessionalsActive: 3,
        status: 'active',
        description: 'Plan inicial para empezar la operación.'
      },
      {
        code: 'growth',
        name: 'Growth',
        price: 19900,
        currency: 'ARS',
        maxProfessionalsActive: 10,
        status: 'active',
        description: 'Más capacidad para centros en crecimiento.'
      },
      {
        code: 'scale',
        name: 'Scale',
        price: 49900,
        currency: 'ARS',
        maxProfessionalsActive: 50,
        status: 'active',
        description: 'Operación avanzada para equipos grandes.'
      }
    ] as const;

    for (const plan of defaults) {
      await PlanModel.findOneAndUpdate({ code: plan.code }, { $setOnInsert: plan }, { upsert: true, new: true }).lean();
    }
  }
}
