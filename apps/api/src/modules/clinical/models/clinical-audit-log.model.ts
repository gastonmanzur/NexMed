import mongoose, { type InferSchemaType, type Model } from 'mongoose';

const clinicalAuditLogSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  professionalId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Professional', default: null },
  patientProfileId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'PatientProfile', index: true },
  action: { type: String, enum: ['clinical_record_view', 'clinical_record_update', 'encounter_create', 'encounter_update', 'encounter_sign', 'encounter_view'], required: true, index: true },
  resourceType: { type: String, enum: ['ClinicalRecord', 'ClinicalEncounter'], required: true },
  resourceId: { type: mongoose.Schema.Types.ObjectId, required: false, default: null },
  ip: { type: String, required: false, trim: true, default: null },
  userAgent: { type: String, required: false, trim: true, default: null }
}, { timestamps: { createdAt: true, updatedAt: false } });

export type ClinicalAuditLogDocument = InferSchemaType<typeof clinicalAuditLogSchema> & { _id: mongoose.Types.ObjectId };
export const ClinicalAuditLogModel: Model<ClinicalAuditLogDocument> = mongoose.model<ClinicalAuditLogDocument>('ClinicalAuditLog', clinicalAuditLogSchema);
