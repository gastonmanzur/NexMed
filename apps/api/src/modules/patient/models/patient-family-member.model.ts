import mongoose, { type InferSchemaType, type Model } from 'mongoose';

const patientFamilyMemberSchema = new mongoose.Schema(
  {
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    relationship: { type: String, required: true, trim: true, maxlength: 80 },
    dateOfBirth: { type: Date, required: true },
    documentId: { type: String, required: true, trim: true, maxlength: 60 },
    phone: { type: String, required: false, trim: true, default: null, maxlength: 40 },
    notes: { type: String, required: false, trim: true, default: null, maxlength: 500 },
    isActive: { type: Boolean, required: true, default: true, index: true }
  },
  { timestamps: true }
);

patientFamilyMemberSchema.index({ ownerUserId: 1, isActive: 1, lastName: 1, firstName: 1 });

export type PatientFamilyMemberDocument = InferSchemaType<typeof patientFamilyMemberSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PatientFamilyMemberModel: Model<PatientFamilyMemberDocument> = mongoose.model<PatientFamilyMemberDocument>(
  'PatientFamilyMember',
  patientFamilyMemberSchema
);
