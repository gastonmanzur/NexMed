import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../../../core/errors.js';
import { AnalyticsService } from '../services/analytics.service.js';

const service = new AnalyticsService();

const firstQueryValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
  return undefined;
};

const parseDate = (value: string | undefined, fallback: Date): Date => {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new AppError('INVALID_DATE', 400, 'Fecha inválida');
  return d;
};

export const analyticsController = {
  summary: async (req: Request, res: Response) => {
    const organizationId = firstQueryValue(req.params.organizationId);
    if (!organizationId || !mongoose.isValidObjectId(organizationId)) throw new AppError('INVALID_ORGANIZATION_ID', 400, 'organizationId inválido');

    const to = parseDate(firstQueryValue(req.query.to), new Date());
    const from = parseDate(firstQueryValue(req.query.from), new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
    if (from > to) throw new AppError('INVALID_DATE_RANGE', 400, 'from debe ser menor o igual a to');

    const professionalId = firstQueryValue(req.query.professionalId);
    const specialtyId = firstQueryValue(req.query.specialtyId);
    if (professionalId && !mongoose.isValidObjectId(professionalId)) throw new AppError('INVALID_PROFESSIONAL_ID', 400, 'professionalId inválido');
    if (specialtyId && !mongoose.isValidObjectId(specialtyId)) throw new AppError('INVALID_SPECIALTY_ID', 400, 'specialtyId inválido');

    const data = await service.getOrganizationAnalytics(organizationId, {
      from,
      to,
      ...(professionalId ? { professionalId } : {}),
      ...(specialtyId ? { specialtyId } : {})
    });
    res.json({ success: true, data });
  }
};
