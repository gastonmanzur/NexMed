import mongoose, { type InferSchemaType, type Model } from 'mongoose';

const patientFamilyMemberSchema = new mongoose.Schema(
  {
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    patientProfileId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'PatientProfile', index: true },
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    relationship: { type: String, required: true, trim: true, maxlength: 80 },
    dateOfBirth: { type: Date, required: true },
    documentId: { type: String, required: true, trim: true, maxlength: 60 },
    phone: { type: String, required: false, trim: true, default: null, maxlength: 40 },
    email: { type: String, required: false, trim: true, lowercase: true, default: null, maxlength: 120 },
    sex: { type: String, required: false, trim: true, default: null, maxlength: 20 },
    address: { type: String, required: false, trim: true, default: null, maxlength: 160 },
    city: { type: String, required: false, trim: true, default: null, maxlength: 80 },
    province: { type: String, required: false, trim: true, default: null, maxlength: 80 },
    emergencyContactName: { type: String, required: false, trim: true, default: null, maxlength: 120 },
    emergencyContactPhone: { type: String, required: false, trim: true, default: null, maxlength: 40 },
    emergencyContactRelationship: { type: String, required: false, trim: true, default: null, maxlength: 80 },
    insuranceProvider: { type: String, required: false, trim: true, default: null, maxlength: 120 },
    insuranceMemberId: { type: String, required: false, trim: true, default: null, maxlength: 60 },
    insurancePlan: { type: String, required: false, trim: true, default: null, maxlength: 60 },
    bloodType: { type: String, required: false, trim: true, default: null, maxlength: 8 },
    allergies: { type: String, required: false, trim: true, default: null, maxlength: 1200 },
    regularMedication: { type: String, required: false, trim: true, default: null, maxlength: 1200 },
    preexistingConditions: { type: String, required: false, trim: true, default: null, maxlength: 1200 },
    medicalNotes: { type: String, required: false, trim: true, default: null, maxlength: 1200 },
    notes: { type: String, required: false, trim: true, default: null, maxlength: 500 },
    isActive: { type: Boolean, required: true, default: true, index: true }
  },
  { timestamps: true }
);

patientFamilyMemberSchema.index({ ownerUserId: 1, isActive: 1, lastName: 1, firstName: 1 });
patientFamilyMemberSchema.index({ ownerUserId: 1, patientProfileId: 1 }, { unique: true });

export type PatientFamilyMemberDocument = InferSchemaType<typeof patientFamilyMemberSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PatientFamilyMemberModel: Model<PatientFamilyMemberDocument> = mongoose.model<PatientFamilyMemberDocument>(
  'PatientFamilyMember',
  patientFamilyMemberSchema
);
