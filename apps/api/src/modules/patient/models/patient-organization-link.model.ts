import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const patientOrganizationLinkStatuses = ['active', 'blocked', 'archived'] as const;

const patientOrganizationLinkSchema = new mongoose.Schema(
  {
    patientProfileId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'PatientProfile', index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
    status: { type: String, enum: patientOrganizationLinkStatuses, required: true, default: 'active', index: true },
    linkedAt: { type: Date, required: true, default: Date.now },
    source: { type: String, required: false, trim: true, default: null }
  },
  { timestamps: true }
);

patientOrganizationLinkSchema.index({ patientProfileId: 1, organizationId: 1 }, { unique: true });

export type PatientOrganizationLinkDocument = InferSchemaType<typeof patientOrganizationLinkSchema> & { _id: mongoose.Types.ObjectId };

export const PatientOrganizationLinkModel: Model<PatientOrganizationLinkDocument> = mongoose.model<PatientOrganizationLinkDocument>(
  'PatientOrganizationLink',
  patientOrganizationLinkSchema
);
