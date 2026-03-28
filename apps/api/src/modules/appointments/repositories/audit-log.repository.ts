import { AuditLogModel } from '../models/audit-log.model.js';

interface CreateAuditLogInput {
  organizationId: string;
  actorUserId: string;
  action: 'appointment_created' | 'appointment_canceled' | 'appointment_rescheduled';
  entityType: 'appointment';
  entityId: string;
  payload?: Record<string, unknown>;
}

export class AuditLogRepository {
  async create(input: CreateAuditLogInput): Promise<void> {
    await AuditLogModel.create(input);
  }
}
