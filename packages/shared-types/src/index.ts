export type UserRole = 'admin' | 'user';
export type AuthProvider = 'local' | 'google';
export type GlobalRole = 'super_admin' | 'user';
export type OrganizationType = 'clinic' | 'office' | 'esthetic_center' | 'professional_cabinet' | 'other';
export type OrganizationStatus = 'onboarding' | 'active' | 'inactive';
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
  slug: string | null;
  type: OrganizationType;
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  status: OrganizationStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMembershipDto {
  organizationId: string;
  role: OrganizationMemberRole;
  status: OrganizationMemberStatus;
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
