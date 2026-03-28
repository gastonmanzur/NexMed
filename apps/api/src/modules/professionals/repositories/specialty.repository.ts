import { SpecialtyModel, type SpecialtyDocument } from '../models/specialty.model.js';

interface CreateSpecialtyInput {
  organizationId: string;
  name: string;
  description?: string | undefined;
  status?: 'active' | 'inactive' | 'archived' | undefined;
}

interface UpdateSpecialtyInput {
  name?: string | undefined;
  description?: string | undefined;
  status?: 'active' | 'inactive' | 'archived' | undefined;
}

export class SpecialtyRepository {
  async create(input: CreateSpecialtyInput): Promise<SpecialtyDocument> {
    return SpecialtyModel.create(input);
  }

  async findByOrganization(organizationId: string): Promise<SpecialtyDocument[]> {
    return SpecialtyModel.find({ organizationId }).sort({ name: 1 }).exec();
  }

  async findByOrganizationAndName(organizationId: string, name: string): Promise<SpecialtyDocument | null> {
    return SpecialtyModel.findOne({ organizationId, name }).exec();
  }

  async findByIdsInOrganization(organizationId: string, specialtyIds: string[]): Promise<SpecialtyDocument[]> {
    return SpecialtyModel.find({ organizationId, _id: { $in: specialtyIds } }).exec();
  }

  async findByIdInOrganization(organizationId: string, specialtyId: string): Promise<SpecialtyDocument | null> {
    return SpecialtyModel.findOne({ _id: specialtyId, organizationId }).exec();
  }

  async updateByIdInOrganization(
    organizationId: string,
    specialtyId: string,
    input: UpdateSpecialtyInput
  ): Promise<SpecialtyDocument | null> {
    return SpecialtyModel.findOneAndUpdate({ _id: specialtyId, organizationId }, { $set: input }, { new: true }).exec();
  }
}
