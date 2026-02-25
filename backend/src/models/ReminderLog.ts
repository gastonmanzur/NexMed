import { Schema, Types, model } from "mongoose";

export interface ReminderLogDocument {
  _id: Types.ObjectId;
  jobId: Types.ObjectId;
  appointmentId: Types.ObjectId;
  status: "sent" | "failed";
  provider: "resend" | "smtp" | "ethereal";
  providerMessageId?: string;
  error?: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reminderLogSchema = new Schema<ReminderLogDocument>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "ReminderJob", required: true, index: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", required: true, index: true },
    status: { type: String, enum: ["sent", "failed"], required: true },
    provider: { type: String, enum: ["resend", "smtp", "ethereal"], required: true },
    providerMessageId: { type: String },
    error: { type: String },
    sentAt: { type: Date },
  },
  { timestamps: true, collection: "reminder_logs" }
);

export const ReminderLog = model<ReminderLogDocument>("ReminderLog", reminderLogSchema);
