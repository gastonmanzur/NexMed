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
        price: 9900,
        currency: 'ARS',
        maxProfessionalsActive: 3,
        status: 'active',
        isRecommended: false,
        description: 'Plan base para consultorios que completaron su prueba de 14 días.'
      },
      {
        code: 'growth',
        name: 'Growth',
        price: 19900,
        currency: 'ARS',
        maxProfessionalsActive: 10,
        status: 'active',
        isRecommended: true,
        description: 'Más capacidad para centros en crecimiento.'
      },
      {
        code: 'scale',
        name: 'Scale',
        price: 49900,
        currency: 'ARS',
        maxProfessionalsActive: 50,
        status: 'active',
        isRecommended: false,
        description: 'Operación avanzada para equipos grandes.'
      }
    ] as const;

    for (const plan of defaults) {
      await PlanModel.findOneAndUpdate({ code: plan.code }, { $set: plan }, { upsert: true, new: true }).lean();
    }
  }
}
