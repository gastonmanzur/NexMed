import type { Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../core/errors.js';
import type { ApiResponse } from '../../core/api-response.js';
import type { AuthenticatedRequest } from '../auth/types/auth-request.js';
import { LandingService } from './landing.service.js';

const draftSchema = z.record(z.any());

export class LandingController {
  constructor(private readonly service = new LandingService()) {}
  getPublished = async (_req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>) => { res.status(200).json({ success: true, data: await this.service.getPublished() }); };
  getAdmin = async (_req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>) => { res.status(200).json({ success: true, data: await this.service.getAdminState() }); };
  saveDraft = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>) => {
    const parsed = draftSchema.parse(req.body); res.status(200).json({ success: true, data: await this.service.saveDraft(parsed) });
  };
  publish = async (_req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>) => { res.status(200).json({ success: true, data: await this.service.publish() }); };
  uploadMedia = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>) => {
    if (!req.file) throw new AppError('INVALID_FILE', 400, 'Missing media file');
    res.status(200).json({ success: true, data: await this.service.uploadMedia(req.file) });
  };
  deleteMedia = async (req: AuthenticatedRequest, res: Response<ApiResponse<unknown>>) => { await this.service.deleteMedia(String(req.body?.url ?? '')); res.status(200).json({ success: true, data: { ok: true } }); };
}
