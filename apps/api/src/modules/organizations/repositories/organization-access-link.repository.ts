import { OrganizationAccessLinkModel, type OrganizationAccessLinkDocument } from '../models/organization-access-link.model.js';

export class OrganizationAccessLinkRepository {
  findByOrganizationId(organizationId: string): Promise<OrganizationAccessLinkDocument | null> {
    return OrganizationAccessLinkModel.findOne({ organizationId }).exec();
  }

  findByToken(token: string): Promise<OrganizationAccessLinkDocument | null> {
    return OrganizationAccessLinkModel.findOne({ token }).exec();
  }

  async upsertByOrganizationId(input: { organizationId: string; token: string; status?: 'active' | 'rotated' | 'disabled' }): Promise<OrganizationAccessLinkDocument> {
    return OrganizationAccessLinkModel.findOneAndUpdate(
      { organizationId: input.organizationId },
      {
        $set: {
          token: input.token,
          status: input.status ?? 'active'
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).exec() as Promise<OrganizationAccessLinkDocument>;
  }
}
