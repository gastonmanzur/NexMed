import type { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  role: 'admin' | 'user';
  email: string;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthenticatedUser;
}
