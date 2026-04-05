import mongoose from 'mongoose';
import type { AppointmentDto } from '@starter/shared-types';
import { AppError } from '../../../core/errors.js';
import { PatientProfileRepository } from '../../patient/repositories/patient-profile.repository.js';
import { PushService } from '../../push/services/push.service.js';
import { NotificationRepository } from '../repositories/notification.repository.js';
import { notificationChannels, notificationStatuses, notificationTypes } from '../models/notification.model.js';

export class NotificationService {
  constructor(
    private readonly notifications = new NotificationRepository(),
    private readonly patientProfiles = new PatientProfileRepository(),
    private readonly push = new PushService()
  ) {}

  async listMyNotifications(userId: string, input: { read?: 'read' | 'unread' | undefined }) {
    const rows = await this.notifications.listByUser(userId, {
      ...(input.read === 'unread' ? { unreadOnly: true } : {}),
      ...(input.read === 'read' ? { readOnly: true } : {})
    });

    return rows.map((row) => this.toDto(row));
  }

  async markRead(userId: string, notificationId: string) {
    if (!mongoose.isValidObjectId(notificationId)) {
      throw new AppError('INVALID_NOTIFICATION_ID', 400, 'notificationId is invalid');
    }

    const row = await this.notifications.markRead(notificationId, userId);
    if (!row) {
      throw new AppError('NOTIFICATION_NOT_FOUND', 404, 'Notification not found');
    }

    return this.toDto(row);
  }

  async create(input: {
    userId: string;
    organizationId?: string | null;
    patientProfileId?: string | null;
    type: (typeof notificationTypes)[number];
    title: string;
    message: string;
    relatedEntityType?: string | null;
    relatedEntityId?: string | null;
    channel?: (typeof notificationChannels)[number];
    status?: (typeof notificationStatuses)[number];
  }) {
    if (input.relatedEntityId) {
      const exists = await this.notifications.existsByDedupKey({
        userId: input.userId,
        type: input.type,
        relatedEntityId: input.relatedEntityId,
        channel: input.channel ?? 'in_app'
      });
      if (exists) return;
    }

    const channel = input.channel ?? 'in_app';
    await this.notifications.create(input);
    await this.dispatchPushIfEnabled({
      userId: input.userId,
      title: input.title,
      message: input.message,
      channel
    });
  }

  async notifyPatientFromAppointment(
    appointment: AppointmentDto,
    type: 'appointment_booked' | 'appointment_canceled' | 'appointment_rescheduled' | 'appointment_reminder',
    title: string,
    message: string,
    relatedEntityId?: string
  ): Promise<void> {
    if (!appointment.patientProfileId) return;

    const patientProfile = await this.patientProfiles.findById(appointment.patientProfileId);
    if (!patientProfile) return;

    await this.create({
      userId: patientProfile.userId.toString(),
      organizationId: appointment.organizationId,
      patientProfileId: appointment.patientProfileId,
      type,
      title,
      message,
      relatedEntityType: 'appointment',
      relatedEntityId: relatedEntityId ?? appointment.id,
      channel: 'in_app',
      status: 'delivered'
    });
  }

  private toDto(row: {
    _id: { toString(): string };
    userId: { toString(): string };
    organizationId?: { toString(): string } | null;
    patientProfileId?: { toString(): string } | null;
    type: (typeof notificationTypes)[number];
    title: string;
    message: string;
    relatedEntityType?: string | null;
    relatedEntityId?: string | null;
    channel: (typeof notificationChannels)[number];
    status: (typeof notificationStatuses)[number];
    readAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row._id.toString(),
      userId: row.userId.toString(),
      organizationId: row.organizationId ? row.organizationId.toString() : null,
      patientProfileId: row.patientProfileId ? row.patientProfileId.toString() : null,
      type: row.type,
      title: row.title,
      message: row.message,
      relatedEntityType: row.relatedEntityType ?? null,
      relatedEntityId: row.relatedEntityId ?? null,
      channel: row.channel,
      status: row.status,
      readAt: row.readAt ? row.readAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  private async dispatchPushIfEnabled(input: {
    userId: string;
    title: string;
    message: string;
    channel: (typeof notificationChannels)[number];
  }): Promise<void> {
    if (input.channel !== 'in_app' && input.channel !== 'push') {
      return;
    }

    try {
      await this.push.sendToUser({
        actorUserId: input.userId,
        actorRole: 'user',
        targetUserId: input.userId,
        title: input.title,
        body: input.message,
        data: { source: 'notification_service' }
      });
    } catch {
      // Keep in-app notification flow stable even when push delivery fails.
    }
  }
}
