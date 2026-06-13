import mongoose from 'mongoose';
import type { OrganizationHealthInsuranceDto } from '@starter/shared-types';
import { AppError } from '../../../core/errors.js';
import { OrganizationHealthInsuranceRepository } from '../repositories/organization-health-insurance.repository.js';
import type { OrganizationHealthInsuranceDocument } from '../models/organization-health-insurance.model.js';

const normalizeText = (value?: string | null): string | undefined => {
  const normalized = value?.trim().replace(/\s+/g, ' ');
  return normalized ? normalized : undefined;
};

type HealthInsurancePlanInput = { name: string; code?: string | null | undefined; active?: boolean | undefined };
type HealthInsuranceWriteInput = {
  name?: string | undefined;
  status?: 'active' | 'inactive' | undefined;
  requiresMemberNumber?: boolean | undefined;
  requiresPlan?: boolean | undefined;
  notes?: string | null | undefined;
  plans?: HealthInsurancePlanInput[] | undefined;
};

export class OrganizationHealthInsuranceService {
  constructor(private readonly repository = new OrganizationHealthInsuranceRepository()) {}

  async list(organizationId: string, activeOnly = false): Promise<OrganizationHealthInsuranceDto[]> {
    this.assertObjectId(organizationId, 'INVALID_ORGANIZATION_ID');
    const rows = await this.repository.listByOrganization(organizationId, activeOnly);
    return rows.map((row) => this.toDto(row));
  }

  async create(organizationId: string, input: HealthInsuranceWriteInput & { name: string }): Promise<OrganizationHealthInsuranceDto> {
    this.assertObjectId(organizationId, 'INVALID_ORGANIZATION_ID');
    const name = normalizeText(input.name);
    if (!name) throw new AppError('INVALID_HEALTH_INSURANCE_NAME', 400, 'name is required');
    try {
      return this.toDto(await this.repository.create({
        organizationId,
        name,
        status: input.status ?? 'active',
        requiresMemberNumber: input.requiresMemberNumber ?? false,
        requiresPlan: input.requiresPlan ?? false,
        notes: normalizeText(input.notes) ?? null,
        plans: input.requiresPlan === true ? this.normalizePlans(input.plans) : []
      }));
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
        throw new AppError('HEALTH_INSURANCE_DUPLICATED', 409, 'Ya existe una cobertura con ese nombre en el centro.');
      }
      throw error;
    }
  }

  async update(organizationId: string, id: string, input: HealthInsuranceWriteInput): Promise<OrganizationHealthInsuranceDto> {
    this.assertObjectId(organizationId, 'INVALID_ORGANIZATION_ID');
    this.assertObjectId(id, 'INVALID_HEALTH_INSURANCE_ID');
    const update: Record<string, unknown> = {};
    if (input.name !== undefined) {
      const name = normalizeText(input.name);
      if (!name) throw new AppError('INVALID_HEALTH_INSURANCE_NAME', 400, 'name is required');
      update.name = name;
    }
    if (input.status !== undefined) update.status = input.status;
    if (input.requiresMemberNumber !== undefined) update.requiresMemberNumber = input.requiresMemberNumber;
    if (input.requiresPlan !== undefined) update.requiresPlan = input.requiresPlan;
    if (input.notes !== undefined) update.notes = normalizeText(input.notes) ?? null;
    if (input.plans !== undefined) update.plans = this.normalizePlans(input.plans);
    const row = await this.repository.updateByIdInOrganization(organizationId, id, update);
    if (!row) throw new AppError('HEALTH_INSURANCE_NOT_FOUND', 404, 'Cobertura no encontrada');
    return this.toDto(row);
  }

  private normalizePlans(plans: HealthInsurancePlanInput[] | undefined): Array<{ name: string; code: string | null; active: boolean }> {
    const seen = new Set<string>();
    const normalizedPlans: Array<{ name: string; code: string | null; active: boolean }> = [];
    for (const plan of plans ?? []) {
      const name = normalizeText(plan.name);
      if (!name) throw new AppError('INVALID_HEALTH_INSURANCE_PLAN', 400, 'No se permiten planes vacíos.');
      const duplicateKey = name.toLocaleLowerCase('es-AR');
      if (seen.has(duplicateKey)) throw new AppError('DUPLICATED_HEALTH_INSURANCE_PLAN', 400, 'No se permiten planes duplicados dentro de la misma obra social.');
      seen.add(duplicateKey);
      normalizedPlans.push({ name, code: normalizeText(plan.code) ?? null, active: plan.active ?? true });
    }
    return normalizedPlans;
  }

  private assertObjectId(value: string, code: string): void {
    if (!mongoose.isValidObjectId(value)) throw new AppError(code, 400, `${code} is invalid`);
  }

  private toDto(row: OrganizationHealthInsuranceDocument): OrganizationHealthInsuranceDto {
    return {
      id: row._id.toString(),
      organizationId: row.organizationId.toString(),
      name: row.name,
      status: row.status,
      requiresMemberNumber: row.requiresMemberNumber,
      requiresPlan: row.requiresPlan,
      notes: row.notes ?? null,
      plans: (row.plans ?? []).map((plan) => ({ name: plan.name, code: plan.code ?? null, active: plan.active })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}
