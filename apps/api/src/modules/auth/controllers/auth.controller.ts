import type { Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../../../config/env.js';
import { AuthService } from '../services/auth.service.js';
import type { AuthenticatedRequest } from '../types/auth-request.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

const loginSchema = registerSchema;

const googleSchema = z.object({
  idToken: z.string().min(10),
  photoURL: z.string().url().nullish()
});

const forgotSchema = z.object({
  email: z.string().email()
});

const resetSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8).max(128)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(8).max(128)
});

const authService = new AuthService();

const refreshCookieName = 'refreshToken';
const refreshCookieOptions = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: env.NODE_ENV === 'production',
  path: '/api/auth'
};

export const authController = {
  register: async (req: Request, res: Response): Promise<void> => {
    const data = registerSchema.parse(req.body);
    await authService.registerLocal(data.email, data.password);

    res.status(201).json({
      success: true,
      data: {
        message: 'Registration successful. Check your email to verify account.'
      }
    });
  },

  verifyEmail: async (req: Request, res: Response): Promise<void> => {
    const token = z.string().min(10).parse(req.query.token);
    await authService.verifyEmail(token);

    res.status(200).json({
      success: true,
      data: {
        message: 'Email verified successfully'
      }
    });
  },

  login: async (req: Request, res: Response): Promise<void> => {
    const data = loginSchema.parse(req.body);
    const session = await authService.loginLocal(data.email, data.password);

    res.cookie(refreshCookieName, session.refreshToken, refreshCookieOptions);
    res.status(200).json({
      success: true,
      data: {
        accessToken: session.accessToken,
        user: session.user
      }
    });
  },

  loginWithGoogle: async (req: Request, res: Response): Promise<void> => {
    const data = googleSchema.parse(req.body);
    const session = await authService.loginWithGoogle(data.idToken, data.photoURL ?? null);

    res.cookie(refreshCookieName, session.refreshToken, refreshCookieOptions);
    res.status(200).json({
      success: true,
      data: {
        accessToken: session.accessToken,
        user: session.user
      }
    });
  },

  refresh: async (req: Request, res: Response): Promise<void> => {
    const parsedToken = z.string().min(10).safeParse(req.cookies?.[refreshCookieName]);

    if (!parsedToken.success) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Refresh token is invalid or expired'
        }
      });
      return;
    }

    const session = await authService.refreshSession(parsedToken.data);

    res.cookie(refreshCookieName, session.refreshToken, refreshCookieOptions);
    res.status(200).json({
      success: true,
      data: {
        accessToken: session.accessToken,
        user: session.user
      }
    });
  },

  logout: async (req: Request, res: Response): Promise<void> => {
    const parsedToken = z.string().min(10).safeParse(req.cookies?.[refreshCookieName]);

    if (parsedToken.success) {
      await authService.logout(parsedToken.data);
    }

    res.clearCookie(refreshCookieName, refreshCookieOptions);
    res.status(200).json({
      success: true,
      data: {
        message: 'Logged out'
      }
    });
  },

  logoutAll: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    await authService.logoutAll(req.auth!.userId);

    res.clearCookie(refreshCookieName, refreshCookieOptions);
    res.status(200).json({
      success: true,
      data: {
        message: 'Logged out from all devices'
      }
    });
  },

  forgotPassword: async (req: Request, res: Response): Promise<void> => {
    const data = forgotSchema.parse(req.body);
    await authService.forgotPassword(data.email);

    res.status(200).json({
      success: true,
      data: {
        message: 'If the account exists, a reset email has been sent.'
      }
    });
  },

  resetPassword: async (req: Request, res: Response): Promise<void> => {
    const data = resetSchema.parse(req.body);
    await authService.resetPassword(data.token, data.newPassword);

    res.status(200).json({
      success: true,
      data: {
        message: 'Password reset successfully'
      }
    });
  },

  changePassword: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data = changePasswordSchema.parse(req.body);

    await authService.changePassword(
      req.auth!.userId,
      data.currentPassword,
      data.newPassword
    );

    res.status(200).json({
      success: true,
      data: {
        message: 'Password changed successfully. Please login again.'
      }
    });
  },

  me: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const profile = await authService.getProfile(req.auth!.userId);

    res.status(200).json({
      success: true,
      data: profile
    });
  },

  adminOnly: async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      data: {
        message: 'Admin resource granted'
      }
    });
  }
};