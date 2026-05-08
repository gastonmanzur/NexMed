import mongoose, { type InferSchemaType, type Model } from 'mongoose';

const patientProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, ref: 'User', index: true },
    firstName: { type: String, required: false, trim: true, maxlength: 80, default: null },
    lastName: { type: String, required: false, trim: true, maxlength: 80, default: null },
    phone: { type: String, required: false, trim: true, maxlength: 40, default: null },
    dateOfBirth: { type: Date, required: false, default: null },
    documentId: { type: String, required: false, trim: true, maxlength: 30, default: null },
    sex: { type: String, required: false, trim: true, maxlength: 20, default: null },
    nationality: { type: String, required: false, trim: true, maxlength: 60, default: null },
    address: { type: String, required: false, trim: true, maxlength: 160, default: null },
    city: { type: String, required: false, trim: true, maxlength: 80, default: null },
    province: { type: String, required: false, trim: true, maxlength: 80, default: null },
    emergencyContactName: { type: String, required: false, trim: true, maxlength: 120, default: null },
    emergencyContactPhone: { type: String, required: false, trim: true, maxlength: 40, default: null },
    emergencyContactRelationship: { type: String, required: false, trim: true, maxlength: 80, default: null },
    insuranceProvider: { type: String, required: false, trim: true, maxlength: 120, default: null },
    insuranceMemberId: { type: String, required: false, trim: true, maxlength: 60, default: null },
    insurancePlan: { type: String, required: false, trim: true, maxlength: 60, default: null },
    bloodType: { type: String, required: false, trim: true, maxlength: 8, default: null },
    allergies: { type: String, required: false, trim: true, maxlength: 1200, default: null },
    regularMedication: { type: String, required: false, trim: true, maxlength: 1200, default: null },
    preexistingConditions: { type: String, required: false, trim: true, maxlength: 1200, default: null },
    previousSurgeries: { type: String, required: false, trim: true, maxlength: 1200, default: null },
    medicalNotes: { type: String, required: false, trim: true, maxlength: 1200, default: null },
    contactPreference: { type: String, required: false, trim: true, maxlength: 30, default: null },
    acceptsNotifications: { type: Boolean, required: false, default: false },
    acceptsReminders: { type: Boolean, required: false, default: false },
    acceptsEmailCommunications: { type: Boolean, required: false, default: false },
    acceptsWhatsAppCommunications: { type: Boolean, required: false, default: false }
  },
  { timestamps: true }
);

export type PatientProfileDocument = InferSchemaType<typeof patientProfileSchema> & { _id: mongoose.Types.ObjectId };

export const PatientProfileModel: Model<PatientProfileDocument> = mongoose.model<PatientProfileDocument>(
  'PatientProfile',
  patientProfileSchema
);
