import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const appointmentStatuses = [
  'booked',
  'confirmed_by_patient',
  'arrived',
  'in_progress',
  'canceled_by_staff',
  'canceled_by_patient',
  'rescheduled',
  'completed',
  'no_show'
] as const;

export const appointmentSources = ['staff_manual', 'admin_manual', 'patient_self_service', 'express_booking'] as const;
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
    durationMultiplier: { type: Number, enum: [1, 2], required: true, default: 1, index: true },
    status: { type: String, enum: appointmentStatuses, default: 'booked', index: true },
    source: { type: String, enum: appointmentSources, required: true, index: true },
    notes: { type: String, required: false, trim: true, default: null },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'User', index: true, default: null },
    bookedByUserId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'User', index: true, default: null },
    beneficiaryType: { type: String, enum: appointmentBeneficiaryTypes, required: true, default: 'self', index: true },
    familyMemberId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'PatientFamilyMember', default: null, index: true },
    beneficiaryDisplayName: { type: String, required: false, trim: true, default: null },
    beneficiaryRelationship: { type: String, required: false, trim: true, default: null },
    paymentCoverageType: { type: String, enum: ['private', 'health_insurance'], required: true, default: 'private', index: true },
    healthInsuranceId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'OrganizationHealthInsurance', default: null, index: true },
    healthInsuranceName: { type: String, required: false, trim: true, maxlength: 120, default: 'Particular' },
    insuranceMemberNumber: { type: String, required: false, trim: true, maxlength: 60, default: null },
    insurancePlan: { type: String, required: false, trim: true, maxlength: 60, default: null },
    canceledByUserId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'User', default: null },
    canceledAt: { type: Date, required: false, default: null },
    cancelReason: { type: String, required: false, trim: true, default: null },
    statusUpdatedAt: { type: Date, required: false, default: null },
    statusUpdatedByUserId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'User', default: null },
    statusUpdatedByRole: { type: String, required: false, trim: true, default: null },
    arrivedAt: { type: Date, required: false, default: null, index: true },
    startedAt: { type: Date, required: false, default: null, index: true },
    startedByUserId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'User', default: null },
    completedAt: { type: Date, required: false, default: null, index: true },
    completedByUserId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'User', default: null },
    statusHistory: {
      type: [{
        status: { type: String, enum: appointmentStatuses, required: true },
        changedAt: { type: Date, required: true },
        changedByUserId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
        changedByRole: { type: String, required: true, trim: true },
        note: { type: String, required: false, trim: true, default: null }
      }],
      required: false,
      default: []
    },
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
  partialFilterExpression: { status: { $in: ['booked', 'confirmed_by_patient', 'arrived', 'in_progress'] } }
});

appointmentSchema.index({ organizationId: 1, professionalId: 1, startAt: 1 });
appointmentSchema.index({ organizationId: 1, status: 1, startAt: 1 });

export type AppointmentDocument = InferSchemaType<typeof appointmentSchema> & { _id: mongoose.Types.ObjectId };

export const AppointmentModel: Model<AppointmentDocument> = mongoose.model<AppointmentDocument>('Appointment', appointmentSchema);
