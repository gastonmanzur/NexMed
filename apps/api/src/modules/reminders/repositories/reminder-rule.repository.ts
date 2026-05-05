import { ReminderRuleModel, type ReminderRuleDocument } from '../models/reminder-rule.model.js';

export class ReminderRuleRepository {
  async listByOrganization(organizationId: string): Promise<ReminderRuleDocument[]> {
    return ReminderRuleModel.find({ organizationId }).sort({ sortOrder: 1, offsetUnit: 1, offsetValue: -1, createdAt: -1 }).exec();
  }

  async findByIdInOrganization(organizationId: string, id: string): Promise<ReminderRuleDocument | null> {
    return ReminderRuleModel.findOne({ _id: id, organizationId }).exec();
  }

  async listActiveByOrganization(organizationId: string): Promise<ReminderRuleDocument[]> {
    return ReminderRuleModel.find({ organizationId, status: 'active' }).exec();
  }

  async create(input: { organizationId: string; offsetValue: number; offsetUnit: 'minutes' | 'hours' | 'days'; channel: 'in_app' | 'email' | 'push'; status?: 'active' | 'inactive' }): Promise<ReminderRuleDocument> {
    return ReminderRuleModel.create({ ...input, status: input.status ?? 'active' });
  }

  async updateByIdInOrganization(
    organizationId: string,
    id: string,
    update: { offsetValue?: number | undefined; offsetUnit?: 'minutes' | 'hours' | 'days' | undefined; channel?: 'in_app' | 'email' | 'push' | undefined; status?: 'active' | 'inactive' | undefined }
  ): Promise<ReminderRuleDocument | null> {
    return ReminderRuleModel.findOneAndUpdate({ _id: id, organizationId }, { $set: update }, { new: true }).exec();
  }
}
