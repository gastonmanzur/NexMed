import { PatientProfileModel, type PatientProfileDocument } from '../models/patient-profile.model.js';

interface CreatePatientProfileInput {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  dateOfBirth?: Date | null;
  documentId?: string | null;
}

export class PatientProfileRepository {
  async findByUserId(userId: string): Promise<PatientProfileDocument | null> {
    return PatientProfileModel.findOne({ userId }).exec();
  }

  async findById(id: string): Promise<PatientProfileDocument | null> {
    return PatientProfileModel.findById(id).exec();
  }

  async create(input: CreatePatientProfileInput): Promise<PatientProfileDocument> {
    return PatientProfileModel.create(input);
  }

  async updateByUserId(userId: string, update: Record<string, unknown>): Promise<PatientProfileDocument | null> {
    return PatientProfileModel.findOneAndUpdate({ userId }, { $set: update }, { new: true }).exec();
  }

  async findOrCreateByUser(input: CreatePatientProfileInput): Promise<PatientProfileDocument> {
    const existing = await this.findByUserId(input.userId);
    if (existing) {
      return existing;
    }

    return this.create(input);
  }
}
