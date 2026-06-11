import mongoose from 'mongoose';
import type {
  AppointmentDto,
  AppointmentDurationMultiplier, AppointmentStatus,
  CalculatedAvailabilityDto,
  JoinOrganizationPreviewDto,
  OrganizationDto,
  OrganizationHealthInsuranceDto,
  PatientFamilyMemberDto,
  PatientMeDto,
  PatientOrganizationSummaryDto,
  PatientProfileDto,
  UserEventDto
} from '@starter/shared-types';
import { AppError } from '../../../core/errors.js';
import { logger } from '../../../config/logger.js';
import { formatAppointmentDateTimeArgentina } from '../../../core/argentina-date-time.js';
import { AppointmentsService } from '../../appointments/services/appointments.service.js';
import { AvailabilityService } from '../../availability/services/availability.service.js';
import { UserRepository } from '../../auth/repositories/user.repository.js';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository.js';
import { OrganizationSettingsRepository } from '../../organizations/repositories/organization-settings.repository.js';
import { OrganizationAccessLinkRepository } from '../../organizations/repositories/organization-access-link.repository.js';
import { ProfessionalRepository } from '../../professionals/repositories/professional.repository.js';
import { SpecialtyRepository } from '../../professionals/repositories/specialty.repository.js';
import { ProfessionalSpecialtyRepository } from '../../professionals/repositories/professional-specialty.repository.js';
import { PatientOrganizationLinkRepository } from '../repositories/patient-organization-link.repository.js';
import { PatientFamilyMemberRepository } from '../repositories/patient-family-member.repository.js';
import { PatientIdentityRepository } from '../repositories/patient-identity.repository.js';
import { OrganizationPatientProfileRepository } from '../repositories/organization-patient-profile.repository.js';
import { OrganizationHealthInsuranceRepository } from '../../organizations/repositories/organization-health-insurance.repository.js';
import { PatientProfileRepository } from '../repositories/patient-profile.repository.js';
import { UserEventRepository } from '../repositories/user-event.repository.js';
import type { PatientProfileDocument } from '../models/patient-profile.model.js';
import type { PatientFamilyMemberDocument } from '../models/patient-family-member.model.js';

const normalizeOptionalText = (value?: string | null): string | undefined => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
};

const normalizePhone = (value?: string): string | undefined => {
  const normalized = normalizeOptionalText(value);
  if (!normalized) return undefined;
  return normalized.replace(/[^\d+()\-\s]/g, '').replace(/\s+/g, ' ');
};

const isValidDateOnly = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

const isValidObjectId = (value: string): boolean => mongoose.isValidObjectId(value);

const hoursUntil = (iso: string): number => {
  const date = new Date(iso);
  return (date.getTime() - Date.now()) / 3600000;
};

interface FamilyMemberWriteInput {
  firstName?: string;
  lastName?: string;
  relationship?: string;
  dateOfBirth?: string;
  documentId?: string;
  phone?: string;
  email?: string;
  sex?: string;
  address?: string;
  city?: string;
  province?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  insuranceProvider?: string;
  insuranceMemberId?: string;
  insurancePlan?: string;
  bloodType?: string;
  allergies?: string;
  regularMedication?: string;
  preexistingConditions?: string;
  medicalNotes?: string;
  notes?: string;
  isActive?: boolean;
}

export class PatientService {
  constructor(
    private readonly users = new UserRepository(),
    private readonly organizations = new OrganizationRepository(),
    private readonly organizationSettings = new OrganizationSettingsRepository(),
    private readonly organizationAccessLinks = new OrganizationAccessLinkRepository(),
    private readonly patientProfiles = new PatientProfileRepository(),
    private readonly links = new PatientOrganizationLinkRepository(),
    private readonly appointmentsService = new AppointmentsService(),
    private readonly availability = new AvailabilityService(),
    private readonly professionals = new ProfessionalRepository(),
    private readonly specialties = new SpecialtyRepository(),
    private readonly professionalSpecialties = new ProfessionalSpecialtyRepository(),
    private readonly userEvents = new UserEventRepository(),
    private readonly familyMembers = new PatientFamilyMemberRepository(),
    private readonly patientIdentities = new PatientIdentityRepository(),
    private readonly organizationPatientProfiles = new OrganizationPatientProfileRepository(),
    private readonly healthInsurances = new OrganizationHealthInsuranceRepository()
  ) {}


  private isDuplicateKeyError(error: unknown): boolean {
    return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 11000);
  }

  private isDuplicateOrganizationPhoneProfileError(error: unknown): boolean {
    if (!error || typeof error !== 'object' || !('code' in error) || (error as { code?: unknown }).code !== 11000) return false;
    const mongoError = error as { keyPattern?: Record<string, unknown>; index?: string; message?: string };
    return Boolean(
      (mongoError.keyPattern?.organizationId && mongoError.keyPattern?.normalizedPhone)
      || mongoError.index === 'organizationId_1_normalizedPhone_1_partial_unique'
      || mongoError.message?.includes('organizationId_1_normalizedPhone_1_partial_unique')
    );
  }

  async getJoinPreview(tokenOrSlug: string): Promise<JoinOrganizationPreviewDto> {
    const normalized = tokenOrSlug.trim();
    if (!normalized) {
      throw new AppError('INVALID_JOIN_TOKEN', 400, 'Join token is required');
    }

    const organization = await this.resolveOrganizationByToken(normalized);
    if (!organization || organization.status === 'blocked' || organization.status === 'suspended') {
      throw new AppError('ORGANIZATION_NOT_FOUND', 404, 'Organization not available for join');
    }

    return {
      tokenOrSlug: normalized,
      organization: {
        id: organization._id.toString(),
        name: organization.name,
        displayName: organization.displayName ?? null,
        slug: organization.slug ?? null,
        status: organization.status,
        type: organization.type,
        phone: organization.phone ?? null,
        address: organization.address ?? null,
        city: organization.city ?? null,
        province: organization.province ?? null,
        latitude: organization.latitude ?? null,
        longitude: organization.longitude ?? null,
        locationLabel: organization.locationLabel ?? null
      }
    };
  }


  async getPublicCatalog(tokenOrSlug: string): Promise<{
    professionals: Array<{ id: string; displayName: string; specialtyIds: string[] }>;
    specialties: Array<{ id: string; name: string; professionalIds: string[] }>;
  }> {
    const organization = await this.resolveAvailableOrganization(tokenOrSlug);
    return this.buildOrganizationCatalog(organization._id.toString());
  }

  async getPublicAvailability(tokenOrSlug: string, input: { professionalId: string; specialtyId: string; startDate: string; endDate: string }): Promise<CalculatedAvailabilityDto> {
    const organization = await this.resolveAvailableOrganization(tokenOrSlug);
    if (!isValidObjectId(input.professionalId)) throw new AppError('INVALID_PROFESSIONAL_ID', 400, 'professionalId is invalid');
    if (!isValidObjectId(input.specialtyId)) throw new AppError('INVALID_SPECIALTY_ID', 400, 'specialtyId is invalid');
    return this.availability.getCalculatedAvailability(organization._id.toString(), input.professionalId, {
      startDate: input.startDate,
      endDate: input.endDate,
      specialtyId: input.specialtyId
    });
  }

  async listPublicHealthInsurances(tokenOrSlug: string): Promise<OrganizationHealthInsuranceDto[]> {
    const organization = await this.resolveAvailableOrganization(tokenOrSlug);
    const rows = await this.healthInsurances.listByOrganization(organization._id.toString(), true);
    return rows.map((row) => ({
      id: row._id.toString(),
      organizationId: row.organizationId.toString(),
      name: row.name,
      status: row.status,
      requiresMemberNumber: row.requiresMemberNumber,
      requiresPlan: row.requiresPlan,
      notes: row.notes ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    }));
  }

  async createExpressAppointment(tokenOrSlug: string, input: {
    professionalId: string;
    specialtyId: string;
    startAt: string;
    endAt?: string | undefined;
    appointmentType?: 'single' | 'double' | undefined;
    patient: { firstName: string; lastName: string; phone: string; email?: string | undefined; documentNumber?: string | undefined; birthDate?: string | undefined };
    coverage: { type: 'private' | 'health_insurance'; healthInsuranceId?: string | null | undefined; insuranceMemberNumber?: string | null | undefined; insurancePlan?: string | null | undefined };
    reason?: string | undefined;
  }): Promise<AppointmentDto> {
    const organization = await this.resolveAvailableOrganization(tokenOrSlug);
    const organizationId = organization._id.toString();
    const firstName = normalizeOptionalText(input.patient.firstName);
    const lastName = normalizeOptionalText(input.patient.lastName);
    const phone = normalizePhone(input.patient.phone);
    const normalizedPhone = this.normalizePhoneIdentity(input.patient.phone);
    if (!firstName) throw new AppError('INVALID_PATIENT_FIRST_NAME', 400, 'Nombre es obligatorio');
    if (!lastName) throw new AppError('INVALID_PATIENT_LAST_NAME', 400, 'Apellido es obligatorio');
    if (!phone || !normalizedPhone) throw new AppError('INVALID_PATIENT_PHONE', 400, 'El teléfono del paciente es obligatorio.');
    const email = normalizeOptionalText(input.patient.email)?.toLowerCase();
    const documentNumber = normalizeOptionalText(input.patient.documentNumber)?.replace(/\s+/g, '');
    let birthDate: Date | null = null;
    if (input.patient.birthDate) {
      if (!isValidDateOnly(input.patient.birthDate)) throw new AppError('INVALID_BIRTH_DATE', 400, 'birthDate must be YYYY-MM-DD');
      birthDate = new Date(`${input.patient.birthDate}T00:00:00.000Z`);
    }

    let paymentCoverageType: 'private' | 'health_insurance' = 'private';
    let healthInsuranceId: string | null = null;
    let healthInsuranceName = 'Particular';
    const insuranceMemberNumber = normalizeOptionalText(input.coverage.insuranceMemberNumber) ?? null;
    const insurancePlan = normalizeOptionalText(input.coverage.insurancePlan) ?? null;
    if (input.coverage.type === 'health_insurance') {
      if (!input.coverage.healthInsuranceId || !isValidObjectId(input.coverage.healthInsuranceId)) {
        throw new AppError('INVALID_HEALTH_INSURANCE_ID', 400, 'Seleccioná una obra social válida');
      }
      const healthInsurance = await this.healthInsurances.findByIdInOrganization(organizationId, input.coverage.healthInsuranceId);
      if (!healthInsurance || healthInsurance.status !== 'active') throw new AppError('HEALTH_INSURANCE_NOT_AVAILABLE', 400, 'La cobertura seleccionada no está disponible');
      if (healthInsurance.requiresMemberNumber && !insuranceMemberNumber) throw new AppError('INSURANCE_MEMBER_NUMBER_REQUIRED', 400, 'Ingresá el número de afiliado');
      if (healthInsurance.requiresPlan && !insurancePlan) throw new AppError('INSURANCE_PLAN_REQUIRED', 400, 'Ingresá el plan de la cobertura');
      paymentCoverageType = 'health_insurance';
      healthInsuranceId = healthInsurance._id.toString();
      healthInsuranceName = healthInsurance.name;
    }

    let step: 'patient_identity' | 'patient_profile' | 'appointment' = 'patient_identity';
    try {
      let identity = await this.patientIdentities.findByNormalizedPhone(normalizedPhone);
    if (!identity) {
      try {
        identity = await this.patientIdentities.create({ normalizedPhone, firstName, lastName, phone, email: email ?? null, documentNumber: documentNumber ?? null, birthDate });
      } catch (error: unknown) {
        if (!this.isDuplicateKeyError(error)) throw error;
        identity = await this.patientIdentities.findByNormalizedPhone(normalizedPhone);
        if (!identity) throw error;
      }
    } else {
      const identityUpdate: Record<string, unknown> = {};
      if (firstName) identityUpdate.firstName = firstName;
      if (lastName) identityUpdate.lastName = lastName;
      if (phone) identityUpdate.phone = phone;
      if (email) identityUpdate.email = email;
      if (documentNumber) identityUpdate.documentNumber = documentNumber;
      if (birthDate) identityUpdate.birthDate = birthDate;
      if (Object.keys(identityUpdate).length > 0) {
        identity = await this.patientIdentities.updateById(identity._id.toString(), identityUpdate) ?? identity;
      }
    }

      step = 'patient_profile';
    let existingOrgProfile = await this.organizationPatientProfiles.findByOrganizationAndIdentity(organizationId, identity._id.toString());
    if (!existingOrgProfile) {
      existingOrgProfile = await this.organizationPatientProfiles.findByOrganizationAndNormalizedPhone(organizationId, normalizedPhone);
    }

    const existingLinkedCompatProfile = existingOrgProfile?.patientProfileId ? await this.patientProfiles.findById(existingOrgProfile.patientProfileId.toString()) : null;
    const existingPhoneCompatProfile = existingLinkedCompatProfile ?? await this.patientProfiles.findByOrganizationAndNormalizedPhone(organizationId, normalizedPhone);
    const compatProfileUpdate = {
      organizationId,
      firstName,
      lastName,
      phone,
      normalizedPhone,
      dateOfBirth: birthDate,
      documentId: documentNumber ?? null,
      insuranceProvider: healthInsuranceName,
      insuranceMemberId: insuranceMemberNumber,
      insurancePlan,
      source: 'express_booking'
    };
    let compatProfile: PatientProfileDocument;
    if (existingPhoneCompatProfile) {
      compatProfile = await this.patientProfiles.updateById(existingPhoneCompatProfile._id.toString(), compatProfileUpdate) ?? existingPhoneCompatProfile;
    } else {
      try {
        compatProfile = await this.patientProfiles.create({
          userId: null,
          ownerUserId: null,
          isPrimaryProfile: true,
          ...compatProfileUpdate
        });
      } catch (error: unknown) {
        if (!this.isDuplicateOrganizationPhoneProfileError(error)) throw error;

        const racedProfile = await this.patientProfiles.findByOrganizationAndNormalizedPhone(organizationId, normalizedPhone);
        if (!racedProfile) throw error;
        compatProfile = await this.patientProfiles.updateById(racedProfile._id.toString(), compatProfileUpdate) ?? racedProfile;
      }
    }

    const orgProfileInput = {
      patientIdentityId: identity._id.toString(),
      patientProfileId: compatProfile._id.toString(),
      firstName,
      lastName,
      phone,
      normalizedPhone,
      email: email ?? null,
      documentNumber: documentNumber ?? null,
      birthDate,
      defaultCoverageType: paymentCoverageType,
      defaultHealthInsuranceId: healthInsuranceId,
      defaultHealthInsuranceName: healthInsuranceName,
      defaultInsuranceMemberNumber: insuranceMemberNumber,
      source: 'express_booking' as const,
      ownerUserId: null
    };

    let orgProfile;
    if (existingOrgProfile) {
      orgProfile = await this.organizationPatientProfiles.updateById(existingOrgProfile._id.toString(), orgProfileInput) ?? existingOrgProfile;
    } else {
      try {
        orgProfile = await this.organizationPatientProfiles.create({ organizationId, ...orgProfileInput });
      } catch (error: unknown) {
        if (!this.isDuplicateKeyError(error)) throw error;
        const racedProfile = await this.organizationPatientProfiles.findByOrganizationAndIdentity(organizationId, identity._id.toString())
          ?? await this.organizationPatientProfiles.findByOrganizationAndNormalizedPhone(organizationId, normalizedPhone);
        if (!racedProfile) throw error;
        orgProfile = await this.organizationPatientProfiles.updateById(racedProfile._id.toString(), orgProfileInput) ?? racedProfile;
      }
    }

    await this.links.upsertActive({
      patientProfileId: compatProfile._id.toString(),
      organizationId,
      status: 'active',
      source: 'express_booking'
    });

      step = 'appointment';
      return await this.appointmentsService.createExpressAppointment(organizationId, {
        professionalId: input.professionalId,
        specialtyId: input.specialtyId,
        startAt: input.startAt,
        ...(input.endAt ? { endAt: input.endAt } : {}),
        durationMultiplier: input.appointmentType === 'double' ? 2 : 1,
        patientProfileId: compatProfile._id.toString(),
        patientName: `${orgProfile.firstName} ${orgProfile.lastName}`.trim(),
        patientEmail: email,
        patientPhone: phone,
        notes: normalizeOptionalText(input.reason),
        beneficiaryType: 'self',
        beneficiaryDisplayName: `${orgProfile.firstName} ${orgProfile.lastName}`.trim(),
        paymentCoverageType,
        healthInsuranceId,
        healthInsuranceName,
        insuranceMemberNumber,
        insurancePlan
      });
    } catch (error: unknown) {
      if (error instanceof AppError && ['APPOINTMENT_SLOT_TAKEN', 'APPOINTMENT_OVERLAP', 'SLOT_NOT_AVAILABLE', 'SLOT_BLOCKED_BY_PROGRESSIVE_RELEASE'].includes(error.code)) {
        throw new AppError(error.code, 400, 'El horario seleccionado ya no está disponible.');
      }
      if (!(error instanceof AppError)) {
        logger.error({ err: error, tokenOrSlug, organizationId, professionalId: input.professionalId, specialtyId: input.specialtyId, normalizedPhone, step }, 'Unexpected express appointment error');
      }
      throw error;
    }
  }

  async ensurePatientProfile(userId: string): Promise<PatientProfileDocument> {
    const existing = await this.patientProfiles.findByUserId(userId);
    if (existing) {
      if (!existing.ownerUserId || existing.isPrimaryProfile !== true) {
        const repaired = await this.patientProfiles.updateByUserId(userId, { ownerUserId: userId, isPrimaryProfile: true, relationshipToOwner: null });
        if (repaired) return repaired;
      }
      return existing;
    }

    const user = await this.users.findById(userId);
    if (!user) throw new AppError('USER_NOT_FOUND', 404, 'User not found');

    return this.patientProfiles.create({
      userId,
      ownerUserId: userId,
      isPrimaryProfile: true,
      relationshipToOwner: null,
      firstName: user.firstName,
      lastName: user.lastName
    });
  }

  async resolveJoin(userId: string, tokenOrSlug: string): Promise<PatientOrganizationSummaryDto> {
    const profile = await this.ensurePatientProfile(userId);
    const organization = await this.resolveOrganizationByToken(tokenOrSlug.trim());

    if (!organization || organization.status === 'blocked' || organization.status === 'suspended') {
      throw new AppError('ORGANIZATION_NOT_FOUND', 404, 'Organization not available for join');
    }

    const link = await this.links.upsertActive({
      patientProfileId: profile._id.toString(),
      organizationId: organization._id.toString(),
      status: 'active',
      source: 'join_link'
    });

    await this.userEvents.create({
      userId,
      organizationId: organization._id.toString(),
      type: 'patient_joined_organization',
      title: `Te vinculaste a ${organization.displayName ?? organization.name}`,
      body: 'Ya podés reservar turnos desde tu panel de paciente.'
    });

    return {
      organization: this.toOrganizationDto(organization),
      link: this.toLinkDto(link)
    };
  }

  async getPatientMe(userId: string): Promise<PatientMeDto> {
    const user = await this.users.findById(userId);
    if (!user) throw new AppError('USER_NOT_FOUND', 404, 'User not found');

    const profile = await this.ensurePatientProfile(userId);
    const organizations = await this.listPatientOrganizations(userId);

    return {
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        globalRole: (user.globalRole ?? 'user') as 'super_admin' | 'user',
        provider: user.provider,
        emailVerified: user.emailVerified,
        status: (user.status ?? 'active') as 'active' | 'inactive' | 'blocked',
        avatar: null
      },
      patientProfile: this.toPatientProfileDto(profile),
      organizations
    };
  }

  async updateMyProfile(
    userId: string,
    input: {
      firstName?: string | undefined;
      lastName?: string | undefined;
      phone?: string | undefined;
      dateOfBirth?: string | undefined;
      documentId?: string | undefined;
      sex?: string | undefined;
      nationality?: string | undefined;
      address?: string | undefined;
      city?: string | undefined;
      province?: string | undefined;
      emergencyContactName?: string | undefined;
      emergencyContactPhone?: string | undefined;
      emergencyContactRelationship?: string | undefined;
      insuranceProvider?: string | undefined;
      insuranceMemberId?: string | undefined;
      insurancePlan?: string | undefined;
      bloodType?: string | undefined;
      allergies?: string | undefined;
      regularMedication?: string | undefined;
      preexistingConditions?: string | undefined;
      previousSurgeries?: string | undefined;
      medicalNotes?: string | undefined;
      contactPreference?: string | undefined;
      acceptsNotifications?: boolean | undefined;
      acceptsReminders?: boolean | undefined;
      acceptsEmailCommunications?: boolean | undefined;
      acceptsWhatsAppCommunications?: boolean | undefined;
    }
  ): Promise<PatientProfileDto> {
    await this.ensurePatientProfile(userId);

    const normalizeDni = (value?: string): string | undefined => {
      const normalized = normalizeOptionalText(value);
      if (!normalized) return undefined;
      const compact = normalized.replace(/\s+/g, '');
      if (!/^\d{6,15}$/.test(compact)) {
        throw new AppError('INVALID_DOCUMENT_ID', 400, 'documentId tiene formato inválido');
      }
      return compact;
    };

    const phone = normalizePhone(input.phone);
    const emergencyContactPhone = normalizePhone(input.emergencyContactPhone);
    const documentId = normalizeDni(input.documentId);

    let dateOfBirth: Date | null | undefined;
    if (input.dateOfBirth !== undefined) {
      if (!isValidDateOnly(input.dateOfBirth)) throw new AppError('INVALID_DATE_OF_BIRTH', 400, 'dateOfBirth must be YYYY-MM-DD');
      dateOfBirth = new Date(`${input.dateOfBirth}T00:00:00.000Z`);
    }

    const updated = await this.patientProfiles.updateByUserId(userId, {
      ...(input.firstName !== undefined ? { firstName: normalizeOptionalText(input.firstName) ?? null } : {}),
      ...(input.lastName !== undefined ? { lastName: normalizeOptionalText(input.lastName) ?? null } : {}),
      ...(input.phone !== undefined ? { phone: phone ?? null } : {}),
      ...(input.documentId !== undefined ? { documentId: documentId ?? null } : {}),
      ...(input.dateOfBirth !== undefined ? { dateOfBirth: dateOfBirth ?? null } : {}),
      ...(input.sex !== undefined ? { sex: normalizeOptionalText(input.sex) ?? null } : {}),
      ...(input.nationality !== undefined ? { nationality: normalizeOptionalText(input.nationality) ?? null } : {}),
      ...(input.address !== undefined ? { address: normalizeOptionalText(input.address) ?? null } : {}),
      ...(input.city !== undefined ? { city: normalizeOptionalText(input.city) ?? null } : {}),
      ...(input.province !== undefined ? { province: normalizeOptionalText(input.province) ?? null } : {}),
      ...(input.emergencyContactName !== undefined ? { emergencyContactName: normalizeOptionalText(input.emergencyContactName) ?? null } : {}),
      ...(input.emergencyContactPhone !== undefined ? { emergencyContactPhone: emergencyContactPhone ?? null } : {}),
      ...(input.emergencyContactRelationship !== undefined ? { emergencyContactRelationship: normalizeOptionalText(input.emergencyContactRelationship) ?? null } : {}),
      ...(input.insuranceProvider !== undefined ? { insuranceProvider: normalizeOptionalText(input.insuranceProvider) ?? null } : {}),
      ...(input.insuranceMemberId !== undefined ? { insuranceMemberId: normalizeOptionalText(input.insuranceMemberId) ?? null } : {}),
      ...(input.insurancePlan !== undefined ? { insurancePlan: normalizeOptionalText(input.insurancePlan) ?? null } : {}),
      ...(input.bloodType !== undefined ? { bloodType: normalizeOptionalText(input.bloodType) ?? null } : {}),
      ...(input.allergies !== undefined ? { allergies: normalizeOptionalText(input.allergies) ?? null } : {}),
      ...(input.regularMedication !== undefined ? { regularMedication: normalizeOptionalText(input.regularMedication) ?? null } : {}),
      ...(input.preexistingConditions !== undefined ? { preexistingConditions: normalizeOptionalText(input.preexistingConditions) ?? null } : {}),
      ...(input.previousSurgeries !== undefined ? { previousSurgeries: normalizeOptionalText(input.previousSurgeries) ?? null } : {}),
      ...(input.medicalNotes !== undefined ? { medicalNotes: normalizeOptionalText(input.medicalNotes) ?? null } : {}),
      ...(input.contactPreference !== undefined ? { contactPreference: normalizeOptionalText(input.contactPreference) ?? null } : {}),
      ...(input.acceptsNotifications !== undefined ? { acceptsNotifications: input.acceptsNotifications } : {}),
      ...(input.acceptsReminders !== undefined ? { acceptsReminders: input.acceptsReminders } : {}),
      ...(input.acceptsEmailCommunications !== undefined ? { acceptsEmailCommunications: input.acceptsEmailCommunications } : {}),
      ...(input.acceptsWhatsAppCommunications !== undefined ? { acceptsWhatsAppCommunications: input.acceptsWhatsAppCommunications } : {})
    });

    if (!updated) throw new AppError('PATIENT_PROFILE_NOT_FOUND', 404, 'Patient profile not found');

    const requiredMissing =
      !updated.firstName || !updated.lastName || !updated.documentId || !updated.dateOfBirth || !updated.phone ||
      !updated.emergencyContactName || !updated.emergencyContactPhone || !updated.emergencyContactRelationship;
    if (requiredMissing) throw new AppError('PATIENT_PROFILE_REQUIRED_FIELDS', 400, 'Completá los campos obligatorios del perfil');

    return this.toPatientProfileDto(updated);
  }

  async listFamilyMembers(userId: string): Promise<PatientFamilyMemberDto[]> {
    const rows = await this.familyMembers.listByOwnerUser(userId);
    const repaired = await Promise.all(rows.map((row) => this.ensureFamilyMemberProfile(userId, row)));
    return repaired.map((row) => this.toFamilyMemberDto(row));
  }

  async getFamilyMember(userId: string, familyMemberId: string): Promise<PatientFamilyMemberDto> {
    if (!isValidObjectId(familyMemberId)) {
      throw new AppError('INVALID_FAMILY_MEMBER_ID', 400, 'familyMemberId is invalid');
    }
    const row = await this.familyMembers.findByIdForOwner(familyMemberId, userId);
    if (!row) throw new AppError('FAMILY_MEMBER_NOT_FOUND', 404, 'Family member not found');
    return this.toFamilyMemberDto(await this.ensureFamilyMemberProfile(userId, row));
  }

  async createFamilyMember(
    userId: string,
    input: FamilyMemberWriteInput
  ): Promise<PatientFamilyMemberDto> {
    if (!input.dateOfBirth || !isValidDateOnly(input.dateOfBirth)) {
      throw new AppError('INVALID_DATE_OF_BIRTH', 400, 'dateOfBirth must be YYYY-MM-DD');
    }

    const normalized = this.normalizeFamilyMemberInput(input, true);
    const dateOfBirth = new Date(`${input.dateOfBirth}T00:00:00.000Z`);
    const profile = await this.patientProfiles.create({
      userId: null,
      ownerUserId: userId,
      isPrimaryProfile: false,
      relationshipToOwner: normalized.relationship ?? null,
      firstName: normalized.firstName ?? null,
      lastName: normalized.lastName ?? null,
      dateOfBirth,
      documentId: normalized.documentId ?? null,
      phone: normalized.phone ?? null,
      sex: normalized.sex ?? null,
      address: normalized.address ?? null,
      city: normalized.city ?? null,
      province: normalized.province ?? null,
      emergencyContactName: normalized.emergencyContactName ?? null,
      emergencyContactPhone: normalized.emergencyContactPhone ?? null,
      emergencyContactRelationship: normalized.emergencyContactRelationship ?? null,
      insuranceProvider: normalized.insuranceProvider ?? null,
      insuranceMemberId: normalized.insuranceMemberId ?? null,
      insurancePlan: normalized.insurancePlan ?? null,
      bloodType: normalized.bloodType ?? null,
      allergies: normalized.allergies ?? null,
      regularMedication: normalized.regularMedication ?? null,
      preexistingConditions: normalized.preexistingConditions ?? null,
      medicalNotes: normalized.medicalNotes ?? null
    });

    const created = await this.familyMembers.create({
      ownerUserId: userId,
      patientProfileId: profile._id.toString(),
      firstName: normalized.firstName!,
      lastName: normalized.lastName!,
      relationship: normalized.relationship!,
      dateOfBirth,
      documentId: normalized.documentId!,
      phone: normalized.phone ?? null,
      email: normalized.email ?? null,
      sex: normalized.sex ?? null,
      address: normalized.address ?? null,
      city: normalized.city ?? null,
      province: normalized.province ?? null,
      emergencyContactName: normalized.emergencyContactName ?? null,
      emergencyContactPhone: normalized.emergencyContactPhone ?? null,
      emergencyContactRelationship: normalized.emergencyContactRelationship ?? null,
      insuranceProvider: normalized.insuranceProvider ?? null,
      insuranceMemberId: normalized.insuranceMemberId ?? null,
      insurancePlan: normalized.insurancePlan ?? null,
      bloodType: normalized.bloodType ?? null,
      allergies: normalized.allergies ?? null,
      regularMedication: normalized.regularMedication ?? null,
      preexistingConditions: normalized.preexistingConditions ?? null,
      medicalNotes: normalized.medicalNotes ?? null,
      notes: normalized.notes ?? null,
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
    });

    return this.toFamilyMemberDto(created);
  }

  async updateFamilyMember(
    userId: string,
    familyMemberId: string,
    input: Partial<FamilyMemberWriteInput>
  ): Promise<PatientFamilyMemberDto> {
    if (!isValidObjectId(familyMemberId)) {
      throw new AppError('INVALID_FAMILY_MEMBER_ID', 400, 'familyMemberId is invalid');
    }

    const existing = await this.familyMembers.findByIdForOwner(familyMemberId, userId);
    if (!existing) throw new AppError('FAMILY_MEMBER_NOT_FOUND', 404, 'Family member not found');

    const normalized = this.normalizeFamilyMemberInput(input, false);
    const update: Record<string, unknown> = { ...normalized };

    if (input.dateOfBirth !== undefined) {
      if (!isValidDateOnly(input.dateOfBirth)) {
        throw new AppError('INVALID_DATE_OF_BIRTH', 400, 'dateOfBirth must be YYYY-MM-DD');
      }
      update.dateOfBirth = new Date(`${input.dateOfBirth}T00:00:00.000Z`);
    }

    if (input.isActive !== undefined) update.isActive = input.isActive;

    const updated = await this.familyMembers.updateByIdForOwner(familyMemberId, userId, update);
    if (!updated) throw new AppError('FAMILY_MEMBER_NOT_FOUND', 404, 'Family member not found');

    await this.patientProfiles.updateByIdForOwner(updated.patientProfileId.toString(), userId, {
      ...(updated.firstName !== undefined ? { firstName: updated.firstName } : {}),
      ...(updated.lastName !== undefined ? { lastName: updated.lastName } : {}),
      ...(updated.relationship !== undefined ? { relationshipToOwner: updated.relationship } : {}),
      ...(updated.dateOfBirth !== undefined ? { dateOfBirth: updated.dateOfBirth } : {}),
      ...(updated.documentId !== undefined ? { documentId: updated.documentId } : {}),
      phone: updated.phone ?? null,
      sex: updated.sex ?? null,
      address: updated.address ?? null,
      city: updated.city ?? null,
      province: updated.province ?? null,
      emergencyContactName: updated.emergencyContactName ?? null,
      emergencyContactPhone: updated.emergencyContactPhone ?? null,
      emergencyContactRelationship: updated.emergencyContactRelationship ?? null,
      insuranceProvider: updated.insuranceProvider ?? null,
      insuranceMemberId: updated.insuranceMemberId ?? null,
      insurancePlan: updated.insurancePlan ?? null,
      bloodType: updated.bloodType ?? null,
      allergies: updated.allergies ?? null,
      regularMedication: updated.regularMedication ?? null,
      preexistingConditions: updated.preexistingConditions ?? null,
      medicalNotes: updated.medicalNotes ?? null
    });

    return this.toFamilyMemberDto(updated);
  }

  async deleteFamilyMember(userId: string, familyMemberId: string): Promise<void> {
    if (!isValidObjectId(familyMemberId)) {
      throw new AppError('INVALID_FAMILY_MEMBER_ID', 400, 'familyMemberId is invalid');
    }

    const updated = await this.familyMembers.updateByIdForOwner(familyMemberId, userId, { isActive: false });
    if (!updated) throw new AppError('FAMILY_MEMBER_NOT_FOUND', 404, 'Family member not found');
  }

  async listPatientOrganizations(userId: string): Promise<PatientOrganizationSummaryDto[]> {
    const profile = await this.ensurePatientProfile(userId);
    const links = await this.links.listByPatientProfile(profile._id.toString());
    if (links.length === 0) return [];

    const organizations = await this.organizations.findByIds(links.map((item) => item.organizationId.toString()));
    const byId = new Map(organizations.map((organization) => [organization._id.toString(), organization]));

    return links
      .map((link) => {
        const organization = byId.get(link.organizationId.toString());
        if (!organization) return null;

        return {
          organization: this.toOrganizationDto(organization),
          link: this.toLinkDto(link)
        };
      })
      .filter((item): item is PatientOrganizationSummaryDto => item !== null);
  }

  async assertActiveLink(userId: string, organizationId: string): Promise<{ patientProfileId: string }> {
    if (!isValidObjectId(organizationId)) {
      throw new AppError('INVALID_ORGANIZATION_ID', 400, 'organizationId is invalid');
    }

    const profile = await this.ensurePatientProfile(userId);
    const link = await this.links.findByPatientAndOrganization(profile._id.toString(), organizationId);
    if (!link || link.status !== 'active') {
      throw new AppError('FORBIDDEN', 403, 'No tenés vínculo activo con este centro');
    }

    return { patientProfileId: profile._id.toString() };
  }

  async getAvailabilityForPatient(
    userId: string,
    organizationId: string,
    input: { professionalId: string; specialtyId: string; startDate: string; endDate: string }
  ): Promise<CalculatedAvailabilityDto> {
    await this.assertActiveLink(userId, organizationId);
    if (!isValidObjectId(input.professionalId)) {
      throw new AppError('INVALID_PROFESSIONAL_ID', 400, 'professionalId is invalid');
    }
    if (!isValidObjectId(input.specialtyId)) {
      throw new AppError('INVALID_SPECIALTY_ID', 400, 'specialtyId is invalid');
    }
    return this.availability.getCalculatedAvailability(organizationId, input.professionalId, {
      startDate: input.startDate,
      endDate: input.endDate,
      specialtyId: input.specialtyId
    });
  }

  async getOrganizationCatalog(userId: string, organizationId: string): Promise<{
    professionals: Array<{ id: string; displayName: string; specialtyIds: string[] }>;
    specialties: Array<{ id: string; name: string; professionalIds: string[] }>;
  }> {
    await this.assertActiveLink(userId, organizationId);

    return this.buildOrganizationCatalog(organizationId);
  }

  private async buildOrganizationCatalog(organizationId: string): Promise<{
    professionals: Array<{ id: string; displayName: string; specialtyIds: string[] }>;
    specialties: Array<{ id: string; name: string; professionalIds: string[] }>;
  }> {
    const [professionals, specialties] = await Promise.all([
      this.professionals.findByOrganization(organizationId),
      this.specialties.findByOrganization(organizationId)
    ]);

    const activeProfessionals = professionals.filter((item) => item.status === 'active');
    const activeSpecialties = specialties.filter((item) => item.status === 'active');
    const activeProfessionalIds = new Set(activeProfessionals.map((item) => item._id.toString()));
    const activeSpecialtyIds = new Set(activeSpecialties.map((item) => item._id.toString()));
    const mappings = activeProfessionals.length > 0
      ? await this.professionalSpecialties.findByProfessionalIds(organizationId, [...activeProfessionalIds])
      : [];

    const specialtyIdsByProfessional = new Map<string, string[]>();
    const professionalIdsBySpecialty = new Map<string, string[]>();

    for (const mapping of mappings) {
      const professionalId = mapping.professionalId.toString();
      const specialtyId = mapping.specialtyId.toString();
      if (!activeProfessionalIds.has(professionalId) || !activeSpecialtyIds.has(specialtyId)) continue;
      specialtyIdsByProfessional.set(professionalId, [...(specialtyIdsByProfessional.get(professionalId) ?? []), specialtyId]);
      professionalIdsBySpecialty.set(specialtyId, [...(professionalIdsBySpecialty.get(specialtyId) ?? []), professionalId]);
    }

    return {
      professionals: activeProfessionals.map((item) => {
        const id = item._id.toString();
        return {
          id,
          displayName: item.displayName ?? `${item.firstName} ${item.lastName}`.trim(),
          specialtyIds: specialtyIdsByProfessional.get(id) ?? []
        };
      }),
      specialties: activeSpecialties.map((item) => {
        const id = item._id.toString();
        return { id, name: item.name, professionalIds: professionalIdsBySpecialty.get(id) ?? [] };
      })
    };
  }

  async createSelfServiceAppointment(
    userId: string,
    organizationId: string,
    input: {
      professionalId: string;
      specialtyId: string;
      startAt: string;
      endAt?: string;
      durationMultiplier?: AppointmentDurationMultiplier;
      notes?: string;
      beneficiaryType?: 'self' | 'family_member';
      familyMemberId?: string;
      patientProfileId?: string;
    }
  ): Promise<AppointmentDto> {
    const { patientProfileId: primaryPatientProfileId } = await this.assertActiveLink(userId, organizationId);
    const profile = await this.ensurePatientProfile(userId);
    const user = await this.users.findById(userId);
    if (!user) throw new AppError('USER_NOT_FOUND', 404, 'User not found');

    if (!isValidObjectId(input.professionalId)) {
      throw new AppError('INVALID_PROFESSIONAL_ID', 400, 'professionalId is invalid');
    }
    if (!isValidObjectId(input.specialtyId)) {
      throw new AppError('INVALID_SPECIALTY_ID', 400, 'specialtyId is invalid');
    }

    const specialty = await this.specialties.findByIdInOrganization(organizationId, input.specialtyId);
    if (!specialty || specialty.status !== 'active') {
      throw new AppError('SPECIALTY_NOT_FOUND', 404, 'Specialty not found');
    }

    const professional = await this.professionals.findByIdInOrganization(organizationId, input.professionalId);
    if (!professional || professional.status !== 'active') {
      throw new AppError('PROFESSIONAL_NOT_FOUND', 404, 'Professional not found');
    }

    const isValidCombination = await this.professionalSpecialties.existsForProfessionalAndSpecialty(
      organizationId,
      input.professionalId,
      input.specialtyId
    );
    if (!isValidCombination) {
      throw new AppError('INVALID_SPECIALTY_ASSOCIATION', 400, 'El profesional seleccionado no atiende la especialidad elegida.');
    }

    let patientProfileId = primaryPatientProfileId;
    let patientName = `${profile.firstName ?? user.firstName} ${profile.lastName ?? user.lastName}`.trim();
    let patientPhone = profile.phone ?? undefined;
    let patientEmail = user.email;
    let beneficiaryType: 'self' | 'family_member' = 'self';
    let familyMemberId: string | undefined;
    let beneficiaryRelationship: string | undefined;

    if (input.patientProfileId && input.patientProfileId !== primaryPatientProfileId) {
      if (!isValidObjectId(input.patientProfileId)) {
        throw new AppError('INVALID_PATIENT_PROFILE_ID', 400, 'patientProfileId is invalid');
      }
      const familyMember = await this.familyMembers.findByProfileForOwner(input.patientProfileId, userId);
      if (!familyMember || !familyMember.isActive) {
        throw new AppError('PATIENT_PROFILE_FORBIDDEN', 403, 'El perfil paciente no pertenece a tu cuenta');
      }
      const familyProfile = await this.patientProfiles.findByIdForOwner(input.patientProfileId, userId);
      if (!familyProfile || familyProfile.isPrimaryProfile) {
        throw new AppError('PATIENT_PROFILE_NOT_FOUND', 404, 'Patient profile not found');
      }
      patientProfileId = familyProfile._id.toString();
      patientName = `${familyProfile.firstName ?? familyMember.firstName} ${familyProfile.lastName ?? familyMember.lastName}`.trim();
      patientPhone = familyProfile.phone ?? familyMember.phone ?? undefined;
      patientEmail = familyMember.email ?? user.email;
      beneficiaryType = 'family_member';
      familyMemberId = familyMember._id.toString();
      beneficiaryRelationship = familyMember.relationship;
    } else if (input.beneficiaryType === 'family_member') {
      if (!input.familyMemberId || !isValidObjectId(input.familyMemberId)) {
        throw new AppError('INVALID_FAMILY_MEMBER_ID', 400, 'familyMemberId is invalid');
      }
      const familyMember = await this.familyMembers.findByIdForOwner(input.familyMemberId, userId);
      if (!familyMember || !familyMember.isActive) {
        throw new AppError('FAMILY_MEMBER_NOT_FOUND', 404, 'Family member not found');
      }
      const familyProfile = await this.patientProfiles.findByIdForOwner(familyMember.patientProfileId.toString(), userId);
      if (!familyProfile) throw new AppError('PATIENT_PROFILE_NOT_FOUND', 404, 'Patient profile not found');
      patientProfileId = familyProfile._id.toString();
      patientName = `${familyProfile.firstName ?? familyMember.firstName} ${familyProfile.lastName ?? familyMember.lastName}`.trim();
      patientPhone = familyProfile.phone ?? familyMember.phone ?? undefined;
      patientEmail = familyMember.email ?? user.email;
      beneficiaryType = 'family_member';
      familyMemberId = familyMember._id.toString();
      beneficiaryRelationship = familyMember.relationship;
    }

    const appointment = await this.appointmentsService.createAppointment(organizationId, userId, 'patient', {
      professionalId: input.professionalId,
      specialtyId: input.specialtyId,
      patientProfileId,
      patientName,
      patientEmail,
      ...(patientPhone ? { patientPhone } : {}),
      startAt: input.startAt,
      ...(input.endAt ? { endAt: input.endAt } : {}),
      ...(input.durationMultiplier ? { durationMultiplier: input.durationMultiplier } : {}),
      ...(input.notes ? { notes: normalizeOptionalText(input.notes) } : {}),
      beneficiaryType,
      ...(familyMemberId ? { familyMemberId } : {}),
      beneficiaryDisplayName: patientName,
      ...(beneficiaryRelationship ? { beneficiaryRelationship } : {})
    });

    await this.userEvents.create({
      userId,
      organizationId,
      type: 'patient_appointment_booked',
      title: 'Reserva confirmada',
      body: `Turno reservado para el ${formatAppointmentDateTimeArgentina(appointment.startAt)}.`
    });

    return this.attachOrganizationToAppointment(appointment);
  }

  async listPatientAppointments(userId: string, input: { status?: AppointmentStatus; organizationId?: string }): Promise<{
    upcoming: AppointmentDto[];
    history: AppointmentDto[];
  }> {
    const profileIds = await this.getManagedPatientProfileIds(userId);

    if (input.organizationId) {
      await this.assertAnyManagedProfileLinked(userId, input.organizationId);
    }

    const rows = await this.appointmentsService.listPatientAppointmentsForProfiles(profileIds, {
      ...(input.status ? { status: input.status } : {}),
      ...(input.organizationId ? { organizationId: input.organizationId } : {})
    });

    const enrichedRows = await this.attachOrganizationsToAppointments(rows);

    const now = Date.now();
    const upcoming = enrichedRows.filter((item) => item.startAt && new Date(item.startAt).getTime() >= now && ['booked', 'confirmed_by_patient', 'arrived'].includes(item.status));
    const history = enrichedRows.filter((item) => !upcoming.some((next) => next.id === item.id));

    return { upcoming, history };
  }

  async getPatientAppointment(userId: string, appointmentId: string): Promise<AppointmentDto> {
    const profileIds = await this.getManagedPatientProfileIds(userId);
    const appointment = await this.appointmentsService.getAppointmentForPatientProfiles(profileIds, appointmentId);
    return this.attachOrganizationToAppointment(appointment);
  }


  async confirmAppointmentAttendance(userId: string, appointmentId: string, note?: string): Promise<AppointmentDto> {
    const profileIds = await this.getManagedPatientProfileIds(userId);
    const appointment = await this.appointmentsService.getAppointmentForPatientProfiles(profileIds, appointmentId);

    const updated = await this.appointmentsService.updateAppointmentStatus(appointment.organizationId, appointment.id, userId, 'patient', {
      status: 'confirmed_by_patient',
      ...(note ? { note } : {})
    });

    await this.userEvents.create({
      userId,
      organizationId: appointment.organizationId,
      type: 'patient_appointment_booked',
      title: 'Asistencia confirmada',
      body: 'Confirmaste que vas a asistir al turno.'
    });

    return this.attachOrganizationToAppointment(updated);
  }

  async cancelPatientAppointment(userId: string, appointmentId: string, reason?: string): Promise<AppointmentDto> {
    const profileIds = await this.getManagedPatientProfileIds(userId);
    const appointment = await this.appointmentsService.getAppointmentForPatientProfiles(profileIds, appointmentId);
    await this.assertPatientPolicyAllows(appointment, 'cancel');

    const updated = await this.appointmentsService.cancelAppointmentAsPatient(appointment.patientProfileId!, appointmentId, userId, reason);

    await this.userEvents.create({
      userId,
      organizationId: appointment.organizationId,
      type: 'patient_appointment_canceled',
      title: 'Turno cancelado',
      body: reason ? `Motivo: ${reason}` : null
    });

    return updated;
  }

  async reschedulePatientAppointment(
    userId: string,
    appointmentId: string,
    input: { newProfessionalId?: string; newSpecialtyId?: string; newStartAt: string; newEndAt?: string; reason?: string }
  ): Promise<{ original: AppointmentDto; replacement: AppointmentDto }> {
    const profileIds = await this.getManagedPatientProfileIds(userId);
    const appointment = await this.appointmentsService.getAppointmentForPatientProfiles(profileIds, appointmentId);
    await this.assertPatientPolicyAllows(appointment, 'reschedule');

    const result = await this.appointmentsService.rescheduleAppointment(
      appointment.organizationId,
      appointment.id,
      userId,
      'patient',
      input
    );

    await this.userEvents.create({
      userId,
      organizationId: appointment.organizationId,
      type: 'patient_appointment_rescheduled',
      title: 'Turno reprogramado',
      body: input.reason ? `Motivo: ${input.reason}` : null
    });

    return result;
  }

  async listUserEvents(userId: string): Promise<UserEventDto[]> {
    const rows = await this.userEvents.listByUser(userId, 50);
    return rows.map((row) => ({
      id: row._id.toString(),
      userId: row.userId.toString(),
      organizationId: row.organizationId ? row.organizationId.toString() : null,
      type: row.type,
      title: row.title,
      body: row.body ?? null,
      readAt: row.readAt ? row.readAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    }));
  }

  async markUserEventsRead(userId: string): Promise<void> {
    await this.userEvents.markAllRead(userId);
  }



  private async getManagedPatientProfileIds(userId: string): Promise<string[]> {
    await this.ensurePatientProfile(userId);
    const profiles = await this.patientProfiles.listByOwner(userId);
    return [...new Set(profiles.map((profile) => profile._id.toString()))];
  }

  private async assertAnyManagedProfileLinked(userId: string, organizationId: string): Promise<void> {
    if (!isValidObjectId(organizationId)) {
      throw new AppError('INVALID_ORGANIZATION_ID', 400, 'organizationId is invalid');
    }

    const profileIds = await this.getManagedPatientProfileIds(userId);
    for (const patientProfileId of profileIds) {
      const link = await this.links.findByPatientAndOrganization(patientProfileId, organizationId);
      if (link?.status === 'active') return;
    }

    throw new AppError('FORBIDDEN', 403, 'No tenés vínculo activo con este centro');
  }

  private normalizeFamilyMemberInput(input: Partial<FamilyMemberWriteInput>, requireRequired: boolean): Record<string, string | undefined> {
    const normalized = {
      ...(input.firstName !== undefined ? { firstName: normalizeOptionalText(input.firstName) } : {}),
      ...(input.lastName !== undefined ? { lastName: normalizeOptionalText(input.lastName) } : {}),
      ...(input.relationship !== undefined ? { relationship: normalizeOptionalText(input.relationship) } : {}),
      ...(input.documentId !== undefined ? { documentId: normalizeOptionalText(input.documentId)?.replace(/\s+/g, '') } : {}),
      ...(input.phone !== undefined ? { phone: normalizePhone(input.phone) } : {}),
      ...(input.email !== undefined ? { email: normalizeOptionalText(input.email)?.toLowerCase() } : {}),
      ...(input.sex !== undefined ? { sex: normalizeOptionalText(input.sex) } : {}),
      ...(input.address !== undefined ? { address: normalizeOptionalText(input.address) } : {}),
      ...(input.city !== undefined ? { city: normalizeOptionalText(input.city) } : {}),
      ...(input.province !== undefined ? { province: normalizeOptionalText(input.province) } : {}),
      ...(input.emergencyContactName !== undefined ? { emergencyContactName: normalizeOptionalText(input.emergencyContactName) } : {}),
      ...(input.emergencyContactPhone !== undefined ? { emergencyContactPhone: normalizePhone(input.emergencyContactPhone) } : {}),
      ...(input.emergencyContactRelationship !== undefined ? { emergencyContactRelationship: normalizeOptionalText(input.emergencyContactRelationship) } : {}),
      ...(input.insuranceProvider !== undefined ? { insuranceProvider: normalizeOptionalText(input.insuranceProvider) } : {}),
      ...(input.insuranceMemberId !== undefined ? { insuranceMemberId: normalizeOptionalText(input.insuranceMemberId) } : {}),
      ...(input.insurancePlan !== undefined ? { insurancePlan: normalizeOptionalText(input.insurancePlan) } : {}),
      ...(input.bloodType !== undefined ? { bloodType: normalizeOptionalText(input.bloodType) } : {}),
      ...(input.allergies !== undefined ? { allergies: normalizeOptionalText(input.allergies) } : {}),
      ...(input.regularMedication !== undefined ? { regularMedication: normalizeOptionalText(input.regularMedication) } : {}),
      ...(input.preexistingConditions !== undefined ? { preexistingConditions: normalizeOptionalText(input.preexistingConditions) } : {}),
      ...(input.medicalNotes !== undefined ? { medicalNotes: normalizeOptionalText(input.medicalNotes) } : {}),
      ...(input.notes !== undefined ? { notes: normalizeOptionalText(input.notes) } : {})
    };

    if (requireRequired && (!normalized.firstName || !normalized.lastName || !normalized.relationship || !normalized.documentId)) {
      throw new AppError('FAMILY_MEMBER_REQUIRED_FIELDS', 400, 'Completá nombre, apellido, relación y documento del familiar');
    }

    return normalized;
  }

  private async ensureFamilyMemberProfile(userId: string, member: PatientFamilyMemberDocument): Promise<PatientFamilyMemberDocument> {
    const currentProfileId = member.patientProfileId?.toString();
    if (currentProfileId) {
      const existingProfile = await this.patientProfiles.findByIdForOwner(currentProfileId, userId);
      if (existingProfile) return member;
    }

    const profile = await this.patientProfiles.create({
      userId: null,
      ownerUserId: userId,
      isPrimaryProfile: false,
      relationshipToOwner: member.relationship,
      firstName: member.firstName,
      lastName: member.lastName,
      phone: member.phone ?? null,
      dateOfBirth: member.dateOfBirth,
      documentId: member.documentId,
      sex: member.sex ?? null,
      address: member.address ?? null,
      city: member.city ?? null,
      province: member.province ?? null,
      emergencyContactName: member.emergencyContactName ?? null,
      emergencyContactPhone: member.emergencyContactPhone ?? null,
      emergencyContactRelationship: member.emergencyContactRelationship ?? null,
      insuranceProvider: member.insuranceProvider ?? null,
      insuranceMemberId: member.insuranceMemberId ?? null,
      insurancePlan: member.insurancePlan ?? null,
      bloodType: member.bloodType ?? null,
      allergies: member.allergies ?? null,
      regularMedication: member.regularMedication ?? null,
      preexistingConditions: member.preexistingConditions ?? null,
      medicalNotes: member.medicalNotes ?? null
    });

    const repaired = await this.familyMembers.updateByIdForOwner(member._id.toString(), userId, { patientProfileId: profile._id });
    return repaired ?? member;
  }

  private async attachOrganizationsToAppointments(appointments: AppointmentDto[]): Promise<AppointmentDto[]> {
    const organizationIds = [...new Set(appointments.map((appointment) => appointment.organizationId))];
    const organizations = organizationIds.length > 0 ? await this.organizations.findByIds(organizationIds) : [];
    const organizationById = new Map(organizations.map((organization) => [organization._id.toString(), this.toOrganizationDto(organization)]));

    return appointments.map((appointment) => ({
      ...appointment,
      organization: organizationById.get(appointment.organizationId) ?? null
    }));
  }

  private async attachOrganizationToAppointment(appointment: AppointmentDto): Promise<AppointmentDto> {
    const organization = await this.organizations.findById(appointment.organizationId);
    return {
      ...appointment,
      organization: organization ? this.toOrganizationDto(organization) : null
    };
  }

  private async assertPatientPolicyAllows(appointment: AppointmentDto, action: 'cancel' | 'reschedule'): Promise<void> {
    const settings = await this.organizationSettings.findByOrganizationId(appointment.organizationId);

    const allowed = action === 'cancel'
      ? (settings?.patientCancellationAllowed ?? true)
      : (settings?.patientRescheduleAllowed ?? true);

    if (!allowed) {
      throw new AppError(
        'PATIENT_POLICY_FORBIDDEN',
        409,
        action === 'cancel'
          ? 'Este centro no permite cancelación por pacientes.'
          : 'Este centro no permite reprogramación por pacientes.'
      );
    }

    const limitHours = action === 'cancel'
      ? (settings?.patientCancellationHoursLimit ?? 24)
      : (settings?.patientRescheduleHoursLimit ?? 24);

    if (hoursUntil(appointment.startAt) < limitHours) {
      throw new AppError(
        'PATIENT_POLICY_TIME_LIMIT',
        409,
        action === 'cancel'
          ? `La cancelación solo está permitida hasta ${limitHours} horas antes del turno.`
          : `La reprogramación solo está permitida hasta ${limitHours} horas antes del turno.`
      );
    }
  }


  private normalizePhoneIdentity(value: string): string | undefined {
    const compact = value.replace(/\D/g, '');
    return compact.length >= 8 ? compact : undefined;
  }

  private async resolveAvailableOrganization(tokenOrSlug: string) {
    const normalized = tokenOrSlug.trim();
    if (!normalized) throw new AppError('INVALID_JOIN_TOKEN', 400, 'Join token is required');
    const organization = await this.resolveOrganizationByToken(normalized);
    if (!organization || organization.status === 'blocked' || organization.status === 'suspended') {
      throw new AppError('ORGANIZATION_NOT_FOUND', 404, 'Organization not available');
    }
    return organization;
  }

  private async resolveOrganizationByToken(tokenOrSlug: string) {
    if (isValidObjectId(tokenOrSlug)) {
      const byId = await this.organizations.findById(tokenOrSlug);
      if (byId) return byId;
    }

    const bySlug = await this.organizations.findBySlug(tokenOrSlug);
    if (bySlug) return bySlug;


    const accessLink = await this.organizationAccessLinks.findByToken(tokenOrSlug);
    if (!accessLink || accessLink.status !== 'active') {
      return null;
    }

    return this.organizations.findById(accessLink.organizationId.toString());
  }

  private toPatientProfileDto(profile: PatientProfileDocument): PatientProfileDto {
    return {
      id: profile._id.toString(),
      userId: profile.userId ? profile.userId.toString() : null,
      ownerUserId: profile.ownerUserId ? profile.ownerUserId.toString() : (profile.userId ? profile.userId.toString() : ''),
      relationshipToOwner: profile.relationshipToOwner ?? null,
      isPrimaryProfile: profile.isPrimaryProfile ?? true,
      firstName: profile.firstName ?? null,
      lastName: profile.lastName ?? null,
      phone: profile.phone ?? null,
      normalizedPhone: profile.normalizedPhone ?? null,
      dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.toISOString().slice(0, 10) : null,
      documentId: profile.documentId ?? null,
      sex: profile.sex ?? null,
      nationality: profile.nationality ?? null,
      address: profile.address ?? null,
      city: profile.city ?? null,
      province: profile.province ?? null,
      emergencyContactName: profile.emergencyContactName ?? null,
      emergencyContactPhone: profile.emergencyContactPhone ?? null,
      emergencyContactRelationship: profile.emergencyContactRelationship ?? null,
      insuranceProvider: profile.insuranceProvider ?? null,
      insuranceMemberId: profile.insuranceMemberId ?? null,
      insurancePlan: profile.insurancePlan ?? null,
      source: profile.source ?? null,
      bloodType: profile.bloodType ?? null,
      allergies: profile.allergies ?? null,
      regularMedication: profile.regularMedication ?? null,
      preexistingConditions: profile.preexistingConditions ?? null,
      previousSurgeries: profile.previousSurgeries ?? null,
      medicalNotes: profile.medicalNotes ?? null,
      contactPreference: profile.contactPreference ?? null,
      acceptsNotifications: profile.acceptsNotifications ?? false,
      acceptsReminders: profile.acceptsReminders ?? false,
      acceptsEmailCommunications: profile.acceptsEmailCommunications ?? false,
      acceptsWhatsAppCommunications: profile.acceptsWhatsAppCommunications ?? false,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString()
    };
  }

  private toFamilyMemberDto(member: PatientFamilyMemberDocument): PatientFamilyMemberDto {
    return {
      id: member._id.toString(),
      ownerUserId: member.ownerUserId.toString(),
      patientProfileId: member.patientProfileId.toString(),
      firstName: member.firstName,
      lastName: member.lastName,
      relationship: member.relationship,
      dateOfBirth: member.dateOfBirth.toISOString().slice(0, 10),
      documentId: member.documentId,
      phone: member.phone ?? null,
      email: member.email ?? null,
      sex: member.sex ?? null,
      address: member.address ?? null,
      city: member.city ?? null,
      province: member.province ?? null,
      emergencyContactName: member.emergencyContactName ?? null,
      emergencyContactPhone: member.emergencyContactPhone ?? null,
      emergencyContactRelationship: member.emergencyContactRelationship ?? null,
      insuranceProvider: member.insuranceProvider ?? null,
      insuranceMemberId: member.insuranceMemberId ?? null,
      insurancePlan: member.insurancePlan ?? null,
      bloodType: member.bloodType ?? null,
      allergies: member.allergies ?? null,
      regularMedication: member.regularMedication ?? null,
      preexistingConditions: member.preexistingConditions ?? null,
      medicalNotes: member.medicalNotes ?? null,
      notes: member.notes ?? null,
      isActive: member.isActive,
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString()
    };
  }

  private toOrganizationDto(organization: {
    _id: { toString(): string };
    name: string;
    displayName?: string | null;
    slug?: string | null;
    type: OrganizationDto['type'];
    contactEmail?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    locationLabel?: string | null;
    locationPublic?: boolean | null;
    description?: string | null;
    logoUrl?: string | null;
    status: OrganizationDto['status'];
    onboardingCompleted?: boolean;
    createdByUserId: { toString(): string };
    createdAt: Date;
    updatedAt: Date;
  }): OrganizationDto {
    return {
      id: organization._id.toString(),
      name: organization.name,
      displayName: organization.displayName ?? null,
      slug: organization.slug ?? null,
      type: organization.type,
      contactEmail: organization.contactEmail ?? null,
      phone: organization.phone ?? null,
      address: organization.address ?? null,
      city: organization.city ?? null,
      province: organization.province ?? null,
      postalCode: organization.postalCode ?? null,
      country: organization.country ?? null,
      latitude: typeof organization.latitude === 'number' ? organization.latitude : null,
      longitude: typeof organization.longitude === 'number' ? organization.longitude : null,
      locationLabel: organization.locationLabel ?? null,
      locationPublic: organization.locationPublic ?? false,
      description: organization.description ?? null,
      logoUrl: organization.logoUrl ?? null,
      status: organization.status,
      onboardingCompleted: organization.onboardingCompleted ?? false,
      createdByUserId: organization.createdByUserId.toString(),
      createdAt: organization.createdAt.toISOString(),
      updatedAt: organization.updatedAt.toISOString()
    };
  }

  private toLinkDto(link: {
    _id: { toString(): string };
    patientProfileId: { toString(): string };
    organizationId: { toString(): string };
    status: 'active' | 'blocked' | 'archived';
    linkedAt: Date;
    source?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: link._id.toString(),
      patientProfileId: link.patientProfileId.toString(),
      organizationId: link.organizationId.toString(),
      status: link.status,
      linkedAt: link.linkedAt.toISOString(),
      source: link.source ?? null,
      createdAt: link.createdAt.toISOString(),
      updatedAt: link.updatedAt.toISOString()
    };
  }
}
