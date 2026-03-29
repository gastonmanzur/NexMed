import { ReminderRuleModel, type ReminderRuleDocument } from '../models/reminder-rule.model.js';

export class ReminderRuleRepository {
  async listByOrganization(organizationId: string): Promise<ReminderRuleDocument[]> {
    return ReminderRuleModel.find({ organizationId }).sort({ triggerHoursBefore: -1, createdAt: -1 }).exec();
  }

  async findByIdInOrganization(organizationId: string, id: string): Promise<ReminderRuleDocument | null> {
    return ReminderRuleModel.findOne({ _id: id, organizationId }).exec();
  }

  async listActiveByOrganization(organizationId: string): Promise<ReminderRuleDocument[]> {
    return ReminderRuleModel.find({ organizationId, status: 'active' }).exec();
  }

  async create(input: { organizationId: string; triggerHoursBefore: number; channel: 'in_app' | 'email' | 'push'; status?: 'active' | 'inactive' }): Promise<ReminderRuleDocument> {
    return ReminderRuleModel.create({ ...input, status: input.status ?? 'active' });
  }

  async updateByIdInOrganization(
    organizationId: string,
    id: string,
    update: { triggerHoursBefore?: number | undefined; channel?: 'in_app' | 'email' | 'push' | undefined; status?: 'active' | 'inactive' | undefined }
  ): Promise<ReminderRuleDocument | null> {
    return ReminderRuleModel.findOneAndUpdate({ _id: id, organizationId }, { $set: update }, { new: true }).exec();
  }
}
