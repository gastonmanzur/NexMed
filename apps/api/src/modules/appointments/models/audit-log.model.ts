import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const auditActions = ['appointment_created', 'appointment_canceled', 'appointment_rescheduled'] as const;

const auditLogSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    action: { type: String, enum: auditActions, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: false, default: null }
  },
  { timestamps: true }
);

auditLogSchema.index({ organizationId: 1, createdAt: -1 });

type AuditLogBase = InferSchemaType<typeof auditLogSchema>;
export type AuditLogDocument = AuditLogBase & { _id: mongoose.Types.ObjectId };

export const AuditLogModel: Model<AuditLogDocument> = mongoose.model<AuditLogDocument>('AuditLog', auditLogSchema);
