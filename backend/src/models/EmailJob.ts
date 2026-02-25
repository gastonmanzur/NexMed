import { Schema, model, Types } from "mongoose";

export type EmailJobType = "appointment.booked" | "appointment.rescheduled" | "appointment.canceled";
export type EmailJobStatus = "pending" | "sent" | "failed";

export type AppointmentEmailPayload = {
  appointmentId: string;
  clinic: {
    name: string;
    slug: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
  };
  patient: {
    email: string;
    firstName?: string;
    lastName?: string;
  };
  professional: {
    fullName: string;
  };
  specialty?: {
    name?: string;
  };
  startAt: string;
  endAt: string;
  actions: {
    myAppointmentsUrl: string;
    rescheduleUrl: string;
    cancelUrl?: string;
  };
};

export interface EmailJobDocument {
  _id: Types.ObjectId;
  type: EmailJobType;
  dedupeKey: string;
  to: string[];
  payload: AppointmentEmailPayload;
  status: EmailJobStatus;
  attempts: number;
  lastError?: string;
  nextRunAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const emailJobSchema = new Schema<EmailJobDocument>(
  {
    type: {
      type: String,
      enum: ["appointment.booked", "appointment.rescheduled", "appointment.canceled"],
      required: true,
      index: true,
    },
    dedupeKey: { type: String, required: true, unique: true, index: true },
    to: { type: [String], default: [] },
    payload: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ["pending", "sent", "failed"], default: "pending", index: true },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: "" },
    nextRunAt: { type: Date, required: true, default: () => new Date(), index: true },
  },
  { timestamps: true }
);

emailJobSchema.index({ status: 1, nextRunAt: 1 });

export const EmailJob = model<EmailJobDocument>("EmailJob", emailJobSchema);
