import { PatientOrganizationLinkModel, type PatientOrganizationLinkDocument } from '../models/patient-organization-link.model.js';

interface CreateLinkInput {
  patientProfileId: string;
  organizationId: string;
  status?: 'active' | 'blocked' | 'archived';
  source?: string | null;
}

export class PatientOrganizationLinkRepository {
  async findByPatientAndOrganization(patientProfileId: string, organizationId: string): Promise<PatientOrganizationLinkDocument | null> {
    return PatientOrganizationLinkModel.findOne({ patientProfileId, organizationId }).exec();
  }

  async listByPatientProfile(patientProfileId: string): Promise<PatientOrganizationLinkDocument[]> {
    return PatientOrganizationLinkModel.find({ patientProfileId }).sort({ linkedAt: -1, createdAt: -1 }).exec();
  }

  async create(input: CreateLinkInput): Promise<PatientOrganizationLinkDocument> {
    return PatientOrganizationLinkModel.create({
      patientProfileId: input.patientProfileId,
      organizationId: input.organizationId,
      status: input.status ?? 'active',
      source: input.source ?? null,
      linkedAt: new Date()
    });
  }

  async upsertActive(input: CreateLinkInput): Promise<PatientOrganizationLinkDocument> {
    return PatientOrganizationLinkModel.findOneAndUpdate(
      { patientProfileId: input.patientProfileId, organizationId: input.organizationId },
      {
        $setOnInsert: {
          linkedAt: new Date()
        },
        $set: {
          status: input.status ?? 'active',
          source: input.source ?? null
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).exec() as Promise<PatientOrganizationLinkDocument>;
  }
}
