import mongoose, { type InferSchemaType, type Model } from 'mongoose';

const patientIdentitySchema = new mongoose.Schema(
  {
    normalizedPhone: { type: String, required: true, trim: true },
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: false, trim: true, maxlength: 40, default: null },
    email: { type: String, required: false, trim: true, lowercase: true, maxlength: 160, default: null },
    documentNumber: { type: String, required: false, trim: true, maxlength: 30, default: null },
    birthDate: { type: Date, required: false, default: null },
    verifiedPhoneAt: { type: Date, required: false, default: null }
  },
  { timestamps: true }
);

patientIdentitySchema.index(
  { normalizedPhone: 1 },
  {
    unique: true,
    name: 'normalizedPhone_1_unique',
    partialFilterExpression: { normalizedPhone: { $type: 'string' } }
  }
);

export type PatientIdentityDocument = InferSchemaType<typeof patientIdentitySchema> & { _id: mongoose.Types.ObjectId };

export const PatientIdentityModel: Model<PatientIdentityDocument> = mongoose.model<PatientIdentityDocument>(
  'PatientIdentity',
  patientIdentitySchema
);
