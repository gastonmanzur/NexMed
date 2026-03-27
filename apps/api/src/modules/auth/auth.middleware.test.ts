import { describe, expect, it } from 'vitest';
import { requireAuth, requireRoles } from './middleware/auth.middleware.js';
import type { AuthenticatedRequest } from './types/auth-request.js';

describe('auth middleware', () => {
  it('throws when token is missing', () => {
    const req = { headers: {} } as AuthenticatedRequest;
    expect(() => requireAuth(req, {} as never, () => undefined)).toThrowError('Authentication required');
  });

  it('throws when user role is not allowed', () => {
    const middleware = requireRoles('admin');
    const req = { auth: { userId: '1', role: 'user', email: 'u@test.com' } } as AuthenticatedRequest;

    expect(() => middleware(req, {} as never, () => undefined)).toThrowError('Insufficient permissions');
  });
});
