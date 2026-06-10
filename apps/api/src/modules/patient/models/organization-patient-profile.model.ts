import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const organizationPatientProfileSources = ['express_booking', 'manual', 'registered_user'] as const;
export const coverageTypes = ['private', 'health_insurance'] as const;

const organizationPatientProfileSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
    patientIdentityId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'PatientIdentity', index: true },
    patientProfileId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'PatientProfile', index: true, default: null },
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, maxlength: 40 },
    normalizedPhone: { type: String, required: true, trim: true, index: true },
    email: { type: String, required: false, trim: true, lowercase: true, maxlength: 160, default: null },
    documentNumber: { type: String, required: false, trim: true, maxlength: 30, default: null },
    birthDate: { type: Date, required: false, default: null },
    defaultCoverageType: { type: String, enum: coverageTypes, required: false, default: 'private' },
    defaultHealthInsuranceId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'OrganizationHealthInsurance', default: null },
    defaultHealthInsuranceName: { type: String, required: false, trim: true, maxlength: 120, default: null },
    defaultInsuranceMemberNumber: { type: String, required: false, trim: true, maxlength: 60, default: null },
    source: { type: String, enum: organizationPatientProfileSources, required: true, default: 'express_booking', index: true },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'User', default: null, index: true }
  },
  { timestamps: true }
);

organizationPatientProfileSchema.index({ organizationId: 1, patientIdentityId: 1 }, { unique: true });
organizationPatientProfileSchema.index({ organizationId: 1, normalizedPhone: 1 }, { unique: true });

export type OrganizationPatientProfileDocument = InferSchemaType<typeof organizationPatientProfileSchema> & { _id: mongoose.Types.ObjectId };

export const OrganizationPatientProfileModel: Model<OrganizationPatientProfileDocument> = mongoose.model<OrganizationPatientProfileDocument>(
  'OrganizationPatientProfile',
  organizationPatientProfileSchema
);
