import { PatientIdentityModel, type PatientIdentityDocument } from '../models/patient-identity.model.js';

export class PatientIdentityRepository {
  async findByNormalizedPhone(normalizedPhone: string): Promise<PatientIdentityDocument | null> {
    return PatientIdentityModel.findOne({ normalizedPhone }).exec();
  }

  async upsertByNormalizedPhone(input: {
    normalizedPhone: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    documentNumber?: string | null;
    birthDate?: Date | null;
  }): Promise<PatientIdentityDocument> {
    return PatientIdentityModel.findOneAndUpdate(
      { normalizedPhone: input.normalizedPhone },
      {
        $set: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email ?? null,
          documentNumber: input.documentNumber ?? null,
          birthDate: input.birthDate ?? null
        },
        $setOnInsert: { normalizedPhone: input.normalizedPhone }
      },
      { new: true, upsert: true }
    ).exec();
  }
}
