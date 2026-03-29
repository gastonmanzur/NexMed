import mongoose, { type InferSchemaType, type Model } from 'mongoose';

const patientProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, ref: 'User', index: true },
    firstName: { type: String, required: false, trim: true, default: null },
    lastName: { type: String, required: false, trim: true, default: null },
    phone: { type: String, required: false, trim: true, default: null },
    dateOfBirth: { type: Date, required: false, default: null },
    documentId: { type: String, required: false, trim: true, default: null }
  },
  { timestamps: true }
);

export type PatientProfileDocument = InferSchemaType<typeof patientProfileSchema> & { _id: mongoose.Types.ObjectId };

export const PatientProfileModel: Model<PatientProfileDocument> = mongoose.model<PatientProfileDocument>(
  'PatientProfile',
  patientProfileSchema
);
