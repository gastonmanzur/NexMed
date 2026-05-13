import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../../../core/errors.js';
import { AnalyticsService } from '../services/analytics.service.js';

const service = new AnalyticsService();

const parseDate = (value: string | undefined, fallback: Date): Date => {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new AppError('INVALID_DATE', 400, 'Fecha inválida');
  return d;
};

export const analyticsController = {
  summary: async (req: Request, res: Response) => {
    const organizationId = req.params.organizationId;
    if (!organizationId || !mongoose.isValidObjectId(organizationId)) throw new AppError('INVALID_ORGANIZATION_ID', 400, 'organizationId inválido');

    const to = parseDate(req.query.to as string | undefined, new Date());
    const from = parseDate(req.query.from as string | undefined, new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
    if (from > to) throw new AppError('INVALID_DATE_RANGE', 400, 'from debe ser menor o igual a to');

    const professionalIdRaw = req.query.professionalId;
    const specialtyIdRaw = req.query.specialtyId;
    const professionalId = typeof professionalIdRaw === 'string' ? professionalIdRaw : undefined;
    const specialtyId = typeof specialtyIdRaw === 'string' ? specialtyIdRaw : undefined;
    if (professionalId && !mongoose.isValidObjectId(professionalId)) throw new AppError('INVALID_PROFESSIONAL_ID', 400, 'professionalId inválido');
    if (specialtyId && !mongoose.isValidObjectId(specialtyId)) throw new AppError('INVALID_SPECIALTY_ID', 400, 'specialtyId inválido');

    const data = await service.getOrganizationAnalytics(organizationId, { from, to, professionalId, specialtyId });
    res.json({ success: true, data });
  }
};
