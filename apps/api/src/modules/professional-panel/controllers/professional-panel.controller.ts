import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../auth/types/auth-request.js';
import { ProfessionalPanelService } from '../services/professional-panel.service.js';

const service = new ProfessionalPanelService();
const appointmentParamsSchema = z.object({ appointmentId: z.string().trim().min(1) });

const context = (req: AuthenticatedRequest): { organizationId: string; professionalId: string } => ({
  organizationId: req.auth!.organizationId!,
  professionalId: req.auth!.professionalId!
});

export const professionalPanelController = {
  me: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, professionalId } = context(req);
    res.status(200).json({ success: true, data: await service.me(organizationId, professionalId) });
  },

  dashboard: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, professionalId } = context(req);
    res.status(200).json({ success: true, data: await service.dashboard(organizationId, professionalId) });
  },

  appointments: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, professionalId } = context(req);
    res.status(200).json({ success: true, data: await service.appointmentsForToday(organizationId, professionalId) });
  },

  startAppointment: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, professionalId } = context(req);
    const data = await service.startAppointment(organizationId, professionalId, appointmentParamsSchema.parse(req.params).appointmentId, req.auth!.userId);
    res.status(200).json({ success: true, data });
  },

  completeAppointment: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, professionalId } = context(req);
    const data = await service.completeAppointment(organizationId, professionalId, appointmentParamsSchema.parse(req.params).appointmentId, req.auth!.userId);
    res.status(200).json({ success: true, data });
  },

  waitingRoom: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { organizationId, professionalId } = context(req);
    res.status(200).json({ success: true, data: await service.waitingRoom(organizationId, professionalId) });
  }
};
