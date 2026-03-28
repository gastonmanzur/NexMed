import mongoose, { type InferSchemaType, type Model } from 'mongoose';

const professionalSpecialtySchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
    professionalId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Professional', index: true },
    specialtyId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Specialty', index: true }
  },
  { timestamps: true }
);

professionalSpecialtySchema.index({ professionalId: 1, specialtyId: 1 }, { unique: true });
professionalSpecialtySchema.index({ organizationId: 1, professionalId: 1 });
professionalSpecialtySchema.index({ organizationId: 1, specialtyId: 1 });

export type ProfessionalSpecialtyDocument = InferSchemaType<typeof professionalSpecialtySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ProfessionalSpecialtyModel: Model<ProfessionalSpecialtyDocument> = mongoose.model<ProfessionalSpecialtyDocument>(
  'ProfessionalSpecialty',
  professionalSpecialtySchema
);
