import { OrganizationMemberModel, type OrganizationMemberDocument } from '../models/organization-member.model.js';

interface CreateMemberInput {
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'staff' | 'patient';
  status?: 'active' | 'inactive' | 'blocked';
}

export class OrganizationMemberRepository {
  async create(input: CreateMemberInput): Promise<OrganizationMemberDocument> {
    return OrganizationMemberModel.create(input);
  }

  async findByOrganizationAndUser(organizationId: string, userId: string): Promise<OrganizationMemberDocument | null> {
    return OrganizationMemberModel.findOne({ organizationId, userId }).exec();
  }

  async findByUser(userId: string): Promise<OrganizationMemberDocument[]> {
    return OrganizationMemberModel.find({ userId }).sort({ createdAt: 1 }).exec();
  }

  async findActiveByUser(userId: string): Promise<OrganizationMemberDocument[]> {
    return OrganizationMemberModel.find({ userId, status: 'active' }).sort({ createdAt: 1 }).exec();
  }
}
