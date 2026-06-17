import { OrganizationMemberModel, type OrganizationMemberDocument } from '../models/organization-member.model.js';

interface CreateMemberInput {
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'staff' | 'patient' | 'professional';
  professionalId?: string | null;
  status?: 'active' | 'inactive' | 'blocked';
}

export class OrganizationMemberRepository {
  async create(input: CreateMemberInput): Promise<OrganizationMemberDocument> {
    return OrganizationMemberModel.create(input);
  }

  async findByOrganizationAndUser(organizationId: string, userId: string): Promise<OrganizationMemberDocument | null> {
    return OrganizationMemberModel.findOne({ organizationId, userId, status: 'active', role: { $ne: 'professional' } }).exec()
      ?? OrganizationMemberModel.findOne({ organizationId, userId, status: 'active' }).exec();
  }

  async findProfessionalByOrganizationAndUser(organizationId: string, userId: string): Promise<OrganizationMemberDocument | null> {
    return OrganizationMemberModel.findOne({ organizationId, userId, role: 'professional' }).exec();
  }

  async findByUser(userId: string): Promise<OrganizationMemberDocument[]> {
    return OrganizationMemberModel.find({ userId }).sort({ createdAt: 1 }).exec();
  }

  async findActiveByUser(userId: string): Promise<OrganizationMemberDocument[]> {
    return OrganizationMemberModel.find({ userId, status: 'active' }).sort({ createdAt: 1 }).exec();
  }

  async findActiveProfessionalLink(organizationId: string, professionalId: string): Promise<OrganizationMemberDocument | null> {
    return OrganizationMemberModel.findOne({ organizationId, professionalId, role: 'professional', status: 'active' }).exec();
  }

  async upsertProfessionalMembership(input: CreateMemberInput): Promise<OrganizationMemberDocument> {
    return OrganizationMemberModel.findOneAndUpdate(
      { organizationId: input.organizationId, userId: input.userId, role: 'professional', professionalId: input.professionalId ?? null },
      { $set: { role: 'professional', professionalId: input.professionalId ?? null, status: input.status ?? 'active' }, $setOnInsert: { joinedAt: new Date() } },
      { upsert: true, new: true }
    ).exec();
  }

  async deactivateProfessionalMembership(organizationId: string, professionalId: string): Promise<void> {
    await OrganizationMemberModel.updateMany({ organizationId, professionalId, role: 'professional' }, { $set: { status: 'inactive' } }).exec();
  }
}
