import { ReminderDispatchModel, type ReminderDispatchDocument } from '../models/reminder-dispatch.model.js';

export class ReminderDispatchRepository {
  async upsertPending(input: { appointmentId: string; organizationId: string; ruleId: string; scheduledFor: Date; channel: 'in_app' | 'email' | 'push' }): Promise<void> {
    await ReminderDispatchModel.findOneAndUpdate(
      { appointmentId: input.appointmentId, ruleId: input.ruleId },
      {
        $set: {
          organizationId: input.organizationId,
          scheduledFor: input.scheduledFor,
          channel: input.channel,
          status: 'pending',
          canceledAt: null,
          cancelReason: null
        }
      },
      { upsert: true, new: true }
    ).exec();
  }

  async cancelPendingByAppointment(appointmentId: string, reason: string): Promise<number> {
    const result = await ReminderDispatchModel.updateMany(
      { appointmentId, status: 'pending' },
      { $set: { status: 'canceled', canceledAt: new Date(), cancelReason: reason } }
    ).exec();
    return result.modifiedCount;
  }

  async findPendingDue(windowStart: Date, windowEnd: Date): Promise<ReminderDispatchDocument[]> {
    return ReminderDispatchModel.find({ status: 'pending', scheduledFor: { $gte: windowStart, $lte: windowEnd } })
      .sort({ scheduledFor: 1 })
      .exec();
  }

  async markSent(dispatchId: string): Promise<void> {
    await ReminderDispatchModel.findOneAndUpdate(
      { _id: dispatchId, status: 'pending' },
      { $set: { status: 'sent', sentAt: new Date() }, $inc: { attemptCount: 1 } }
    ).exec();
  }

  async markFailed(dispatchId: string): Promise<void> {
    await ReminderDispatchModel.findOneAndUpdate(
      { _id: dispatchId, status: 'pending' },
      { $set: { status: 'failed' }, $inc: { attemptCount: 1 } }
    ).exec();
  }
}
