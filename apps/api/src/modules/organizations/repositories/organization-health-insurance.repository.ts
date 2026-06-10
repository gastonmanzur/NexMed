import { OrganizationHealthInsuranceModel, type OrganizationHealthInsuranceDocument } from '../models/organization-health-insurance.model.js';

export class OrganizationHealthInsuranceRepository {
  async listByOrganization(organizationId: string, activeOnly = false): Promise<OrganizationHealthInsuranceDocument[]> {
    return OrganizationHealthInsuranceModel.find({ organizationId, ...(activeOnly ? { status: 'active' } : {}) }).sort({ name: 1 }).exec();
  }

  async findByIdInOrganization(organizationId: string, id: string): Promise<OrganizationHealthInsuranceDocument | null> {
    return OrganizationHealthInsuranceModel.findOne({ _id: id, organizationId }).exec();
  }

  async create(input: { organizationId: string; name: string; status: 'active' | 'inactive'; requiresMemberNumber: boolean; requiresPlan: boolean; notes?: string | null }): Promise<OrganizationHealthInsuranceDocument> {
    return OrganizationHealthInsuranceModel.create(input);
  }

  async updateByIdInOrganization(organizationId: string, id: string, update: Record<string, unknown>): Promise<OrganizationHealthInsuranceDocument | null> {
    return OrganizationHealthInsuranceModel.findOneAndUpdate({ _id: id, organizationId }, { $set: update }, { new: true }).exec();
  }
}
