import { ProfessionalSpecialtyModel, type ProfessionalSpecialtyDocument } from '../models/professional-specialty.model.js';

export class ProfessionalSpecialtyRepository {
  async findByProfessionalIds(organizationId: string, professionalIds: string[]): Promise<ProfessionalSpecialtyDocument[]> {
    return ProfessionalSpecialtyModel.find({ organizationId, professionalId: { $in: professionalIds } }).exec();
  }

  async findBySpecialtyIds(organizationId: string, specialtyIds: string[]): Promise<ProfessionalSpecialtyDocument[]> {
    return ProfessionalSpecialtyModel.find({ organizationId, specialtyId: { $in: specialtyIds } }).exec();
  }

  async findByProfessionalId(organizationId: string, professionalId: string): Promise<ProfessionalSpecialtyDocument[]> {
    return ProfessionalSpecialtyModel.find({ organizationId, professionalId }).exec();
  }

  async replaceForProfessional(organizationId: string, professionalId: string, specialtyIds: string[]): Promise<void> {
    await ProfessionalSpecialtyModel.deleteMany({ organizationId, professionalId }).exec();

    if (specialtyIds.length === 0) {
      return;
    }

    await ProfessionalSpecialtyModel.insertMany(
      specialtyIds.map((specialtyId) => ({ organizationId, professionalId, specialtyId })),
      { ordered: false }
    );
  }
}
