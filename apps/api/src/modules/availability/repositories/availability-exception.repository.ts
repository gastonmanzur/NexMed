import { AvailabilityExceptionModel, type AvailabilityExceptionDocument } from '../models/availability-exception.model.js';

interface CreateAvailabilityExceptionInput {
  organizationId: string;
  professionalId: string;
  date: string;
  type: 'full_day_block' | 'partial_block';
  startTime?: string | undefined;
  endTime?: string | undefined;
  reason?: string | undefined;
  status?: 'active' | 'inactive' | 'archived' | undefined;
}

interface UpdateAvailabilityExceptionInput {
  date?: string | undefined;
  type?: 'full_day_block' | 'partial_block' | undefined;
  startTime?: string | undefined;
  endTime?: string | undefined;
  reason?: string | undefined;
  status?: 'active' | 'inactive' | 'archived' | undefined;
}

export class AvailabilityExceptionRepository {
  async create(input: CreateAvailabilityExceptionInput): Promise<AvailabilityExceptionDocument> {
    return AvailabilityExceptionModel.create(input);
  }

  async findByProfessional(organizationId: string, professionalId: string): Promise<AvailabilityExceptionDocument[]> {
    return AvailabilityExceptionModel.find({ organizationId, professionalId }).sort({ date: 1, startTime: 1 }).exec();
  }

  async findActiveByProfessionalAndDateRange(
    organizationId: string,
    professionalId: string,
    startDate: string,
    endDate: string
  ): Promise<AvailabilityExceptionDocument[]> {
    return AvailabilityExceptionModel.find({
      organizationId,
      professionalId,
      status: 'active',
      date: { $gte: startDate, $lte: endDate }
    })
      .sort({ date: 1, startTime: 1 })
      .exec();
  }

  async findByIdInProfessional(
    organizationId: string,
    professionalId: string,
    exceptionId: string
  ): Promise<AvailabilityExceptionDocument | null> {
    return AvailabilityExceptionModel.findOne({ _id: exceptionId, organizationId, professionalId }).exec();
  }

  async updateByIdInProfessional(
    organizationId: string,
    professionalId: string,
    exceptionId: string,
    input: UpdateAvailabilityExceptionInput
  ): Promise<AvailabilityExceptionDocument | null> {
    return AvailabilityExceptionModel.findOneAndUpdate(
      { _id: exceptionId, organizationId, professionalId },
      { $set: input },
      { new: true }
    ).exec();
  }
}
