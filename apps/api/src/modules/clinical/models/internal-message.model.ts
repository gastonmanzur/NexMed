import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const internalMessageTypes = ['call_patient', 'delay_notice', 'admin_request', 'payment_pending', 'documentation_missing', 'patient_ready', 'no_show', 'custom'] as const;

const internalMessageSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Appointment', default: null, index: true },
  patientProfileId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'PatientProfile', default: null, index: true },
  fromUserId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  toUserId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'User', default: null, index: true },
  toRole: { type: String, enum: ['secretary', 'professional', 'admin'], required: false, default: null, index: true },
  type: { type: String, enum: internalMessageTypes, required: true, index: true },
  message: { type: String, required: true, trim: true, maxlength: 1000 },
  status: { type: String, enum: ['unread', 'read', 'resolved'], required: true, default: 'unread', index: true },
  readAt: { type: Date, required: false, default: null },
  resolvedAt: { type: Date, required: false, default: null }
}, { timestamps: { createdAt: true, updatedAt: false } });

export type InternalMessageDocument = InferSchemaType<typeof internalMessageSchema> & { _id: mongoose.Types.ObjectId };
export const InternalMessageModel: Model<InternalMessageDocument> = mongoose.model<InternalMessageDocument>('InternalMessage', internalMessageSchema);
