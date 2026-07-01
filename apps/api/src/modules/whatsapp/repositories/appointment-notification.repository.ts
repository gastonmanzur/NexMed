import { AppointmentNotificationModel, type AppointmentNotificationDocument } from '../models/appointment-notification.model.js';

type NotificationType = AppointmentNotificationDocument['type'];
type Status = AppointmentNotificationDocument['status'];

export class AppointmentNotificationRepository {
  async create(input: Partial<AppointmentNotificationDocument>): Promise<AppointmentNotificationDocument> {
    return AppointmentNotificationModel.create(input);
  }

  async findById(id: string): Promise<AppointmentNotificationDocument | null> {
    return AppointmentNotificationModel.findById(id).exec();
  }

  async listByAppointment(organizationId: string, appointmentId: string): Promise<AppointmentNotificationDocument[]> {
    return AppointmentNotificationModel.find({ organizationId, appointmentId }).sort({ createdAt: -1 }).exec();
  }

  async listByOrganization(organizationId: string, limit = 100): Promise<AppointmentNotificationDocument[]> {
    return AppointmentNotificationModel.find({ organizationId }).sort({ createdAt: -1 }).limit(limit).exec();
  }

  async findPendingDue(now: Date, limit = 25): Promise<AppointmentNotificationDocument[]> {
    return AppointmentNotificationModel.find({ status: 'pending', scheduledFor: { $lte: now }, attempts: { $lt: 3 } })
      .sort({ scheduledFor: 1, createdAt: 1 })
      .limit(limit)
      .exec();
  }

  async markProcessing(id: string): Promise<AppointmentNotificationDocument | null> {
    return AppointmentNotificationModel.findOneAndUpdate(
      { _id: id, status: 'pending', $expr: { $lt: ['$attempts', '$maxAttempts'] } },
      { $set: { status: 'processing', lockedAt: new Date(), lastAttemptAt: new Date(), error: null, errorMessage: null }, $inc: { attempts: 1 } },
      { new: true }
    ).exec();
  }

  async markFinished(id: string, update: Partial<AppointmentNotificationDocument>): Promise<AppointmentNotificationDocument | null> {
    return AppointmentNotificationModel.findByIdAndUpdate(id, { $set: update }, { new: true }).exec();
  }

  async cancelPendingByAppointment(appointmentId: string, types?: NotificationType[], error = 'appointment_changed'): Promise<number> {
    const result = await AppointmentNotificationModel.updateMany(
      {
        appointmentId,
        status: { $in: ['pending', 'processing'] satisfies Status[] },
        ...(types?.length ? { type: { $in: types } } : {})
      },
      { $set: { status: 'cancelled', cancelledAt: new Date(), error, errorMessage: error } }
    ).exec();
    return result.modifiedCount;
  }

  async cancelPendingByPatient(organizationId: string, patientProfileId: string, error = 'patient_whatsapp_opt_out'): Promise<number> {
    const result = await AppointmentNotificationModel.updateMany(
      { organizationId, patientProfileId, status: 'pending', scheduledFor: { $gte: new Date() } },
      { $set: { status: 'cancelled', cancelledAt: new Date(), error, errorMessage: error } }
    ).exec();
    return result.modifiedCount;
  }

}
