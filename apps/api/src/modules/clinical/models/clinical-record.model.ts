import mongoose, { type InferSchemaType, type Model } from 'mongoose';

const clinicalRecordSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
  patientProfileId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'PatientProfile', index: true },
  patientIdentityId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'PatientIdentity', default: null },
  allergies: { type: [String], required: false, default: [] },
  chronicConditions: { type: [String], required: false, default: [] },
  currentMedications: { type: [String], required: false, default: [] },
  relevantHistory: { type: String, required: false, trim: true, default: '' },
  generalObservations: { type: String, required: false, trim: true, default: '' }
}, { timestamps: true });

clinicalRecordSchema.index({ organizationId: 1, patientProfileId: 1 }, { unique: true });

export type ClinicalRecordDocument = InferSchemaType<typeof clinicalRecordSchema> & { _id: mongoose.Types.ObjectId };
export const ClinicalRecordModel: Model<ClinicalRecordDocument> = mongoose.model<ClinicalRecordDocument>('ClinicalRecord', clinicalRecordSchema);
