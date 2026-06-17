export type UserRole = 'admin' | 'user';
export type AuthProvider = 'local' | 'google';
export type GlobalRole = 'super_admin' | 'user';
export type OrganizationType = 'clinic' | 'office' | 'esthetic_center' | 'professional_cabinet' | 'other';
export type OrganizationStatus = 'onboarding' | 'active' | 'inactive' | 'suspended' | 'blocked';
export type OrganizationMemberRole = 'owner' | 'admin' | 'staff' | 'patient' | 'professional';
export type OrganizationMemberStatus = 'active' | 'inactive' | 'blocked';

export interface AvatarDto {
  url: string;
  width: number;
  height: number;
  mimeType: string;
  sizeBytes: number;
  updatedAt: string;
}

export interface HealthDto {
  status: 'ok';
  timestamp: string;
  uptimeSeconds: number;
  environment: 'development' | 'test' | 'production';
  readiness: {
    database: 'up' | 'down';
  };
}

export interface AuthUserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  globalRole: GlobalRole;
  provider: AuthProvider;
  emailVerified: boolean;
  status: 'active' | 'inactive' | 'blocked';
  avatar: AvatarDto | null;
}

export interface OrganizationDto {
  id: string;
  name: string;
  displayName: string | null;
  slug: string | null;
  type: OrganizationType;
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  locationLabel: string | null;
  locationPublic: boolean;
  description: string | null;
  logoUrl: string | null;
  status: OrganizationStatus;
  onboardingCompleted: boolean;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationSettingsDto {
  organizationId: string;
  timezone: string;
  locale: string | null;
  currency: string | null;
  onboardingStep: string | null;
  patientCancellationAllowed: boolean;
  patientCancellationHoursLimit: number;
  patientRescheduleAllowed: boolean;
  patientRescheduleHoursLimit: number;
  betaEnabled: boolean;
  betaStartedAt: string | null;
  betaNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMembershipDto {
  organizationId: string;
  role: OrganizationMemberRole;
  status: OrganizationMemberStatus;
  professionalId: string | null;
}

export interface OrganizationProfileDto {
  organization: OrganizationDto;
  settings: OrganizationSettingsDto | null;
  membership: OrganizationMembershipDto;
  onboarding: OrganizationOnboardingStatusDto;
}

export interface OrganizationOnboardingStatusDto {
  organizationId: string;
  status: OrganizationStatus;
  onboardingCompleted: boolean;
  missingFields: string[];
  nextStep: string | null;
}

export interface AuthSessionContextDto {
  user: AuthUserDto;
  organizations: OrganizationDto[];
  memberships: OrganizationMembershipDto[];
  activeOrganizationId: string | null;
  patientProfile: PatientProfileDto | null;
}

export type PushPlatform = 'web' | 'android' | 'ios';
export type PushChannel = 'web_push' | 'mobile_push';
export type PushTokenStatus = 'active' | 'invalid' | 'revoked';

export interface PushDeviceDto {
  id: string;
  token: string;
  platform: PushPlatform;
  channel: PushChannel;
  status: PushTokenStatus;
  deviceName: string | null;
  appVersion: string | null;
  osVersion: string | null;
  lastSeenAt: string;
  invalidatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}


export type ProfessionalStatus = 'active' | 'inactive' | 'archived';
export type AvailabilityReleaseMode = 'free' | 'progressive';
export type SpecialtyStatus = 'active' | 'inactive' | 'archived';

export interface SpecialtySummaryDto {
  id: string;
  name: string;
  status: SpecialtyStatus;
}

export interface ProfessionalDto {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  licenseNumber: string | null;
  notes: string | null;
  avatarUrl: string | null;
  status: ProfessionalStatus;
  userId: string | null;
  accessEnabled?: boolean;
  accessUserId?: string | null;
  accessEmail?: string | null;
  availabilityReleaseMode: AvailabilityReleaseMode;
  availabilityReleaseLimit: number | null;
  specialties: SpecialtySummaryDto[];
  createdAt: string;
  updatedAt: string;
}

export interface SpecialtyDto {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: SpecialtyStatus;
  professionalCount: number;
  createdAt: string;
  updatedAt: string;
}

export type AvailabilityRuleStatus = 'active' | 'inactive' | 'archived';
export type AvailabilityExceptionStatus = 'active' | 'inactive' | 'archived';
export type AvailabilityExceptionType = 'full_day_block' | 'partial_block';

export interface AvailabilityRuleDto {
  id: string;
  organizationId: string;
  professionalId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  appointmentDurationMinutes: number;
  bufferMinutes: number;
  status: AvailabilityRuleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityExceptionDto {
  id: string;
  organizationId: string;
  professionalId: string;
  date: string;
  type: AvailabilityExceptionType;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  status: AvailabilityExceptionStatus;
  createdAt: string;
  updatedAt: string;
}

export type AvailabilityBlockedReason = 'progressive_release' | 'occupied' | 'outside_working_hours' | 'past_time' | 'exception';

export interface AvailabilitySlotDto {
  date: string;
  startTime: string;
  endTime: string;
  startsAtIso: string;
  endsAtIso: string;
  available: boolean;
  blockedReason?: AvailabilityBlockedReason;
  displayLabel?: string;
  releaseBatchIndex?: number;
  releaseBatchActive?: boolean;
}

export interface AvailabilityByDateDto {
  date: string;
  slots: AvailabilitySlotDto[];
}

export interface CalculatedAvailabilityDto {
  professionalId: string;
  organizationId: string;
  timezone: string;
  range: {
    startDate: string;
    endDate: string;
  };
  professionalStatus: ProfessionalStatus;
  availabilityReleaseMode: AvailabilityReleaseMode;
  availabilityReleaseLimit: number | null;
  isBookableInCurrentStage: boolean;
  note: string;
  days: AvailabilityByDateDto[];
  consideredRules: Array<Pick<AvailabilityRuleDto, 'id' | 'weekday' | 'startTime' | 'endTime' | 'status'>>;
  appliedExceptions: Array<Pick<AvailabilityExceptionDto, 'id' | 'date' | 'type' | 'startTime' | 'endTime' | 'status'>>;
}


export type AppointmentStatus = 'booked' | 'confirmed_by_patient' | 'arrived' | 'in_progress' | 'canceled_by_staff' | 'canceled_by_patient' | 'rescheduled' | 'completed' | 'no_show';
export type AppointmentSource = 'staff_manual' | 'admin_manual' | 'patient_self_service' | 'express_booking';
export type AppointmentBeneficiaryType = 'self' | 'family_member';
export type AppointmentDurationMultiplier = 1 | 2;
export type PaymentCoverageType = 'private' | 'health_insurance';

export interface AppointmentStatusHistoryItemDto {
  status: AppointmentStatus;
  changedAt: string;
  changedByUserId: string;
  changedByRole: string;
  note: string | null;
}

export interface AppointmentDto {
  id: string;
  organizationId: string;
  professionalId: string;
  specialtyId: string | null;
  patientProfileId: string | null;
  patientName: string;
  patientEmail: string | null;
  patientPhone: string | null;
  startAt: string;
  endAt: string;
  durationMultiplier: AppointmentDurationMultiplier;
  status: AppointmentStatus;
  source: AppointmentSource;
  notes: string | null;
  createdByUserId: string | null;
  bookedByUserId: string | null;
  beneficiaryType: AppointmentBeneficiaryType;
  familyMemberId: string | null;
  beneficiaryDisplayName: string | null;
  beneficiaryRelationship: string | null;
  paymentCoverageType: PaymentCoverageType;
  healthInsuranceId: string | null;
  healthInsuranceName: string | null;
  insuranceMemberNumber: string | null;
  insurancePlan: string | null;
  canceledByUserId: string | null;
  canceledAt: string | null;
  cancelReason: string | null;
  statusUpdatedAt: string | null;
  statusUpdatedByUserId: string | null;
  statusUpdatedByRole: string | null;
  arrivedAt: string | null;
  startedAt?: string | null;
  startedByUserId?: string | null;
  completedAt?: string | null;
  completedByUserId?: string | null;
  statusHistory: AppointmentStatusHistoryItemDto[];
  rescheduledFromAppointmentId: string | null;
  rescheduledToAppointmentId: string | null;
  createdAt: string;
  updatedAt: string;
  organization?: OrganizationDto | null;
}


export interface ProfessionalPanelMeDto {
  organizationId: string;
  professionalId: string;
  organizationName: string;
  professional: ProfessionalDto;
}

export interface ProfessionalDashboardDto {
  me: ProfessionalPanelMeDto;
  today: string;
  nextAppointment: AppointmentDto | null;
  waitingRoom: AppointmentDto[];
  todayAppointments: AppointmentDto[];
  stats: {
    waiting: number;
    pendingToday: number;
    completedToday: number;
    noShowToday: number;
    canceledToday: number;
  };
}

export interface PatientFamilyMemberDto {
  id: string;
  ownerUserId: string | null;
  patientProfileId: string;
  firstName: string;
  lastName: string;
  relationship: string;
  dateOfBirth: string;
  documentId: string;
  phone: string | null;
  email: string | null;
  sex: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  insuranceProvider: string | null;
  insuranceMemberId: string | null;
  insurancePlan: string | null;
  source?: string | null;
  bloodType: string | null;
  allergies: string | null;
  regularMedication: string | null;
  preexistingConditions: string | null;
  medicalNotes: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PatientOrganizationLinkStatus = 'active' | 'blocked' | 'archived';

export interface PatientProfileDto {
  id: string;
  userId: string | null;
  ownerUserId: string | null;
  relationshipToOwner: string | null;
  isPrimaryProfile: boolean;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  normalizedPhone?: string | null;
  dateOfBirth: string | null;
  documentId: string | null;
  sex: string | null;
  nationality: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  insuranceProvider: string | null;
  insuranceMemberId: string | null;
  insurancePlan: string | null;
  source?: string | null;
  bloodType: string | null;
  allergies: string | null;
  regularMedication: string | null;
  preexistingConditions: string | null;
  previousSurgeries: string | null;
  medicalNotes: string | null;
  contactPreference: string | null;
  acceptsNotifications: boolean;
  acceptsReminders: boolean;
  acceptsEmailCommunications: boolean;
  acceptsWhatsAppCommunications: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PatientOrganizationLinkDto {
  id: string;
  patientProfileId: string;
  organizationId: string;
  status: PatientOrganizationLinkStatus;
  linkedAt: string;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatientOrganizationSummaryDto {
  organization: OrganizationDto;
  link: PatientOrganizationLinkDto;
}

export interface PatientMeDto {
  user: AuthUserDto;
  patientProfile: PatientProfileDto;
  organizations: PatientOrganizationSummaryDto[];
}

export interface OrganizationPatientListItemDto {
  patientProfileId: string;
  linkedAt: string;
  status: PatientOrganizationLinkStatus;
  avatarUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  documentId: string | null;
  phone: string | null;
  email: string | null;
  insuranceProvider: string | null;
  insuranceMemberId: string | null;
  source?: string | null;
  totalAppointments: number;
  lastAppointmentAt: string | null;
  relationshipToOwner: string | null;
  isPrimaryProfile: boolean;
  ownerName: string | null;
  defaultCoverageType?: PaymentCoverageType | null;
  defaultHealthInsuranceName?: string | null;
  defaultInsuranceMemberNumber?: string | null;
}

export type OrganizationHealthInsuranceStatus = 'active' | 'inactive';

export interface OrganizationHealthInsurancePlanDto {
  name: string;
  code: string | null;
  active: boolean;
}

export interface OrganizationHealthInsuranceDto {
  id: string;
  organizationId: string;
  name: string;
  status: OrganizationHealthInsuranceStatus;
  requiresMemberNumber: boolean;
  requiresPlan: boolean;
  notes: string | null;
  plans: OrganizationHealthInsurancePlanDto[];
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationPatientDetailDto {
  patientProfile: PatientProfileDto;
  email: string | null;
  avatarUrl: string | null;
  linkedAt: string;
  linkStatus: PatientOrganizationLinkStatus;
  totalAppointments: number;
  lastAppointmentAt: string | null;
  ownerName: string | null;
  defaultCoverageType?: PaymentCoverageType | null;
  defaultHealthInsuranceName?: string | null;
  defaultInsuranceMemberNumber?: string | null;
}

export interface JoinOrganizationPreviewDto {
  tokenOrSlug: string;
  organization: Pick<OrganizationDto, 'id' | 'name' | 'displayName' | 'slug' | 'status' | 'type' | 'phone' | 'address' | 'city' | 'province' | 'latitude' | 'longitude' | 'locationLabel'>;
}

export type UserEventType =
  | 'patient_joined_organization'
  | 'patient_appointment_booked'
  | 'patient_appointment_canceled'
  | 'patient_appointment_rescheduled';

export interface UserEventDto {
  id: string;
  userId: string;
  organizationId: string | null;
  type: UserEventType;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType =
  | 'appointment_booked'
  | 'appointment_canceled'
  | 'appointment_rescheduled'
  | 'appointment_reminder'
  | 'availability_alert'
  | 'general_event';

export type NotificationChannel = 'in_app' | 'email' | 'push';
export type NotificationStatus = 'pending' | 'delivered' | 'read' | 'failed';

export interface NotificationDto {
  id: string;
  userId: string;
  organizationId: string | null;
  patientProfileId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  actionUrl: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderRuleDto {
  id: string;
  organizationId: string;
  offsetValue: number;
  offsetUnit: 'minutes' | 'hours' | 'days';
  channel: NotificationChannel;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface WaitlistRequestDto {
  id: string;
  organizationId: string;
  patientProfileId: string;
  specialtyId: string | null;
  professionalId: string | null;
  startDate: string;
  endDate: string;
  timeWindowStart: string | null;
  timeWindowEnd: string | null;
  status: 'active' | 'matched' | 'inactive' | 'expired' | 'canceled';
  matchedAt: string | null;
  lastNotifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsSummaryDto {
  filters: {
    from: string;
    to: string;
    professionalId: string | null;
    specialtyId: string | null;
  };
  kpis: {
    totalAppointments: number;
    bookedAppointments: number;
    canceledAppointments: number;
    rescheduledAppointments: number;
    completedAppointments: number;
    confirmedByPatientAppointments: number;
    arrivedAppointments: number;
    noShowAppointments: number;
    attendanceRate: number;
    noShowRate: number;
    uniqueAttendedPatients: number;
    newPatients: number;
    recurringPatients: number;
    cancellationRate: number;
    rescheduleRate: number;
    upcomingAppointments: number;
    notificationsSent: number;
    remindersSent: number;
  };
  byProfessional: Array<{ professionalId: string; label: string; count: number }>;
  bySpecialty: Array<{ specialtyId: string | null; label: string; count: number }>;
  timelineDaily: Array<{ date: string; count: number }>;
  statusBreakdown: Record<string, number>;
  coverage: {
    supported: string[];
    notSupportedYet: string[];
  };
}

export type WhatsAppProviderName = 'manual' | 'noop' | 'meta_cloud_api';
export type AppointmentNotificationType = 'appointment_confirmation' | 'appointment_reminder' | 'appointment_cancellation' | 'appointment_rescheduled';
export type AppointmentNotificationStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'skipped' | 'manual_required' | 'cancelled';

export interface OrganizationWhatsAppSettingsDto {
  organizationId: string;
  enabled: boolean;
  provider: WhatsAppProviderName;
  displayPhoneNumber: string | null;
  meta: {
    phoneNumberId: string | null;
    businessAccountId: string | null;
    apiVersion: string | null;
    hasAccessToken: boolean;
  };
  templates: {
    appointmentConfirmation: string;
    appointmentReminder: string;
    appointmentCancellation: string;
    appointmentRescheduled: string;
  };
  reminderHoursBefore: number;
  secondReminderHoursBefore: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentNotificationDto {
  id: string;
  organizationId: string;
  appointmentId: string;
  channel: 'whatsapp';
  type: AppointmentNotificationType;
  status: AppointmentNotificationStatus;
  scheduledFor: string;
  sentAt: string | null;
  recipientPhone: string;
  normalizedRecipientPhone: string;
  senderDisplayPhone: string | null;
  provider: WhatsAppProviderName | null;
  templateName: string | null;
  templateParams: Record<string, string> | null;
  providerMessageId: string | null;
  error: string | null;
  attempts: number;
  lastAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
}
