export type UserRole = 'admin' | 'user';
export type AuthProvider = 'local' | 'google';
export type GlobalRole = 'super_admin' | 'user';
export type OrganizationType = 'clinic' | 'office' | 'esthetic_center' | 'professional_cabinet' | 'other';
export type OrganizationStatus = 'onboarding' | 'active' | 'inactive' | 'suspended' | 'blocked';
export type OrganizationMemberRole = 'owner' | 'admin' | 'staff' | 'patient';
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
  country: string | null;
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
  status: ProfessionalStatus;
  userId: string | null;
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

export interface AvailabilitySlotDto {
  date: string;
  startTime: string;
  endTime: string;
  startsAtIso: string;
  endsAtIso: string;
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
  isBookableInCurrentStage: boolean;
  note: string;
  days: AvailabilityByDateDto[];
  consideredRules: Array<Pick<AvailabilityRuleDto, 'id' | 'weekday' | 'startTime' | 'endTime' | 'status'>>;
  appliedExceptions: Array<Pick<AvailabilityExceptionDto, 'id' | 'date' | 'type' | 'startTime' | 'endTime' | 'status'>>;
}


export type AppointmentStatus = 'booked' | 'canceled_by_staff' | 'canceled_by_patient' | 'rescheduled' | 'completed' | 'no_show';
export type AppointmentSource = 'staff_manual' | 'admin_manual' | 'patient_self_service';
export type AppointmentBeneficiaryType = 'self' | 'family_member';

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
  status: AppointmentStatus;
  source: AppointmentSource;
  notes: string | null;
  createdByUserId: string;
  bookedByUserId: string;
  beneficiaryType: AppointmentBeneficiaryType;
  familyMemberId: string | null;
  beneficiaryDisplayName: string | null;
  beneficiaryRelationship: string | null;
  canceledByUserId: string | null;
  canceledAt: string | null;
  cancelReason: string | null;
  rescheduledFromAppointmentId: string | null;
  rescheduledToAppointmentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatientFamilyMemberDto {
  id: string;
  ownerUserId: string;
  firstName: string;
  lastName: string;
  relationship: string;
  dateOfBirth: string;
  documentId: string;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PatientOrganizationLinkStatus = 'active' | 'blocked' | 'archived';

export interface PatientProfileDto {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  documentId: string | null;
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

export interface JoinOrganizationPreviewDto {
  tokenOrSlug: string;
  organization: Pick<OrganizationDto, 'id' | 'name' | 'displayName' | 'slug' | 'status' | 'type'>;
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
  channel: NotificationChannel;
  status: NotificationStatus;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderRuleDto {
  id: string;
  organizationId: string;
  triggerHoursBefore: number;
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
