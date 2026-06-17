import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const internalMessageTypes = ['call_patient', 'delay_notice', 'admin_request', 'documentation_request', 'payment_request', 'payment_pending', 'documentation_missing', 'patient_ready', 'no_show', 'custom'] as const;

const internalMessageSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Appointment', default: null, index: true },
  patientProfileId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'PatientProfile', default: null, index: true },
  professionalId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Professional', default: null, index: true },
  fromUserId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  fromRole: { type: String, enum: ['professional', 'secretary', 'admin'], required: true, index: true },
  toUserId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'User', default: null, index: true },
  toRole: { type: String, enum: ['secretary', 'professional', 'admin'], required: false, default: null, index: true },
  type: { type: String, enum: internalMessageTypes, required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  message: { type: String, required: true, trim: true, maxlength: 1000 },
  status: { type: String, enum: ['unread', 'read', 'resolved'], required: true, default: 'unread', index: true },
  readAt: { type: Date, required: false, default: null },
  resolvedAt: { type: Date, required: false, default: null }
}, { timestamps: true });

internalMessageSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
internalMessageSchema.index({ appointmentId: 1, createdAt: -1 });
internalMessageSchema.index({ toRole: 1, status: 1, createdAt: -1 });

export type InternalMessageDocument = InferSchemaType<typeof internalMessageSchema> & { _id: mongoose.Types.ObjectId };
export const InternalMessageModel: Model<InternalMessageDocument> = mongoose.model<InternalMessageDocument>('InternalMessage', internalMessageSchema);
