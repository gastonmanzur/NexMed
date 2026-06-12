import type { Response } from 'express';
import { env } from '../../../config/env.js';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../auth/types/auth-request.js';
import { PatientService } from '../services/patient.service.js';

const service = new PatientService();

const joinParamsSchema = z.object({ tokenOrSlug: z.string().trim().min(1) });
const joinSchema = z.object({ tokenOrSlug: z.string().trim().min(1) });
const organizationParamsSchema = z.object({ organizationId: z.string().trim().min(1) });
const availabilityQuerySchema = z.object({
  professionalId: z.string().trim().min(1),
  specialtyId: z.string().trim().min(1),
  startDate: z.string().trim().min(1),
  endDate: z.string().trim().min(1)
});


const expressPatientSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(1).max(40),
  email: z.string().trim().max(160).optional(),
  documentNumber: z.string().trim().max(30).optional(),
  birthDate: z.string().trim().optional()
});

const expressCoverageSchema = z.object({
  type: z.enum(['private', 'health_insurance']),
  healthInsuranceId: z.string().trim().min(1).nullable().optional(),
  insuranceMemberNumber: z.string().trim().max(60).nullable().optional(),
  insurancePlan: z.string().trim().max(60).nullable().optional()
});

const expressAppointmentSchema = z.object({
  professionalId: z.string().trim().min(1),
  specialtyId: z.string().trim().min(1),
  startAt: z.string().trim().min(1),
  endAt: z.string().trim().min(1).optional(),
  appointmentType: z.enum(['single', 'double']).optional(),
  useCurrentExpressPatient: z.boolean().optional(),
  useSavedPatientData: z.boolean().optional(),
  patientLookupToken: z.string().trim().min(1).optional(),
  patient: expressPatientSchema.optional(),
  coverage: expressCoverageSchema.optional(),
  reason: z.string().trim().max(500).optional()
}).superRefine((value, ctx) => {
  const usesSavedPatient = value.useCurrentExpressPatient === true || value.useSavedPatientData === true;
  if (value.useSavedPatientData === true && !value.patientLookupToken) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['patientLookupToken'], message: 'patientLookupToken is required when useSavedPatientData is true' });
  }
  if (!usesSavedPatient && !value.patient) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['patient'], message: 'patient is required unless saved patient data is used' });
  }
  if (!usesSavedPatient && !value.coverage) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['coverage'], message: 'coverage is required unless saved patient data is used' });
  }
});

const patientLookupSchema = z.object({ phone: z.string().trim().min(1).max(40) });
const patientPrefillSchema = z.object({
  phone: z.string().trim().min(1).max(40),
  acceptSavedData: z.literal(true)
});
const patientConfirmSchema = z.object({
  phone: z.string().trim().min(1).max(40),
  confirm: z.boolean().optional(),
  code: z.string().trim().max(12).optional()
});

const expressSessionCookieName = 'patient_express_session';
const legacyExpressSessionCookieName = 'patientExpressSession';
const expressSessionMaxAgeMs = 1000 * 60 * 60 * 24 * 180;
const getExpressSessionCookie = (req: AuthenticatedRequest): string | undefined => req.cookies?.[expressSessionCookieName] ?? req.cookies?.[legacyExpressSessionCookieName];
const expressSessionCookieOptions = (expiresAt?: Date) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.AUTH_COOKIE_SECURE,
  path: '/',
  maxAge: expressSessionMaxAgeMs,
  ...(expiresAt ? { expires: expiresAt } : {})
});

const updateMeSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().min(1).max(40).optional(),
  dateOfBirth: z.string().trim().optional(),
  documentId: z.string().trim().min(1).max(30).optional(),
  sex: z.string().trim().max(20).optional(),
  nationality: z.string().trim().max(60).optional(),
  address: z.string().trim().max(160).optional(),
  city: z.string().trim().max(80).optional(),
  province: z.string().trim().max(80).optional(),
  emergencyContactName: z.string().trim().min(1).max(120).optional(),
  emergencyContactPhone: z.string().trim().min(1).max(40).optional(),
  emergencyContactRelationship: z.string().trim().min(1).max(80).optional(),
  insuranceProvider: z.string().trim().max(120).optional(),
  insuranceMemberId: z.string().trim().max(60).optional(),
  insurancePlan: z.string().trim().max(60).optional(),
  bloodType: z.string().trim().max(8).optional(),
  allergies: z.string().trim().max(1200).optional(),
  regularMedication: z.string().trim().max(1200).optional(),
  preexistingConditions: z.string().trim().max(1200).optional(),
  previousSurgeries: z.string().trim().max(1200).optional(),
  medicalNotes: z.string().trim().max(1200).optional(),
  contactPreference: z.string().trim().max(30).optional(),
  acceptsNotifications: z.boolean().optional(),
  acceptsReminders: z.boolean().optional(),
  acceptsEmailCommunications: z.boolean().optional(),
  acceptsWhatsAppCommunications: z.boolean().optional()
});

const durationMultiplierSchema = z.union([z.literal(1), z.literal(2)]);

const createAppointmentSchema = z.object({
  professionalId: z.string().trim().min(1),
  specialtyId: z.string().trim().min(1),
  startAt: z.string().trim().min(1),
  endAt: z.string().trim().min(1).optional(),
  durationMultiplier: durationMultiplierSchema.optional(),
  notes: z.string().trim().max(500).optional(),
  beneficiaryType: z.enum(['self', 'family_member']).optional(),
  familyMemberId: z.string().trim().min(1).optional(),
  patientProfileId: z.string().trim().min(1).optional()
});

const createFamilyMemberSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  relationship: z.string().trim().min(1).max(80),
  dateOfBirth: z.string().trim().min(1),
  documentId: z.string().trim().min(1).max(60),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().max(120).optional(),
  sex: z.string().trim().max(20).optional(),
  address: z.string().trim().max(160).optional(),
  city: z.string().trim().max(80).optional(),
  province: z.string().trim().max(80).optional(),
  emergencyContactName: z.string().trim().max(120).optional(),
  emergencyContactPhone: z.string().trim().max(40).optional(),
  emergencyContactRelationship: z.string().trim().max(80).optional(),
  insuranceProvider: z.string().trim().max(120).optional(),
  insuranceMemberId: z.string().trim().max(60).optional(),
  insurancePlan: z.string().trim().max(60).optional(),
  bloodType: z.string().trim().max(8).optional(),
  allergies: z.string().trim().max(1200).optional(),
  regularMedication: z.string().trim().max(1200).optional(),
  preexistingConditions: z.string().trim().max(1200).optional(),
  medicalNotes: z.string().trim().max(1200).optional(),
  notes: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional()
});

const familyMemberParamsSchema = z.object({ familyMemberId: z.string().trim().min(1) });

const updateFamilyMemberSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  relationship: z.string().trim().min(1).max(80).optional(),
  dateOfBirth: z.string().trim().min(1).optional(),
  documentId: z.string().trim().min(1).max(60).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().max(120).optional(),
  sex: z.string().trim().max(20).optional(),
  address: z.string().trim().max(160).optional(),
  city: z.string().trim().max(80).optional(),
  province: z.string().trim().max(80).optional(),
  emergencyContactName: z.string().trim().max(120).optional(),
  emergencyContactPhone: z.string().trim().max(40).optional(),
  emergencyContactRelationship: z.string().trim().max(80).optional(),
  insuranceProvider: z.string().trim().max(120).optional(),
  insuranceMemberId: z.string().trim().max(60).optional(),
  insurancePlan: z.string().trim().max(60).optional(),
  bloodType: z.string().trim().max(8).optional(),
  allergies: z.string().trim().max(1200).optional(),
  regularMedication: z.string().trim().max(1200).optional(),
  preexistingConditions: z.string().trim().max(1200).optional(),
  medicalNotes: z.string().trim().max(1200).optional(),
  notes: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional()
});

const appointmentParamsSchema = z.object({ appointmentId: z.string().trim().min(1) });

const listAppointmentsQuerySchema = z.object({
  status: z.enum(['booked', 'confirmed_by_patient', 'arrived', 'canceled_by_staff', 'canceled_by_patient', 'rescheduled', 'completed', 'no_show']).optional(),
  organizationId: z.string().trim().min(1).optional()
});

const cancelSchema = z.object({ reason: z.string().trim().max(300).optional() });
const confirmAttendanceSchema = z.object({ note: z.string().trim().max(300).optional() }).optional();

const rescheduleSchema = z.object({
  newProfessionalId: z.string().trim().min(1).optional(),
  newSpecialtyId: z.string().trim().min(1).optional(),
  newStartAt: z.string().trim().min(1),
  newEndAt: z.string().trim().min(1).optional(),
  reason: z.string().trim().max(300).optional()
});

export const patientController = {
  expressSessionMe: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data = await service.getExpressSession(getExpressSessionCookie(req), req.get('user-agent'));
    res.status(200).json(data);
  },

  joinPatientSession: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { tokenOrSlug } = joinParamsSchema.parse(req.params);
    const data = await service.getJoinExpressSession(tokenOrSlug, getExpressSessionCookie(req), req.get('user-agent'));
    res.status(200).json(data);
  },

  patientLookup: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { tokenOrSlug } = joinParamsSchema.parse(req.params);
    const input = patientLookupSchema.parse(req.body);
    const data = await service.lookupExpressPatient(tokenOrSlug, input);
    res.status(200).json({ success: true, data });
  },

  patientPrefill: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { tokenOrSlug } = joinParamsSchema.parse(req.params);
    const input = patientPrefillSchema.parse(req.body);
    const data = await service.prefillExpressPatient(tokenOrSlug, input);
    res.status(200).json({ success: true, data });
  },

  patientConfirm: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { tokenOrSlug } = joinParamsSchema.parse(req.params);
    const input = patientConfirmSchema.parse(req.body);
    const data = await service.confirmExpressPatient(tokenOrSlug, input, req.get('user-agent'));
    res.cookie(expressSessionCookieName, data.expressSessionToken, expressSessionCookieOptions(data.expiresAt));
    res.status(200).json({ success: true, data: { confirmed: data.confirmed, patient: data.patient } });
  },

  joinPreview: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { tokenOrSlug } = joinParamsSchema.parse(req.params);
    const data = await service.getJoinPreview(tokenOrSlug);
    res.status(200).json({ success: true, data });
  },


  publicCatalog: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { tokenOrSlug } = joinParamsSchema.parse(req.params);
    const data = await service.getPublicCatalog(tokenOrSlug);
    res.status(200).json({ success: true, data });
  },

  publicAvailability: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { tokenOrSlug } = joinParamsSchema.parse(req.params);
    const input = availabilityQuerySchema.parse(req.query);
    const data = await service.getPublicAvailability(tokenOrSlug, input);
    res.status(200).json({ success: true, data });
  },

  publicHealthInsurances: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { tokenOrSlug } = joinParamsSchema.parse(req.params);
    const data = await service.listPublicHealthInsurances(tokenOrSlug);
    res.status(200).json({ success: true, data });
  },

  createExpressAppointment: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { tokenOrSlug } = joinParamsSchema.parse(req.params);
    const input = expressAppointmentSchema.parse(req.body);
    const data = await service.createExpressAppointment(tokenOrSlug, input, getExpressSessionCookie(req), req.get('user-agent'));
    if (data.expressSessionToken) {
      res.cookie(expressSessionCookieName, data.expressSessionToken, expressSessionCookieOptions(data.expressSessionExpiresAt));
    }
    const { expressSessionToken: _token, expressSessionExpiresAt: _expiresAt, ...appointment } = data;
    res.status(201).json({ success: true, data: appointment });
  },

  joinResolve: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { tokenOrSlug } = joinSchema.parse(req.body);
    const data = await service.resolveJoin(req.auth!.userId, tokenOrSlug);
    res.status(200).json({ success: true, data });
  },

  me: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data = await service.getPatientMe(req.auth!.userId);
    res.status(200).json({ success: true, data });
  },

  patchMe: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const input = updateMeSchema.parse(req.body);
    const data = await service.updateMyProfile(req.auth!.userId, input);
    res.status(200).json({ success: true, data });
  },

  organizations: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data = await service.listPatientOrganizations(req.auth!.userId);
    res.status(200).json({ success: true, data });
  },

  availability: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = organizationParamsSchema.parse(req.params);
    const input = availabilityQuerySchema.parse(req.query);
    const data = await service.getAvailabilityForPatient(req.auth!.userId, organizationId, input);
    res.status(200).json({ success: true, data });
  },

  organizationCatalog: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = organizationParamsSchema.parse(req.params);
    const data = await service.getOrganizationCatalog(req.auth!.userId, organizationId);
    res.status(200).json({ success: true, data });
  },

  createAppointment: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId } = organizationParamsSchema.parse(req.params);
    const input = createAppointmentSchema.parse(req.body);
    const data = await service.createSelfServiceAppointment(req.auth!.userId, organizationId, {
      professionalId: input.professionalId,
      startAt: input.startAt,
      specialtyId: input.specialtyId,
      ...(input.endAt !== undefined ? { endAt: input.endAt } : {}),
      ...(input.durationMultiplier !== undefined ? { durationMultiplier: input.durationMultiplier } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.beneficiaryType !== undefined ? { beneficiaryType: input.beneficiaryType } : {}),
      ...(input.familyMemberId !== undefined ? { familyMemberId: input.familyMemberId } : {}),
      ...(input.patientProfileId !== undefined ? { patientProfileId: input.patientProfileId } : {})
    });
    res.status(201).json({ success: true, data });
  },

  listFamilyMembers: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data = await service.listFamilyMembers(req.auth!.userId);
    res.status(200).json({ success: true, data });
  },

  getFamilyMember: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { familyMemberId } = familyMemberParamsSchema.parse(req.params);
    const data = await service.getFamilyMember(req.auth!.userId, familyMemberId);
    res.status(200).json({ success: true, data });
  },

  createFamilyMember: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const input = createFamilyMemberSchema.parse(req.body);
    const data = await service.createFamilyMember(req.auth!.userId, {
      firstName: input.firstName,
      lastName: input.lastName,
      relationship: input.relationship,
      dateOfBirth: input.dateOfBirth,
      documentId: input.documentId,
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.medicalNotes !== undefined ? { medicalNotes: input.medicalNotes } : {}),
      ...(input.preexistingConditions !== undefined ? { preexistingConditions: input.preexistingConditions } : {}),
      ...(input.regularMedication !== undefined ? { regularMedication: input.regularMedication } : {}),
      ...(input.allergies !== undefined ? { allergies: input.allergies } : {}),
      ...(input.bloodType !== undefined ? { bloodType: input.bloodType } : {}),
      ...(input.insurancePlan !== undefined ? { insurancePlan: input.insurancePlan } : {}),
      ...(input.insuranceMemberId !== undefined ? { insuranceMemberId: input.insuranceMemberId } : {}),
      ...(input.insuranceProvider !== undefined ? { insuranceProvider: input.insuranceProvider } : {}),
      ...(input.emergencyContactRelationship !== undefined ? { emergencyContactRelationship: input.emergencyContactRelationship } : {}),
      ...(input.emergencyContactPhone !== undefined ? { emergencyContactPhone: input.emergencyContactPhone } : {}),
      ...(input.emergencyContactName !== undefined ? { emergencyContactName: input.emergencyContactName } : {}),
      ...(input.province !== undefined ? { province: input.province } : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.sex !== undefined ? { sex: input.sex } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
    });
    res.status(201).json({ success: true, data });
  },

  patchFamilyMember: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { familyMemberId } = familyMemberParamsSchema.parse(req.params);
    const input = updateFamilyMemberSchema.parse(req.body);
    const data = await service.updateFamilyMember(req.auth!.userId, familyMemberId, {
      ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
      ...(input.relationship !== undefined ? { relationship: input.relationship } : {}),
      ...(input.dateOfBirth !== undefined ? { dateOfBirth: input.dateOfBirth } : {}),
      ...(input.documentId !== undefined ? { documentId: input.documentId } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.sex !== undefined ? { sex: input.sex } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.province !== undefined ? { province: input.province } : {}),
      ...(input.emergencyContactName !== undefined ? { emergencyContactName: input.emergencyContactName } : {}),
      ...(input.emergencyContactPhone !== undefined ? { emergencyContactPhone: input.emergencyContactPhone } : {}),
      ...(input.emergencyContactRelationship !== undefined ? { emergencyContactRelationship: input.emergencyContactRelationship } : {}),
      ...(input.insuranceProvider !== undefined ? { insuranceProvider: input.insuranceProvider } : {}),
      ...(input.insuranceMemberId !== undefined ? { insuranceMemberId: input.insuranceMemberId } : {}),
      ...(input.insurancePlan !== undefined ? { insurancePlan: input.insurancePlan } : {}),
      ...(input.bloodType !== undefined ? { bloodType: input.bloodType } : {}),
      ...(input.allergies !== undefined ? { allergies: input.allergies } : {}),
      ...(input.regularMedication !== undefined ? { regularMedication: input.regularMedication } : {}),
      ...(input.preexistingConditions !== undefined ? { preexistingConditions: input.preexistingConditions } : {}),
      ...(input.medicalNotes !== undefined ? { medicalNotes: input.medicalNotes } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
    });
    res.status(200).json({ success: true, data });
  },

  deleteFamilyMember: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { familyMemberId } = familyMemberParamsSchema.parse(req.params);
    await service.deleteFamilyMember(req.auth!.userId, familyMemberId);
    res.status(200).json({ success: true, data: { ok: true } });
  },

  listAppointments: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const query = listAppointmentsQuerySchema.parse(req.query);
    const data = await service.listPatientAppointments(req.auth!.userId, {
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.organizationId !== undefined ? { organizationId: query.organizationId } : {})
    });
    res.status(200).json({ success: true, data });
  },

  getAppointment: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { appointmentId } = appointmentParamsSchema.parse(req.params);
    const data = await service.getPatientAppointment(req.auth!.userId, appointmentId);
    res.status(200).json({ success: true, data });
  },

  confirmAppointmentAttendance: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { appointmentId } = appointmentParamsSchema.parse(req.params);
    const input = confirmAttendanceSchema.parse(req.body);
    const data = await service.confirmAppointmentAttendance(req.auth!.userId, appointmentId, input?.note);
    res.status(200).json({ success: true, data });
  },

  cancelAppointment: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { appointmentId } = appointmentParamsSchema.parse(req.params);
    const { reason } = cancelSchema.parse(req.body);
    const data = await service.cancelPatientAppointment(req.auth!.userId, appointmentId, reason);
    res.status(200).json({ success: true, data });
  },

  rescheduleAppointment: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { appointmentId } = appointmentParamsSchema.parse(req.params);
    const input = rescheduleSchema.parse(req.body);
    const data = await service.reschedulePatientAppointment(req.auth!.userId, appointmentId, {
      newStartAt: input.newStartAt,
      ...(input.newProfessionalId !== undefined ? { newProfessionalId: input.newProfessionalId } : {}),
      ...(input.newSpecialtyId !== undefined ? { newSpecialtyId: input.newSpecialtyId } : {}),
      ...(input.newEndAt !== undefined ? { newEndAt: input.newEndAt } : {}),
      ...(input.reason !== undefined ? { reason: input.reason } : {})
    });
    res.status(200).json({ success: true, data });
  },

  listEvents: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data = await service.listUserEvents(req.auth!.userId);
    res.status(200).json({ success: true, data });
  },

  markEventsRead: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    await service.markUserEventsRead(req.auth!.userId);
    res.status(200).json({ success: true, data: { ok: true } });
  }
};
