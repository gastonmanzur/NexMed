import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../auth/types/auth-request.js';
import { ClinicalService } from '../services/clinical.service.js';

const service = new ClinicalService();
const appointmentParam = z.object({ appointmentId: z.string().min(1) });
const patientParam = z.object({ patientProfileId: z.string().min(1) });
const encounterParam = z.object({ encounterId: z.string().min(1) });
const orgParam = z.object({ organizationId: z.string().min(1) });
const orgMessageParam = orgParam.extend({ messageId: z.string().min(1) });
const orgAppointmentParam = orgParam.extend({ appointmentId: z.string().min(1) });
const messageParam = z.object({ messageId: z.string().min(1) });
const ctx = (req: AuthenticatedRequest) => {
  const userAgent = req.get('user-agent');
  return { organizationId: req.auth!.organizationId!, professionalId: req.auth!.professionalId!, userId: req.auth!.userId, meta: { ...(req.ip ? { ip: req.ip } : {}), ...(userAgent ? { userAgent } : {}) } };
};

export const clinicalController = {
  attention: async (req: AuthenticatedRequest, res: Response) => {
    const c = ctx(req); const { appointmentId } = appointmentParam.parse(req.params);
    res.json({ success: true, data: await service.attention(c.organizationId, c.professionalId, appointmentId, c.userId, c.meta) });
  },
  getRecord: async (req: AuthenticatedRequest, res: Response) => {
    const c = ctx(req); const { patientProfileId } = patientParam.parse(req.params);
    res.json({ success: true, data: await service.getRecord(c.organizationId, c.professionalId, patientProfileId, c.userId, c.meta) });
  },
  updateRecord: async (req: AuthenticatedRequest, res: Response) => {
    const c = ctx(req); const { patientProfileId } = patientParam.parse(req.params);
    res.json({ success: true, data: await service.updateRecord(c.organizationId, c.professionalId, patientProfileId, c.userId, req.body, c.meta) });
  },
  encounters: async (req: AuthenticatedRequest, res: Response) => {
    const c = ctx(req); const { patientProfileId } = patientParam.parse(req.params);
    res.json({ success: true, data: await service.encounters(c.organizationId, c.professionalId, patientProfileId, c.userId, c.meta) });
  },
  saveEncounter: async (req: AuthenticatedRequest, res: Response) => {
    const c = ctx(req); const { appointmentId } = appointmentParam.parse(req.params);
    res.status(201).json({ success: true, data: await service.saveEncounter(c.organizationId, c.professionalId, appointmentId, c.userId, req.body, c.meta) });
  },
  patchEncounter: async (req: AuthenticatedRequest, res: Response) => {
    const c = ctx(req); const { encounterId } = encounterParam.parse(req.params);
    res.json({ success: true, data: await service.patchEncounter(c.organizationId, c.professionalId, encounterId, c.userId, req.body, c.meta) });
  },
  signEncounter: async (req: AuthenticatedRequest, res: Response) => {
    const c = ctx(req); const { encounterId } = encounterParam.parse(req.params);
    res.json({ success: true, data: await service.signEncounter(c.organizationId, c.professionalId, encounterId, c.userId, c.meta) });
  },
  professionalMessages: async (req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, data: await service.listMessages(req.auth!.organizationId!, req.auth!.userId, 'professional') });
  },
  createProfessionalMessage: async (req: AuthenticatedRequest, res: Response) => {
    const c = ctx(req);
    res.status(201).json({ success: true, data: await service.createProfessionalMessage(c.organizationId, c.professionalId, req.body.appointmentId, c.userId, req.body) });
  },
  readProfessionalMessage: async (req: AuthenticatedRequest, res: Response) => {
    const { messageId } = messageParam.parse(req.params);
    res.json({ success: true, data: await service.markMessage(req.auth!.organizationId!, messageId, 'read') });
  },
  resolveProfessionalMessage: async (req: AuthenticatedRequest, res: Response) => {
    const { messageId } = messageParam.parse(req.params);
    res.json({ success: true, data: await service.markMessage(req.auth!.organizationId!, messageId, 'resolved') });
  },
  organizationMessages: async (req: AuthenticatedRequest, res: Response) => {
    const { organizationId } = orgParam.parse(req.params);
    const query = z.object({ status: z.enum(['unread', 'read', 'resolved']).optional(), appointmentId: z.string().min(1).optional(), limit: z.coerce.number().int().positive().max(100).optional() }).parse(req.query);
    res.json({ success: true, data: await service.listMessages(organizationId, req.auth!.userId, 'secretary', query) });
  },
  createOrganizationAppointmentMessage: async (req: AuthenticatedRequest, res: Response) => {
    const { organizationId, appointmentId } = orgAppointmentParam.parse(req.params);
    res.status(201).json({ success: true, data: await service.createSecretaryMessage(organizationId, appointmentId, req.auth!.userId, req.body) });
  },
  readOrganizationMessage: async (req: AuthenticatedRequest, res: Response) => {
    const { organizationId, messageId } = orgMessageParam.parse(req.params);
    res.json({ success: true, data: await service.markMessage(organizationId, messageId, 'read') });
  },
  resolveOrganizationMessage: async (req: AuthenticatedRequest, res: Response) => {
    const { organizationId, messageId } = orgMessageParam.parse(req.params);
    res.json({ success: true, data: await service.markMessage(organizationId, messageId, 'resolved') });
  }
};
