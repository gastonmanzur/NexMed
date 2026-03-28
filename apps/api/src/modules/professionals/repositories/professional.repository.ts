import { ProfessionalModel, type ProfessionalDocument } from '../models/professional.model.js';

interface CreateProfessionalInput {
  organizationId: string;
  firstName: string;
  lastName: string;
  displayName?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  licenseNumber?: string | undefined;
  notes?: string | undefined;
  status?: 'active' | 'inactive' | 'archived' | undefined;
  userId?: string | null | undefined;
}

interface UpdateProfessionalInput {
  firstName?: string | undefined;
  lastName?: string | undefined;
  displayName?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  licenseNumber?: string | undefined;
  notes?: string | undefined;
  status?: 'active' | 'inactive' | 'archived' | undefined;
  userId?: string | null | undefined;
}

export class ProfessionalRepository {
  async create(input: CreateProfessionalInput): Promise<ProfessionalDocument> {
    return ProfessionalModel.create(input);
  }

  async findByOrganization(organizationId: string): Promise<ProfessionalDocument[]> {
    return ProfessionalModel.find({ organizationId }).sort({ lastName: 1, firstName: 1 }).exec();
  }

  async findByIdInOrganization(organizationId: string, professionalId: string): Promise<ProfessionalDocument | null> {
    return ProfessionalModel.findOne({ _id: professionalId, organizationId }).exec();
  }

  async updateByIdInOrganization(
    organizationId: string,
    professionalId: string,
    input: UpdateProfessionalInput
  ): Promise<ProfessionalDocument | null> {
    return ProfessionalModel.findOneAndUpdate({ _id: professionalId, organizationId }, { $set: input }, { new: true }).exec();
  }
}
