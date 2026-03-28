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
