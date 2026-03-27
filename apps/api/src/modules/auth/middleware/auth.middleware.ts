import type { NextFunction, Response } from 'express';
import { AppError } from '../../../core/errors.js';
import { TokenService } from '../services/token.service.js';
import type { AuthenticatedRequest } from '../types/auth-request.js';

const tokenService = new TokenService();

export const requireAuth = (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('UNAUTHORIZED', 401, 'Authentication required');
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const payload = tokenService.verifyAccessToken(token);

    req.auth = {
    userId: payload.sub,
    role: payload.role,
    email: payload.email
    };
  } catch {
    throw new AppError('UNAUTHORIZED', 401, 'Invalid or expired access token');
  }

  next();
};

export const requireRoles = (...roles: Array<'admin' | 'user'>) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      throw new AppError('UNAUTHORIZED', 401, 'Authentication required');
    }

    if (!roles.includes(req.auth.role)) {
      throw new AppError('FORBIDDEN', 403, 'Insufficient permissions');
    }

    next();
  };
};
