import { AvailabilityRuleModel, type AvailabilityRuleDocument } from '../models/availability-rule.model.js';

interface CreateAvailabilityRuleInput {
  organizationId: string;
  professionalId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  appointmentDurationMinutes: number;
  bufferMinutes?: number | undefined;
  status?: 'active' | 'inactive' | 'archived' | undefined;
}

interface UpdateAvailabilityRuleInput {
  weekday?: number | undefined;
  startTime?: string | undefined;
  endTime?: string | undefined;
  appointmentDurationMinutes?: number | undefined;
  bufferMinutes?: number | undefined;
  status?: 'active' | 'inactive' | 'archived' | undefined;
}

export class AvailabilityRuleRepository {
  async create(input: CreateAvailabilityRuleInput): Promise<AvailabilityRuleDocument> {
    return AvailabilityRuleModel.create(input);
  }

  async findByProfessional(organizationId: string, professionalId: string): Promise<AvailabilityRuleDocument[]> {
    return AvailabilityRuleModel.find({ organizationId, professionalId }).sort({ weekday: 1, startTime: 1 }).exec();
  }

  async findActiveByProfessional(organizationId: string, professionalId: string): Promise<AvailabilityRuleDocument[]> {
    return AvailabilityRuleModel.find({ organizationId, professionalId, status: 'active' }).sort({ weekday: 1, startTime: 1 }).exec();
  }

  async findByIdInProfessional(
    organizationId: string,
    professionalId: string,
    ruleId: string
  ): Promise<AvailabilityRuleDocument | null> {
    return AvailabilityRuleModel.findOne({ _id: ruleId, organizationId, professionalId }).exec();
  }

  async updateByIdInProfessional(
    organizationId: string,
    professionalId: string,
    ruleId: string,
    input: UpdateAvailabilityRuleInput
  ): Promise<AvailabilityRuleDocument | null> {
    return AvailabilityRuleModel.findOneAndUpdate({ _id: ruleId, organizationId, professionalId }, { $set: input }, { new: true }).exec();
  }
}
