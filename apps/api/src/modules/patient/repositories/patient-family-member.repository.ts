import { PatientFamilyMemberModel, type PatientFamilyMemberDocument } from '../models/patient-family-member.model.js';

interface CreatePatientFamilyMemberInput {
  ownerUserId: string;
  firstName: string;
  lastName: string;
  relationship: string;
  dateOfBirth: Date;
  documentId: string;
  phone?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export class PatientFamilyMemberRepository {
  async listByOwnerUser(ownerUserId: string): Promise<PatientFamilyMemberDocument[]> {
    return PatientFamilyMemberModel.find({ ownerUserId }).sort({ lastName: 1, firstName: 1 }).exec();
  }

  async findByIdForOwner(id: string, ownerUserId: string): Promise<PatientFamilyMemberDocument | null> {
    return PatientFamilyMemberModel.findOne({ _id: id, ownerUserId }).exec();
  }

  async create(input: CreatePatientFamilyMemberInput): Promise<PatientFamilyMemberDocument> {
    return PatientFamilyMemberModel.create(input);
  }

  async updateByIdForOwner(
    id: string,
    ownerUserId: string,
    update: Record<string, unknown>
  ): Promise<PatientFamilyMemberDocument | null> {
    return PatientFamilyMemberModel.findOneAndUpdate({ _id: id, ownerUserId }, { $set: update }, { new: true }).exec();
  }

  async deleteByIdForOwner(id: string, ownerUserId: string): Promise<boolean> {
    const result = await PatientFamilyMemberModel.deleteOne({ _id: id, ownerUserId }).exec();
    return result.deletedCount === 1;
  }
}
