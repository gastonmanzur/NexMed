import { WaitlistRequestModel, type WaitlistRequestDocument } from '../models/waitlist-request.model.js';

export class WaitlistRepository {
  async create(input: {
    organizationId: string;
    patientProfileId: string;
    specialtyId?: string | null;
    professionalId?: string | null;
    startDate: string;
    endDate: string;
    timeWindowStart?: string | null;
    timeWindowEnd?: string | null;
    status?: 'active' | 'matched' | 'inactive' | 'expired' | 'canceled';
  }): Promise<WaitlistRequestDocument> {
    return WaitlistRequestModel.create({
      ...input,
      specialtyId: input.specialtyId ?? null,
      professionalId: input.professionalId ?? null,
      timeWindowStart: input.timeWindowStart ?? null,
      timeWindowEnd: input.timeWindowEnd ?? null,
      status: input.status ?? 'active'
    });
  }

  async listByPatient(patientProfileId: string): Promise<WaitlistRequestDocument[]> {
    return WaitlistRequestModel.find({ patientProfileId }).sort({ createdAt: -1 }).exec();
  }

  async findByIdForPatient(id: string, patientProfileId: string): Promise<WaitlistRequestDocument | null> {
    return WaitlistRequestModel.findOne({ _id: id, patientProfileId }).exec();
  }

  async updateById(id: string, update: Record<string, unknown>): Promise<WaitlistRequestDocument | null> {
    return WaitlistRequestModel.findByIdAndUpdate(id, { $set: update }, { new: true }).exec();
  }

  async listPotentialMatches(input: { organizationId: string; date: string }): Promise<WaitlistRequestDocument[]> {
    return WaitlistRequestModel.find({
      organizationId: input.organizationId,
      status: 'active',
      startDate: { $lte: input.date },
      endDate: { $gte: input.date }
    }).exec();
  }
}
