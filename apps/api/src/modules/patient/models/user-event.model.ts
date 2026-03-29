import mongoose, { type InferSchemaType, type Model } from 'mongoose';

export const userEventTypes = [
  'patient_joined_organization',
  'patient_appointment_booked',
  'patient_appointment_canceled',
  'patient_appointment_rescheduled'
] as const;

const userEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Organization', default: null, index: true },
    type: { type: String, enum: userEventTypes, required: true, index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: false, trim: true, default: null },
    readAt: { type: Date, required: false, default: null }
  },
  { timestamps: true }
);

userEventSchema.index({ userId: 1, createdAt: -1 });

export type UserEventDocument = InferSchemaType<typeof userEventSchema> & { _id: mongoose.Types.ObjectId };

export const UserEventModel: Model<UserEventDocument> = mongoose.model<UserEventDocument>('UserEvent', userEventSchema);
