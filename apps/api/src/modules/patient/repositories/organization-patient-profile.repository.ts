import { OrganizationPatientProfileModel, type OrganizationPatientProfileDocument } from '../models/organization-patient-profile.model.js';

export class OrganizationPatientProfileRepository {
  async findByOrganizationAndIdentity(organizationId: string, patientIdentityId: string): Promise<OrganizationPatientProfileDocument | null> {
    return OrganizationPatientProfileModel.findOne({ organizationId, patientIdentityId }).exec();
  }

  async upsertByOrganizationAndIdentity(input: {
    organizationId: string;
    patientIdentityId: string;
    patientProfileId?: string | null;
    firstName: string;
    lastName: string;
    phone: string;
    normalizedPhone: string;
    email?: string | null;
    documentNumber?: string | null;
    birthDate?: Date | null;
    defaultCoverageType: 'private' | 'health_insurance';
    defaultHealthInsuranceId?: string | null;
    defaultHealthInsuranceName?: string | null;
    defaultInsuranceMemberNumber?: string | null;
    source: 'express_booking' | 'manual' | 'registered_user';
    ownerUserId?: string | null;
  }): Promise<OrganizationPatientProfileDocument> {
    return OrganizationPatientProfileModel.findOneAndUpdate(
      { organizationId: input.organizationId, patientIdentityId: input.patientIdentityId },
      {
        $set: {
          patientProfileId: input.patientProfileId ?? null,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          normalizedPhone: input.normalizedPhone,
          email: input.email ?? null,
          documentNumber: input.documentNumber ?? null,
          birthDate: input.birthDate ?? null,
          defaultCoverageType: input.defaultCoverageType,
          defaultHealthInsuranceId: input.defaultHealthInsuranceId ?? null,
          defaultHealthInsuranceName: input.defaultHealthInsuranceName ?? null,
          defaultInsuranceMemberNumber: input.defaultInsuranceMemberNumber ?? null,
          source: input.source,
          ownerUserId: input.ownerUserId ?? null
        },
        $setOnInsert: {
          organizationId: input.organizationId,
          patientIdentityId: input.patientIdentityId
        }
      },
      { new: true, upsert: true }
    ).exec();
  }
}
