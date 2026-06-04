import mongoose from 'mongoose';
import type {
  AppointmentDto,
  AppointmentDurationMultiplier, AppointmentStatus,
  CalculatedAvailabilityDto,
  JoinOrganizationPreviewDto,
  OrganizationDto,
  PatientFamilyMemberDto,
  PatientMeDto,
  PatientOrganizationSummaryDto,
  PatientProfileDto,
  UserEventDto
} from '@starter/shared-types';
import { AppError } from '../../../core/errors.js';
import { AppointmentsService } from '../../appointments/services/appointments.service.js';
import { AvailabilityService } from '../../availability/services/availability.service.js';
import { UserRepository } from '../../auth/repositories/user.repository.js';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository.js';
import { OrganizationSettingsRepository } from '../../organizations/repositories/organization-settings.repository.js';
import { OrganizationAccessLinkRepository } from '../../organizations/repositories/organization-access-link.repository.js';
import { ProfessionalRepository } from '../../professionals/repositories/professional.repository.js';
import { SpecialtyRepository } from '../../professionals/repositories/specialty.repository.js';
import { PatientOrganizationLinkRepository } from '../repositories/patient-organization-link.repository.js';
import { PatientFamilyMemberRepository } from '../repositories/patient-family-member.repository.js';
import { PatientProfileRepository } from '../repositories/patient-profile.repository.js';
import { UserEventRepository } from '../repositories/user-event.repository.js';
import type { PatientProfileDocument } from '../models/patient-profile.model.js';
import type { PatientFamilyMemberDocument } from '../models/patient-family-member.model.js';

const normalizeOptionalText = (value?: string): string | undefined => {
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
    private readonly userEvents = new UserEventRepository(),
    private readonly familyMembers = new PatientFamilyMemberRepository()
  ) {}

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
        type: organization.type
      }
    };
  }

  async ensurePatientProfile(userId: string): Promise<PatientProfileDocument> {
    const existing = await this.patientProfiles.findByUserId(userId);
    if (existing) return existing;

    const user = await this.users.findById(userId);
    if (!user) throw new AppError('USER_NOT_FOUND', 404, 'User not found');

    return this.patientProfiles.create({
      userId,
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
    return rows.map((row) => this.toFamilyMemberDto(row));
  }

  async createFamilyMember(
    userId: string,
    input: {
      firstName: string;
      lastName: string;
      relationship: string;
      dateOfBirth: string;
      documentId: string;
      phone?: string | undefined;
      notes?: string | undefined;
      isActive?: boolean | undefined;
    }
  ): Promise<PatientFamilyMemberDto> {
    if (!isValidDateOnly(input.dateOfBirth)) {
      throw new AppError('INVALID_DATE_OF_BIRTH', 400, 'dateOfBirth must be YYYY-MM-DD');
    }

    const created = await this.familyMembers.create({
      ownerUserId: userId,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      relationship: input.relationship.trim(),
      dateOfBirth: new Date(`${input.dateOfBirth}T00:00:00.000Z`),
      documentId: input.documentId.trim(),
      ...(input.phone !== undefined ? { phone: normalizePhone(input.phone) ?? null } : {}),
      ...(input.notes !== undefined ? { notes: normalizeOptionalText(input.notes) ?? null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
    });

    return this.toFamilyMemberDto(created);
  }

  async updateFamilyMember(
    userId: string,
    familyMemberId: string,
    input: {
      firstName?: string | undefined;
      lastName?: string | undefined;
      relationship?: string | undefined;
      dateOfBirth?: string | undefined;
      documentId?: string | undefined;
      phone?: string | undefined;
      notes?: string | undefined;
      isActive?: boolean | undefined;
    }
  ): Promise<PatientFamilyMemberDto> {
    if (!isValidObjectId(familyMemberId)) {
      throw new AppError('INVALID_FAMILY_MEMBER_ID', 400, 'familyMemberId is invalid');
    }

    const update: Record<string, unknown> = {
      ...(input.firstName !== undefined ? { firstName: input.firstName.trim() } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName.trim() } : {}),
      ...(input.relationship !== undefined ? { relationship: input.relationship.trim() } : {}),
      ...(input.documentId !== undefined ? { documentId: input.documentId.trim() } : {}),
      ...(input.phone !== undefined ? { phone: normalizePhone(input.phone) ?? null } : {}),
      ...(input.notes !== undefined ? { notes: normalizeOptionalText(input.notes) ?? null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
    };

    if (input.dateOfBirth !== undefined) {
      if (!isValidDateOnly(input.dateOfBirth)) {
        throw new AppError('INVALID_DATE_OF_BIRTH', 400, 'dateOfBirth must be YYYY-MM-DD');
      }
      update.dateOfBirth = new Date(`${input.dateOfBirth}T00:00:00.000Z`);
    }

    const updated = await this.familyMembers.updateByIdForOwner(familyMemberId, userId, update);
    if (!updated) {
      throw new AppError('FAMILY_MEMBER_NOT_FOUND', 404, 'Family member not found');
    }

    return this.toFamilyMemberDto(updated);
  }

  async deleteFamilyMember(userId: string, familyMemberId: string): Promise<void> {
    if (!isValidObjectId(familyMemberId)) {
      throw new AppError('INVALID_FAMILY_MEMBER_ID', 400, 'familyMemberId is invalid');
    }

    const deleted = await this.familyMembers.deleteByIdForOwner(familyMemberId, userId);
    if (!deleted) {
      throw new AppError('FAMILY_MEMBER_NOT_FOUND', 404, 'Family member not found');
    }
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
    input: { professionalId: string; startDate: string; endDate: string }
  ): Promise<CalculatedAvailabilityDto> {
    await this.assertActiveLink(userId, organizationId);
    return this.availability.getCalculatedAvailability(organizationId, input.professionalId, {
      startDate: input.startDate,
      endDate: input.endDate
    });
  }

  async getOrganizationCatalog(userId: string, organizationId: string): Promise<{
    professionals: Array<{ id: string; displayName: string }>;
    specialties: Array<{ id: string; name: string }>;
  }> {
    await this.assertActiveLink(userId, organizationId);

    const [professionals, specialties] = await Promise.all([
      this.professionals.findByOrganization(organizationId),
      this.specialties.findByOrganization(organizationId)
    ]);

    return {
      professionals: professionals
        .filter((item) => item.status === 'active')
        .map((item) => ({ id: item._id.toString(), displayName: item.displayName ?? `${item.firstName} ${item.lastName}`.trim() })),
      specialties: specialties
        .filter((item) => item.status === 'active')
        .map((item) => ({ id: item._id.toString(), name: item.name }))
    };
  }

  async createSelfServiceAppointment(
    userId: string,
    organizationId: string,
    input: {
      professionalId: string;
      specialtyId?: string;
      startAt: string;
      endAt?: string;
      durationMultiplier?: AppointmentDurationMultiplier;
      notes?: string;
      beneficiaryType?: 'self' | 'family_member';
      familyMemberId?: string;
    }
  ): Promise<AppointmentDto> {
    const { patientProfileId } = await this.assertActiveLink(userId, organizationId);
    const profile = await this.ensurePatientProfile(userId);
    const user = await this.users.findById(userId);
    if (!user) throw new AppError('USER_NOT_FOUND', 404, 'User not found');

    if (input.specialtyId) {
      const specialty = await this.specialties.findByIdInOrganization(organizationId, input.specialtyId);
      if (!specialty) {
        throw new AppError('SPECIALTY_NOT_FOUND', 404, 'Specialty not found');
      }
    }

    const professional = await this.professionals.findByIdInOrganization(organizationId, input.professionalId);
    if (!professional || professional.status !== 'active') {
      throw new AppError('PROFESSIONAL_NOT_FOUND', 404, 'Professional not found');
    }

    let patientName = `${profile.firstName ?? user.firstName} ${profile.lastName ?? user.lastName}`.trim();
    let beneficiaryType: 'self' | 'family_member' = 'self';
    let familyMemberId: string | undefined;
    let beneficiaryRelationship: string | undefined;

    if (input.beneficiaryType === 'family_member') {
      if (!input.familyMemberId || !isValidObjectId(input.familyMemberId)) {
        throw new AppError('INVALID_FAMILY_MEMBER_ID', 400, 'familyMemberId is invalid');
      }
      const familyMember = await this.familyMembers.findByIdForOwner(input.familyMemberId, userId);
      if (!familyMember || !familyMember.isActive) {
        throw new AppError('FAMILY_MEMBER_NOT_FOUND', 404, 'Family member not found');
      }
      patientName = `${familyMember.firstName} ${familyMember.lastName}`.trim();
      beneficiaryType = 'family_member';
      familyMemberId = familyMember._id.toString();
      beneficiaryRelationship = familyMember.relationship;
    }

    const appointment = await this.appointmentsService.createAppointment(organizationId, userId, 'patient', {
      professionalId: input.professionalId,
      ...(input.specialtyId ? { specialtyId: input.specialtyId } : {}),
      patientProfileId,
      patientName,
      patientEmail: user.email,
      ...(profile.phone ? { patientPhone: profile.phone } : {}),
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
      body: `Turno para ${new Date(appointment.startAt).toLocaleString('es-AR', { hour12: false })}`
    });

    return this.attachOrganizationToAppointment(appointment);
  }

  async listPatientAppointments(userId: string, input: { status?: AppointmentStatus; organizationId?: string }): Promise<{
    upcoming: AppointmentDto[];
    history: AppointmentDto[];
  }> {
    const profile = await this.ensurePatientProfile(userId);

    if (input.organizationId) {
      await this.assertActiveLink(userId, input.organizationId);
    }

    const rows = await this.appointmentsService.listPatientAppointments(profile._id.toString(), {
      ...(input.status ? { status: input.status } : {}),
      ...(input.organizationId ? { organizationId: input.organizationId } : {})
    });

    const enrichedRows = await this.attachOrganizationsToAppointments(rows);

    const now = Date.now();
    const upcoming = enrichedRows.filter((item) => item.startAt && new Date(item.startAt).getTime() >= now && item.status === 'booked');
    const history = enrichedRows.filter((item) => !upcoming.some((next) => next.id === item.id));

    return { upcoming, history };
  }

  async getPatientAppointment(userId: string, appointmentId: string): Promise<AppointmentDto> {
    const profile = await this.ensurePatientProfile(userId);
    const appointment = await this.appointmentsService.getAppointmentForPatient(profile._id.toString(), appointmentId);
    return this.attachOrganizationToAppointment(appointment);
  }

  async cancelPatientAppointment(userId: string, appointmentId: string, reason?: string): Promise<AppointmentDto> {
    const profile = await this.ensurePatientProfile(userId);
    const appointment = await this.appointmentsService.getAppointmentForPatient(profile._id.toString(), appointmentId);
    await this.assertPatientPolicyAllows(appointment, 'cancel');

    const updated = await this.appointmentsService.cancelAppointmentAsPatient(profile._id.toString(), appointmentId, userId, reason);

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
    const profile = await this.ensurePatientProfile(userId);
    const appointment = await this.appointmentsService.getAppointmentForPatient(profile._id.toString(), appointmentId);
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
      userId: profile.userId.toString(),
      firstName: profile.firstName ?? null,
      lastName: profile.lastName ?? null,
      phone: profile.phone ?? null,
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
      firstName: member.firstName,
      lastName: member.lastName,
      relationship: member.relationship,
      dateOfBirth: member.dateOfBirth.toISOString().slice(0, 10),
      documentId: member.documentId,
      phone: member.phone ?? null,
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
