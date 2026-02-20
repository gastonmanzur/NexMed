import { Schema, Types, model } from "mongoose";
import { ReminderChannel } from "./ClinicNotificationSettings";

export type ReminderStatus = "scheduled" | "sending" | "sent" | "canceled" | "failed";

export interface ReminderPayloadSnapshot {
  clinicName: string;
  patientName: string;
  startAt: Date;
  patientEmail?: string;
  professionalName?: string;
  address?: string;
  city?: string;
  phone?: string;
}

export interface ReminderDocument {
  _id: Types.ObjectId;
  clinicId: Types.ObjectId;
  patientId?: Types.ObjectId;
  appointmentId: Types.ObjectId;
  ruleId: string;
  channel: ReminderChannel;
  scheduledFor: Date;
  status: ReminderStatus;
  sentAt?: Date;
  payloadSnapshot: ReminderPayloadSnapshot;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reminderSchema = new Schema<ReminderDocument>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: "Clinic", required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: false, index: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", required: true, index: true },
    ruleId: { type: String, required: true },
    channel: { type: String, enum: ["inApp", "email"], required: true, index: true },
    scheduledFor: { type: Date, required: true, index: true },
    status: { type: String, enum: ["scheduled", "sending", "sent", "canceled", "failed"], default: "scheduled", index: true },
    sentAt: { type: Date, required: false },
    payloadSnapshot: {
      clinicName: { type: String, required: true },
      patientName: { type: String, required: true },
      startAt: { type: Date, required: true },
      patientEmail: { type: String, required: false },
      professionalName: { type: String, required: false },
      address: { type: String, required: false },
      city: { type: String, required: false },
      phone: { type: String, required: false },
    },
    errorMessage: { type: String, required: false },
  },
  { timestamps: true }
);

reminderSchema.index({ appointmentId: 1, ruleId: 1, channel: 1, scheduledFor: 1 }, { unique: true });

export const Reminder = model<ReminderDocument>("Reminder", reminderSchema);
