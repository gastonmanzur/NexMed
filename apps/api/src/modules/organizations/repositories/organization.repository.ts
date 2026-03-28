import { OrganizationModel, type OrganizationDocument } from '../models/organization.model.js';

interface CreateOrganizationInput {
  name: string;
  displayName?: string | undefined;
  slug?: string | undefined;
  type: 'clinic' | 'office' | 'esthetic_center' | 'professional_cabinet' | 'other';
  contactEmail?: string | undefined;
  phone?: string | undefined;
  address?: string | undefined;
  city?: string | undefined;
  country?: string | undefined;
  description?: string | undefined;
  logoUrl?: string | undefined;
  onboardingCompleted?: boolean | undefined;
  createdByUserId: string;
}

interface UpdateOrganizationInput {
  name?: string | undefined;
  displayName?: string | undefined;
  type?: 'clinic' | 'office' | 'esthetic_center' | 'professional_cabinet' | 'other' | undefined;
  contactEmail?: string | undefined;
  phone?: string | undefined;
  address?: string | undefined;
  city?: string | undefined;
  country?: string | undefined;
  description?: string | undefined;
  logoUrl?: string | undefined;
  status?: 'onboarding' | 'active' | 'inactive' | 'suspended' | 'blocked' | undefined;
  onboardingCompleted?: boolean | undefined;
}

export class OrganizationRepository {
  async create(input: CreateOrganizationInput): Promise<OrganizationDocument> {
    return OrganizationModel.create(input);
  }

  async findById(id: string): Promise<OrganizationDocument | null> {
    return OrganizationModel.findById(id).exec();
  }

  async findByIds(ids: string[]): Promise<OrganizationDocument[]> {
    return OrganizationModel.find({ _id: { $in: ids } }).sort({ createdAt: 1 }).exec();
  }

  async findBySlug(slug: string): Promise<OrganizationDocument | null> {
    return OrganizationModel.findOne({ slug }).exec();
  }

  async updateById(id: string, input: UpdateOrganizationInput): Promise<OrganizationDocument | null> {
    return OrganizationModel.findByIdAndUpdate(id, { $set: input }, { new: true }).exec();
  }
}
