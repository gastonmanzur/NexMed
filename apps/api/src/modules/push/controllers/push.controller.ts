import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../auth/types/auth-request.js';
import type { PushDeviceDocument } from '../models/push-device.model.js';
import { PushService } from '../services/push.service.js';

const registerSchema = z.object({
  token: z.string().min(20),
  platform: z.enum(['web', 'android', 'ios']),
  channel: z.enum(['web_push', 'mobile_push']),
  deviceName: z.string().min(1).max(120).optional(),
  appVersion: z.string().min(1).max(50).optional(),
  osVersion: z.string().min(1).max(50).optional()
});

const refreshSchema = z.object({ oldToken: z.string().min(20), newToken: z.string().min(20) });
const unregisterSchema = z.object({ token: z.string().min(20) });

const sendSchema = z.object({
  targetUserId: z.string().min(8),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
  data: z.record(z.string(), z.string()).optional()
});

const sendTestSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
  data: z.record(z.string(), z.string()).optional()
});

const service = new PushService();

const toDeviceDto = (device: PushDeviceDocument) => ({
  id: device._id.toString(),
  token: device.token,
  platform: device.platform,
  channel: device.channel,
  status: device.status,
  deviceName: device.deviceName ?? null,
  appVersion: device.appVersion ?? null,
  osVersion: device.osVersion ?? null,
  lastSeenAt: device.lastSeenAt.toISOString(),
  invalidatedAt: device.invalidatedAt ? device.invalidatedAt.toISOString() : null,
  createdAt: device.createdAt.toISOString(),
  updatedAt: device.updatedAt.toISOString()
});

export const pushController = {
  register: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data = registerSchema.parse(req.body);
    const userAgentHeader = req.headers['user-agent'];
    const device = await service.registerDevice({
      userId: req.auth!.userId,
      ...data,
      ...(typeof userAgentHeader === 'string' ? { userAgent: userAgentHeader } : {})
    });
    res.status(201).json({ success: true, data: { device: toDeviceDto(device) } });
  },

  refresh: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data = refreshSchema.parse(req.body);
    const device = await service.refreshDeviceToken(req.auth!.userId, data.oldToken, data.newToken);
    res.status(200).json({ success: true, data: { device: toDeviceDto(device) } });
  },

  unregister: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data = unregisterSchema.parse(req.body);
    await service.unregisterDevice(req.auth!.userId, data.token);
    res.status(200).json({ success: true, data: { message: 'Push device removed' } });
  },

  listMine: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const devices = await service.listMyDevices(req.auth!.userId);
    res.status(200).json({ success: true, data: { devices: devices.map(toDeviceDto) } });
  },


  sendTestMine: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data = sendTestSchema.parse(req.body);
    const report = await service.sendToUser({
      actorUserId: req.auth!.userId,
      actorRole: req.auth!.role,
      targetUserId: req.auth!.userId,
      title: data.title,
      body: data.body,
      ...(data.data ? { data: data.data } : {})
    });
    res.status(200).json({ success: true, data: report });
  },

  sendAdmin: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data = sendSchema.parse(req.body);
    const report = await service.sendToUser({
      actorUserId: req.auth!.userId,
      actorRole: req.auth!.role,
      targetUserId: data.targetUserId,
      title: data.title,
      body: data.body,
      ...(data.data ? { data: data.data } : {})
    });
    res.status(200).json({ success: true, data: report });
  }
};
