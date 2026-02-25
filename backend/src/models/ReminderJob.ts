import { Schema, Types, model } from "mongoose";

export type ReminderJobStatus = "pending" | "sent" | "failed" | "canceled";

export interface ReminderJobDocument {
  _id: Types.ObjectId;
  appointmentId: Types.ObjectId;
  clinicId: Types.ObjectId;
  patientId?: Types.ObjectId;
  channel: "email";
  offsetAmount: number;
  offsetUnit: "days" | "hours";
  scheduledFor: Date;
  status: ReminderJobStatus;
  attempts: number;
  lastError?: string;
  nextRunAt: Date;
  dedupeKey: string;
  providerMessageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reminderJobSchema = new Schema<ReminderJobDocument>(
  {
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", required: true, index: true },
    clinicId: { type: Schema.Types.ObjectId, ref: "Clinic", required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: false, index: true },
    channel: { type: String, enum: ["email"], required: true, default: "email" },
    offsetAmount: { type: Number, required: true, min: 1 },
    offsetUnit: { type: String, enum: ["days", "hours"], required: true },
    scheduledFor: { type: Date, required: true, index: true },
    status: { type: String, enum: ["pending", "sent", "failed", "canceled"], default: "pending", index: true },
    attempts: { type: Number, default: 0, min: 0 },
    lastError: { type: String },
    nextRunAt: { type: Date, required: true, index: true },
    dedupeKey: { type: String, required: true, unique: true, index: true },
    providerMessageId: { type: String },
  },
  { timestamps: true, collection: "reminder_jobs" }
);

reminderJobSchema.index({ status: 1, nextRunAt: 1 });

export const ReminderJob = model<ReminderJobDocument>("ReminderJob", reminderJobSchema);
