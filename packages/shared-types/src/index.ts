export type UserRole = 'admin' | 'user';
export type AuthProvider = 'local' | 'google';

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
  email: string;
  role: UserRole;
  provider: AuthProvider;
  emailVerified: boolean;
  avatar: AvatarDto | null;
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
