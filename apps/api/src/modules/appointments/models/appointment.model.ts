import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const appointmentStatuses = [
  'booked',
  'canceled_by_staff',
  'canceled_by_patient',
  'rescheduled',
  'completed',
  'no_show'
] as const;

export const appointmentSources = ['staff_manual', 'admin_manual', 'patient_self_service'] as const;
export const appointmentBeneficiaryTypes = ['self', 'family_member'] as const;

const appointmentSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
    professionalId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Professional', index: true },
    specialtyId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Specialty', index: true, default: null },
    patientProfileId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'PatientProfile', index: true, default: null },
    patientName: { type: String, required: true, trim: true },
    patientEmail: { type: String, required: false, trim: true, lowercase: true, default: null },
    patientPhone: { type: String, required: false, trim: true, default: null },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true, index: true },
    status: { type: String, enum: appointmentStatuses, default: 'booked', index: true },
    source: { type: String, enum: appointmentSources, required: true, index: true },
    notes: { type: String, required: false, trim: true, default: null },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    bookedByUserId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    beneficiaryType: { type: String, enum: appointmentBeneficiaryTypes, required: true, default: 'self', index: true },
    familyMemberId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'PatientFamilyMember', default: null, index: true },
    beneficiaryDisplayName: { type: String, required: false, trim: true, default: null },
    beneficiaryRelationship: { type: String, required: false, trim: true, default: null },
    canceledByUserId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'User', default: null },
    canceledAt: { type: Date, required: false, default: null },
    cancelReason: { type: String, required: false, trim: true, default: null },
    rescheduledFromAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: 'Appointment',
      default: null,
      index: true
    },
    rescheduledToAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: 'Appointment',
      default: null,
      index: true
    }
  },
  { timestamps: true }
);

appointmentSchema.index({ organizationId: 1, professionalId: 1, startAt: 1, endAt: 1 }, {
  unique: true,
  partialFilterExpression: { status: 'booked' }
});

appointmentSchema.index({ organizationId: 1, professionalId: 1, startAt: 1 });
appointmentSchema.index({ organizationId: 1, status: 1, startAt: 1 });

export type AppointmentDocument = InferSchemaType<typeof appointmentSchema> & { _id: mongoose.Types.ObjectId };

export const AppointmentModel: Model<AppointmentDocument> = mongoose.model<AppointmentDocument>('Appointment', appointmentSchema);
