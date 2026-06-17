import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const clinicalEncounterStatuses = ['draft', 'signed', 'cancelled'] as const;

const clinicalEncounterSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
  patientProfileId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'PatientProfile', index: true },
  patientIdentityId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'PatientIdentity', default: null },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Appointment', index: true, default: null },
  professionalId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Professional', index: true },
  professionalUserId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  reason: { type: String, required: false, trim: true, default: '' },
  evolution: { type: String, required: false, trim: true, default: '' },
  diagnosisText: { type: String, required: false, trim: true, default: '' },
  treatmentPlan: { type: String, required: false, trim: true, default: '' },
  observations: { type: String, required: false, trim: true, default: '' },
  status: { type: String, enum: clinicalEncounterStatuses, required: true, default: 'draft', index: true },
  signedAt: { type: Date, required: false, default: null }
}, { timestamps: true });

clinicalEncounterSchema.index({ organizationId: 1, appointmentId: 1 }, { unique: true, partialFilterExpression: { appointmentId: { $type: 'objectId' } } });
clinicalEncounterSchema.index({ organizationId: 1, patientProfileId: 1, createdAt: -1 });

export type ClinicalEncounterDocument = InferSchemaType<typeof clinicalEncounterSchema> & { _id: mongoose.Types.ObjectId };
export const ClinicalEncounterModel: Model<ClinicalEncounterDocument> = mongoose.model<ClinicalEncounterDocument>('ClinicalEncounter', clinicalEncounterSchema);
