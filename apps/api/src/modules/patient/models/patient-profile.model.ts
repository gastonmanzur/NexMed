import mongoose, { type InferSchemaType, type Model } from 'mongoose';

const patientProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'User', default: null },
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Organization', index: true, default: null },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'User', index: true, default: null },
    relationshipToOwner: { type: String, required: false, trim: true, maxlength: 80, default: null },
    isPrimaryProfile: { type: Boolean, required: true, default: true, index: true },
    firstName: { type: String, required: false, trim: true, maxlength: 80, default: null },
    lastName: { type: String, required: false, trim: true, maxlength: 80, default: null },
    phone: { type: String, required: false, trim: true, maxlength: 40, default: null },
    normalizedPhone: { type: String, required: false, trim: true, maxlength: 40, default: null, index: true },
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
    source: { type: String, required: false, trim: true, maxlength: 40, default: null },
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

patientProfileSchema.index(
  { userId: 1 },
  { unique: true, name: 'userId_1_partial_unique', partialFilterExpression: { userId: { $type: 'objectId' } } }
);
patientProfileSchema.index(
  { organizationId: 1, normalizedPhone: 1 },
  {
    unique: true,
    name: 'organizationId_1_normalizedPhone_1_partial_unique',
    partialFilterExpression: { organizationId: { $type: 'objectId' }, normalizedPhone: { $type: 'string' } }
  }
);
patientProfileSchema.index({ ownerUserId: 1, isPrimaryProfile: 1, lastName: 1, firstName: 1 });


export type PatientProfileDocument = InferSchemaType<typeof patientProfileSchema> & { _id: mongoose.Types.ObjectId };

export const PatientProfileModel: Model<PatientProfileDocument> = mongoose.model<PatientProfileDocument>(
  'PatientProfile',
  patientProfileSchema
);
