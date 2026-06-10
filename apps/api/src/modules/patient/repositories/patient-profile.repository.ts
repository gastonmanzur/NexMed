import { PatientProfileModel, type PatientProfileDocument } from '../models/patient-profile.model.js';

interface CreatePatientProfileInput {
  userId?: string | null;
  ownerUserId?: string | null;
  relationshipToOwner?: string | null;
  isPrimaryProfile?: boolean;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  dateOfBirth?: Date | null;
  documentId?: string | null;
  sex?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;
  insuranceProvider?: string | null;
  insuranceMemberId?: string | null;
  insurancePlan?: string | null;
  bloodType?: string | null;
  allergies?: string | null;
  regularMedication?: string | null;
  preexistingConditions?: string | null;
  medicalNotes?: string | null;
  normalizedPhone?: string | null;
  source?: string | null;
}

export class PatientProfileRepository {
  async findByUserId(userId: string): Promise<PatientProfileDocument | null> {
    return PatientProfileModel.findOne({ userId, isPrimaryProfile: true }).exec();
  }

  async findPrimaryCandidateByUserId(userId: string): Promise<PatientProfileDocument | null> {
    return PatientProfileModel.findOne({ userId }).sort({ isPrimaryProfile: -1, createdAt: 1 }).exec();
  }

  async findById(id: string): Promise<PatientProfileDocument | null> {
    return PatientProfileModel.findById(id).exec();
  }

  async findByIdForOwner(id: string, ownerUserId: string): Promise<PatientProfileDocument | null> {
    return PatientProfileModel.findOne({ _id: id, ownerUserId }).exec();
  }

  async listByOwner(ownerUserId: string, onlyActive = false): Promise<PatientProfileDocument[]> {
    const query: Record<string, unknown> = { ownerUserId };
    if (onlyActive) query.isPrimaryProfile = false;
    return PatientProfileModel.find(query).sort({ isPrimaryProfile: -1, lastName: 1, firstName: 1 }).exec();
  }

  async create(input: CreatePatientProfileInput): Promise<PatientProfileDocument> {
    return PatientProfileModel.create(input);
  }

  async updateByUserId(userId: string, update: Record<string, unknown>): Promise<PatientProfileDocument | null> {
    return PatientProfileModel.findOneAndUpdate({ userId, isPrimaryProfile: true }, { $set: update }, { new: true }).exec();
  }

  async updateById(id: string, update: Record<string, unknown>): Promise<PatientProfileDocument | null> {
    return PatientProfileModel.findByIdAndUpdate(id, { $set: update }, { new: true }).exec();
  }

  async updateByIdForOwner(id: string, ownerUserId: string, update: Record<string, unknown>): Promise<PatientProfileDocument | null> {
    return PatientProfileModel.findOneAndUpdate({ _id: id, ownerUserId }, { $set: update }, { new: true }).exec();
  }

  async findOrCreateByUser(input: Omit<CreatePatientProfileInput, 'ownerUserId'> & { userId: string }): Promise<PatientProfileDocument> {
    const existing = await this.findByUserId(input.userId);
    if (existing) {
      if (!existing.ownerUserId) {
        const updated = await this.updateByUserId(input.userId, { ownerUserId: input.userId, isPrimaryProfile: true });
        if (updated) return updated;
      }
      return existing;
    }

    return this.create({ ...input, ownerUserId: input.userId, isPrimaryProfile: true });
  }
}
