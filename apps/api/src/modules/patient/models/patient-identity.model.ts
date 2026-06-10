import mongoose, { type InferSchemaType, type Model } from 'mongoose';

const patientIdentitySchema = new mongoose.Schema(
  {
    normalizedPhone: { type: String, required: true, trim: true, unique: true, index: true },
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: false, trim: true, lowercase: true, maxlength: 160, default: null },
    documentNumber: { type: String, required: false, trim: true, maxlength: 30, default: null },
    birthDate: { type: Date, required: false, default: null },
    verifiedPhoneAt: { type: Date, required: false, default: null }
  },
  { timestamps: true }
);

export type PatientIdentityDocument = InferSchemaType<typeof patientIdentitySchema> & { _id: mongoose.Types.ObjectId };

export const PatientIdentityModel: Model<PatientIdentityDocument> = mongoose.model<PatientIdentityDocument>(
  'PatientIdentity',
  patientIdentitySchema
);
