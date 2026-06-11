import { PatientIdentityModel, type PatientIdentityDocument } from '../models/patient-identity.model.js';

interface PatientIdentityWriteInput {
  normalizedPhone: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  documentNumber?: string | null;
  birthDate?: Date | null;
}

export class PatientIdentityRepository {
  async findById(id: string): Promise<PatientIdentityDocument | null> {
    return PatientIdentityModel.findById(id).exec();
  }

  async findByNormalizedPhone(normalizedPhone: string): Promise<PatientIdentityDocument | null> {
    return PatientIdentityModel.findOne({ normalizedPhone }).exec();
  }

  async create(input: PatientIdentityWriteInput): Promise<PatientIdentityDocument> {
    return PatientIdentityModel.create({
      normalizedPhone: input.normalizedPhone,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      email: input.email ?? null,
      documentNumber: input.documentNumber ?? null,
      birthDate: input.birthDate ?? null,
      verifiedPhoneAt: null
    });
  }

  async updateById(id: string, update: Partial<Omit<PatientIdentityWriteInput, 'normalizedPhone'>>): Promise<PatientIdentityDocument | null> {
    return PatientIdentityModel.findOneAndUpdate({ _id: id }, { $set: update }, { new: true }).exec();
  }
}
