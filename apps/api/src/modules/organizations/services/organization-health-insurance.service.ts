import mongoose from 'mongoose';
import type { OrganizationHealthInsuranceDto } from '@starter/shared-types';
import { AppError } from '../../../core/errors.js';
import { OrganizationHealthInsuranceRepository } from '../repositories/organization-health-insurance.repository.js';
import type { OrganizationHealthInsuranceDocument } from '../models/organization-health-insurance.model.js';

const normalizeText = (value?: string): string | undefined => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

export class OrganizationHealthInsuranceService {
  constructor(private readonly repository = new OrganizationHealthInsuranceRepository()) {}

  async list(organizationId: string, activeOnly = false): Promise<OrganizationHealthInsuranceDto[]> {
    this.assertObjectId(organizationId, 'INVALID_ORGANIZATION_ID');
    const rows = await this.repository.listByOrganization(organizationId, activeOnly);
    return rows.map((row) => this.toDto(row));
  }

  async create(organizationId: string, input: { name: string; status?: 'active' | 'inactive' | undefined; requiresMemberNumber?: boolean | undefined; requiresPlan?: boolean | undefined; notes?: string | null | undefined }): Promise<OrganizationHealthInsuranceDto> {
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
        notes: normalizeText(input.notes ?? undefined) ?? null
      }));
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
        throw new AppError('HEALTH_INSURANCE_DUPLICATED', 409, 'Ya existe una cobertura con ese nombre en el centro.');
      }
      throw error;
    }
  }

  async update(organizationId: string, id: string, input: { name?: string | undefined; status?: 'active' | 'inactive' | undefined; requiresMemberNumber?: boolean | undefined; requiresPlan?: boolean | undefined; notes?: string | null | undefined | null }): Promise<OrganizationHealthInsuranceDto> {
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
    if (input.notes !== undefined) update.notes = normalizeText(input.notes ?? undefined) ?? null;
    const row = await this.repository.updateByIdInOrganization(organizationId, id, update);
    if (!row) throw new AppError('HEALTH_INSURANCE_NOT_FOUND', 404, 'Cobertura no encontrada');
    return this.toDto(row);
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
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}
