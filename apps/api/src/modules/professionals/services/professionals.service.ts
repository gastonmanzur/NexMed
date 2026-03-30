import type { ProfessionalDto, ProfessionalStatus, SpecialtyDto, SpecialtyStatus, SpecialtySummaryDto } from '@starter/shared-types';
import { AppError } from '../../../core/errors.js';
import { ProfessionalRepository } from '../repositories/professional.repository.js';
import { SpecialtyRepository } from '../repositories/specialty.repository.js';
import { ProfessionalSpecialtyRepository } from '../repositories/professional-specialty.repository.js';
import { OrganizationSubscriptionRepository } from '../../payments/repositories/organization-subscription.repository.js';
import { PlanRepository } from '../../payments/repositories/plan.repository.js';

interface UpsertProfessionalInput {
  firstName: string;
  lastName: string;
  email?: string | undefined;
  phone?: string | undefined;
  licenseNumber?: string | undefined;
  notes?: string | undefined;
  status?: ProfessionalStatus | undefined;
  specialtyIds?: string[] | undefined;
}

interface UpsertSpecialtyInput {
  name: string;
  description?: string | undefined;
  status?: SpecialtyStatus | undefined;
}

export class ProfessionalsService {
  constructor(
    private readonly professionals = new ProfessionalRepository(),
    private readonly specialties = new SpecialtyRepository(),
    private readonly professionalSpecialties = new ProfessionalSpecialtyRepository(),
    private readonly organizationSubscriptions = new OrganizationSubscriptionRepository(),
    private readonly plans = new PlanRepository()
  ) {}

  async listProfessionals(organizationId: string): Promise<ProfessionalDto[]> {
    const professionals = await this.professionals.findByOrganization(organizationId);

    if (professionals.length === 0) {
      return [];
    }

    const professionalIds = professionals.map((professional) => professional._id.toString());
    const mappings = await this.professionalSpecialties.findByProfessionalIds(organizationId, professionalIds);
    const specialtyIds = [...new Set(mappings.map((mapping) => mapping.specialtyId.toString()))];
    const specialties = specialtyIds.length > 0 ? await this.specialties.findByIdsInOrganization(organizationId, specialtyIds) : [];

    const specialtiesById = new Map(
      specialties.map((specialty) => [
        specialty._id.toString(),
        {
          id: specialty._id.toString(),
          name: specialty.name,
          status: specialty.status
        } satisfies SpecialtySummaryDto
      ])
    );

    const mappingsByProfessionalId = new Map<string, SpecialtySummaryDto[]>();
    for (const mapping of mappings) {
      const professionalId = mapping.professionalId.toString();
      const specialty = specialtiesById.get(mapping.specialtyId.toString());
      if (!specialty) continue;

      const current = mappingsByProfessionalId.get(professionalId) ?? [];
      current.push(specialty);
      mappingsByProfessionalId.set(professionalId, current);
    }

    return professionals.map((professional) => this.toProfessionalDto(professional, mappingsByProfessionalId.get(professional._id.toString()) ?? []));
  }

  async createProfessional(organizationId: string, input: UpsertProfessionalInput): Promise<ProfessionalDto> {
    const normalized = this.normalizeProfessionalInput(input);
    if ((normalized.status ?? 'active') === 'active') {
      await this.assertPlanProfessionalLimit(organizationId);
    }
    await this.validateSpecialtiesBelongToOrganization(organizationId, normalized.specialtyIds ?? []);

    const professional = await this.professionals.create({
      organizationId,
      firstName: normalized.firstName,
      lastName: normalized.lastName,
      displayName: this.computeDisplayName(normalized.firstName, normalized.lastName),
      email: normalized.email,
      phone: normalized.phone,
      licenseNumber: normalized.licenseNumber,
      notes: normalized.notes,
      status: normalized.status ?? 'active',
      userId: null
    });

    await this.professionalSpecialties.replaceForProfessional(organizationId, professional._id.toString(), normalized.specialtyIds ?? []);

    return this.getProfessional(organizationId, professional._id.toString());
  }

  async getProfessional(organizationId: string, professionalId: string): Promise<ProfessionalDto> {
    const professional = await this.professionals.findByIdInOrganization(organizationId, professionalId);
    if (!professional) {
      throw new AppError('PROFESSIONAL_NOT_FOUND', 404, 'Professional not found');
    }

    const mappings = await this.professionalSpecialties.findByProfessionalId(organizationId, professionalId);
    const specialtyIds = mappings.map((mapping) => mapping.specialtyId.toString());
    const specialties = specialtyIds.length > 0 ? await this.specialties.findByIdsInOrganization(organizationId, specialtyIds) : [];

    const specialtySummaries = specialties.map((specialty) => ({
      id: specialty._id.toString(),
      name: specialty.name,
      status: specialty.status
    }));

    return this.toProfessionalDto(professional, specialtySummaries);
  }

  async updateProfessional(organizationId: string, professionalId: string, input: {
    firstName?: string | undefined;
    lastName?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    licenseNumber?: string | undefined;
    notes?: string | undefined;
    status?: ProfessionalStatus | undefined;
    specialtyIds?: string[] | undefined;
  }): Promise<ProfessionalDto> {
    const normalized = this.normalizeProfessionalPatchInput(input);

    if (normalized.specialtyIds) {
      await this.validateSpecialtiesBelongToOrganization(organizationId, normalized.specialtyIds);
    }

    let displayName: string | undefined;
    if (normalized.firstName !== undefined || normalized.lastName !== undefined) {
      const currentNames = await this.getProfessionalNames(organizationId, professionalId);
      displayName = this.computeDisplayName(normalized.firstName ?? currentNames.firstName, normalized.lastName ?? currentNames.lastName);
    }

    if (normalized.status === 'active') {
      const current = await this.professionals.findByIdInOrganization(organizationId, professionalId);
      if (!current) {
        throw new AppError('PROFESSIONAL_NOT_FOUND', 404, 'Professional not found');
      }
      if (current.status !== 'active') {
        await this.assertPlanProfessionalLimit(organizationId);
      }
    }

    const professional = await this.professionals.updateByIdInOrganization(organizationId, professionalId, {
      ...(normalized.firstName !== undefined ? { firstName: normalized.firstName } : {}),
      ...(normalized.lastName !== undefined ? { lastName: normalized.lastName } : {}),
      ...(displayName !== undefined ? { displayName } : {}),
      ...(normalized.email !== undefined ? { email: normalized.email } : {}),
      ...(normalized.phone !== undefined ? { phone: normalized.phone } : {}),
      ...(normalized.licenseNumber !== undefined ? { licenseNumber: normalized.licenseNumber } : {}),
      ...(normalized.notes !== undefined ? { notes: normalized.notes } : {}),
      ...(normalized.status !== undefined ? { status: normalized.status } : {})
    });

    if (!professional) {
      throw new AppError('PROFESSIONAL_NOT_FOUND', 404, 'Professional not found');
    }

    if (normalized.specialtyIds) {
      await this.professionalSpecialties.replaceForProfessional(organizationId, professionalId, normalized.specialtyIds);
    }

    return this.getProfessional(organizationId, professionalId);
  }

  async updateProfessionalStatus(organizationId: string, professionalId: string, status: ProfessionalStatus): Promise<ProfessionalDto> {
    if (status === 'active') {
      const current = await this.professionals.findByIdInOrganization(organizationId, professionalId);
      if (!current) {
        throw new AppError('PROFESSIONAL_NOT_FOUND', 404, 'Professional not found');
      }
      if (current.status !== 'active') {
        await this.assertPlanProfessionalLimit(organizationId);
      }
    }

    const professional = await this.professionals.updateByIdInOrganization(organizationId, professionalId, { status });
    if (!professional) {
      throw new AppError('PROFESSIONAL_NOT_FOUND', 404, 'Professional not found');
    }

    return this.getProfessional(organizationId, professionalId);
  }

  async replaceProfessionalSpecialties(organizationId: string, professionalId: string, specialtyIds: string[]): Promise<ProfessionalDto> {
    const professional = await this.professionals.findByIdInOrganization(organizationId, professionalId);
    if (!professional) {
      throw new AppError('PROFESSIONAL_NOT_FOUND', 404, 'Professional not found');
    }

    const uniqueSpecialtyIds = this.normalizeIds(specialtyIds);
    await this.validateSpecialtiesBelongToOrganization(organizationId, uniqueSpecialtyIds);
    await this.professionalSpecialties.replaceForProfessional(organizationId, professionalId, uniqueSpecialtyIds);

    return this.getProfessional(organizationId, professionalId);
  }

  async listSpecialties(organizationId: string): Promise<SpecialtyDto[]> {
    const specialties = await this.specialties.findByOrganization(organizationId);
    if (specialties.length === 0) {
      return [];
    }

    const specialtyIds = specialties.map((specialty) => specialty._id.toString());
    const mappings = await this.professionalSpecialties.findBySpecialtyIds(organizationId, specialtyIds);

    const countBySpecialty = new Map<string, number>();
    for (const mapping of mappings) {
      const specialtyId = mapping.specialtyId.toString();
      countBySpecialty.set(specialtyId, (countBySpecialty.get(specialtyId) ?? 0) + 1);
    }

    return specialties.map((specialty) => this.toSpecialtyDto(specialty, countBySpecialty.get(specialty._id.toString()) ?? 0));
  }

  async createSpecialty(organizationId: string, input: UpsertSpecialtyInput): Promise<SpecialtyDto> {
    const normalized = this.normalizeSpecialtyInput(input);
    await this.ensureSpecialtyNameAvailable(organizationId, normalized.name);

    try {
      const specialty = await this.specialties.create({
        organizationId,
        name: normalized.name,
        description: normalized.description,
        status: normalized.status ?? 'active'
      });

      return this.toSpecialtyDto(specialty, 0);
    } catch (error) {
      if (this.isDuplicateSpecialtyError(error)) {
        throw new AppError('SPECIALTY_DUPLICATED', 409, 'Specialty name already exists in this organization');
      }
      throw error;
    }
  }

  async getSpecialty(organizationId: string, specialtyId: string): Promise<SpecialtyDto> {
    const specialty = await this.specialties.findByIdInOrganization(organizationId, specialtyId);
    if (!specialty) {
      throw new AppError('SPECIALTY_NOT_FOUND', 404, 'Specialty not found');
    }

    const mappings = await this.professionalSpecialties.findBySpecialtyIds(organizationId, [specialtyId]);

    return this.toSpecialtyDto(specialty, mappings.length);
  }

  async updateSpecialty(organizationId: string, specialtyId: string, input: {
    name?: string | undefined;
    description?: string | undefined;
    status?: SpecialtyStatus | undefined;
  }): Promise<SpecialtyDto> {
    const normalized = this.normalizeSpecialtyPatchInput(input);

    if (normalized.name !== undefined) {
      const existing = await this.specialties.findByIdInOrganization(organizationId, specialtyId);
      if (!existing) {
        throw new AppError('SPECIALTY_NOT_FOUND', 404, 'Specialty not found');
      }

      if (existing.name !== normalized.name) {
        await this.ensureSpecialtyNameAvailable(organizationId, normalized.name);
      }
    }

    try {
      const specialty = await this.specialties.updateByIdInOrganization(organizationId, specialtyId, {
        ...(normalized.name !== undefined ? { name: normalized.name } : {}),
        ...(normalized.description !== undefined ? { description: normalized.description } : {}),
        ...(normalized.status !== undefined ? { status: normalized.status } : {})
      });

      if (!specialty) {
        throw new AppError('SPECIALTY_NOT_FOUND', 404, 'Specialty not found');
      }

      return this.getSpecialty(organizationId, specialtyId);
    } catch (error) {
      if (this.isDuplicateSpecialtyError(error)) {
        throw new AppError('SPECIALTY_DUPLICATED', 409, 'Specialty name already exists in this organization');
      }
      throw error;
    }
  }

  async updateSpecialtyStatus(organizationId: string, specialtyId: string, status: SpecialtyStatus): Promise<SpecialtyDto> {
    const specialty = await this.specialties.updateByIdInOrganization(organizationId, specialtyId, { status });
    if (!specialty) {
      throw new AppError('SPECIALTY_NOT_FOUND', 404, 'Specialty not found');
    }

    return this.getSpecialty(organizationId, specialtyId);
  }

  private async getProfessionalNames(organizationId: string, professionalId: string): Promise<{ firstName: string; lastName: string }> {
    const professional = await this.professionals.findByIdInOrganization(organizationId, professionalId);
    if (!professional) {
      throw new AppError('PROFESSIONAL_NOT_FOUND', 404, 'Professional not found');
    }

    return { firstName: professional.firstName, lastName: professional.lastName };
  }

  private async validateSpecialtiesBelongToOrganization(organizationId: string, specialtyIds: string[]): Promise<void> {
    if (specialtyIds.length === 0) {
      return;
    }

    const normalized = this.normalizeIds(specialtyIds);
    const specialties = await this.specialties.findByIdsInOrganization(organizationId, normalized);
    if (specialties.length !== normalized.length) {
      throw new AppError('INVALID_SPECIALTY_ASSOCIATION', 400, 'One or more specialties do not belong to the organization');
    }
  }



  private async assertPlanProfessionalLimit(organizationId: string): Promise<void> {
    await this.plans.ensureDefaults();

    const subscription = await this.organizationSubscriptions.findByOrganizationId(organizationId);
    if (!subscription) {
      return;
    }

    if (['suspended', 'past_due', 'canceled'].includes(subscription.status)) {
      throw new AppError('SUBSCRIPTION_RESTRICTED', 409, 'La suscripción de la organización no permite activar profesionales.');
    }

    const plan = await this.plans.findById(subscription.planId.toString());
    if (!plan) {
      return;
    }

    const activeProfessionals = await this.professionals.countActiveByOrganization(organizationId);
    if (activeProfessionals >= plan.maxProfessionalsActive) {
      throw new AppError(
        'PLAN_LIMIT_REACHED',
        409,
        `Límite del plan alcanzado: ${plan.maxProfessionalsActive} profesionales activos.`
      );
    }
  }

  private isDuplicateSpecialtyError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 11000;
  }

  private async ensureSpecialtyNameAvailable(organizationId: string, name: string): Promise<void> {
    const existing = await this.specialties.findByOrganizationAndName(organizationId, name);
    if (existing) {
      throw new AppError('SPECIALTY_DUPLICATED', 409, 'Specialty name already exists in this organization');
    }
  }

  private normalizeProfessionalInput(input: UpsertProfessionalInput): UpsertProfessionalInput {
    return {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: this.normalizeOptionalEmail(input.email),
      phone: this.normalizePhone(input.phone),
      licenseNumber: this.normalizeOptionalText(input.licenseNumber),
      notes: this.normalizeOptionalText(input.notes),
      status: input.status,
      specialtyIds: input.specialtyIds ? this.normalizeIds(input.specialtyIds) : undefined
    };
  }

  private normalizeProfessionalPatchInput(input: {
    firstName?: string | undefined;
    lastName?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    licenseNumber?: string | undefined;
    notes?: string | undefined;
    status?: ProfessionalStatus | undefined;
    specialtyIds?: string[] | undefined;
  }): {
    firstName?: string | undefined;
    lastName?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    licenseNumber?: string | undefined;
    notes?: string | undefined;
    status?: ProfessionalStatus | undefined;
    specialtyIds?: string[] | undefined;
  } {
    return {
      ...(input.firstName !== undefined ? { firstName: input.firstName.trim() } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName.trim() } : {}),
      ...(input.email !== undefined ? { email: this.normalizeOptionalEmail(input.email) } : {}),
      ...(input.phone !== undefined ? { phone: this.normalizePhone(input.phone) } : {}),
      ...(input.licenseNumber !== undefined ? { licenseNumber: this.normalizeOptionalText(input.licenseNumber) } : {}),
      ...(input.notes !== undefined ? { notes: this.normalizeOptionalText(input.notes) } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.specialtyIds !== undefined ? { specialtyIds: this.normalizeIds(input.specialtyIds) } : {})
    };
  }

  private normalizeSpecialtyInput(input: UpsertSpecialtyInput): UpsertSpecialtyInput {
    return {
      name: input.name.trim(),
      description: this.normalizeOptionalText(input.description),
      status: input.status
    };
  }

  private normalizeSpecialtyPatchInput(input: {
    name?: string | undefined;
    description?: string | undefined;
    status?: SpecialtyStatus | undefined;
  }): {
    name?: string | undefined;
    description?: string | undefined;
    status?: SpecialtyStatus | undefined;
  } {
    return {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: this.normalizeOptionalText(input.description) } : {}),
      ...(input.status !== undefined ? { status: input.status } : {})
    };
  }

  private normalizeOptionalEmail(value?: string): string | undefined {
    const normalized = this.normalizeOptionalText(value);
    return normalized ? normalized.toLowerCase() : undefined;
  }

  private normalizePhone(value?: string): string | undefined {
    const normalized = this.normalizeOptionalText(value);
    if (!normalized) {
      return undefined;
    }

    return normalized.replace(/[^\d+()\-\s]/g, '').replace(/\s+/g, ' ');
  }

  private normalizeOptionalText(value?: string): string | undefined {
    const normalized = value?.trim();
    return normalized && normalized.length > 0 ? normalized : undefined;
  }

  private normalizeIds(ids: string[]): string[] {
    return [...new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0))];
  }

  private computeDisplayName(firstName: string, lastName: string): string {
    return `${firstName} ${lastName}`.trim();
  }

  private toProfessionalDto(
    professional: {
      _id: { toString(): string };
      organizationId: { toString(): string };
      firstName: string;
      lastName: string;
      displayName?: string | null;
      email?: string | null;
      phone?: string | null;
      licenseNumber?: string | null;
      notes?: string | null;
      status: ProfessionalStatus;
      userId?: { toString(): string } | null;
      createdAt: Date;
      updatedAt: Date;
    },
    specialties: SpecialtySummaryDto[]
  ): ProfessionalDto {
    return {
      id: professional._id.toString(),
      organizationId: professional.organizationId.toString(),
      firstName: professional.firstName,
      lastName: professional.lastName,
      displayName: professional.displayName ?? `${professional.firstName} ${professional.lastName}`,
      email: professional.email ?? null,
      phone: professional.phone ?? null,
      licenseNumber: professional.licenseNumber ?? null,
      notes: professional.notes ?? null,
      status: professional.status,
      userId: professional.userId ? professional.userId.toString() : null,
      specialties,
      createdAt: professional.createdAt.toISOString(),
      updatedAt: professional.updatedAt.toISOString()
    };
  }

  private toSpecialtyDto(
    specialty: {
      _id: { toString(): string };
      organizationId: { toString(): string };
      name: string;
      description?: string | null;
      status: SpecialtyStatus;
      createdAt: Date;
      updatedAt: Date;
    },
    professionalCount: number
  ): SpecialtyDto {
    return {
      id: specialty._id.toString(),
      organizationId: specialty.organizationId.toString(),
      name: specialty.name,
      description: specialty.description ?? null,
      status: specialty.status,
      professionalCount,
      createdAt: specialty.createdAt.toISOString(),
      updatedAt: specialty.updatedAt.toISOString()
    };
  }
}
