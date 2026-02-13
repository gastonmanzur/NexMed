import { Schema, model, Types } from "mongoose";

export type AppointmentStatus = "confirmed" | "cancelled";

export interface AppointmentDocument {
  _id: Types.ObjectId;
  clinicId: Types.ObjectId;
  startAt: Date;
  endAt: Date;
  patientFullName: string;
  patientPhone: string;
  note?: string;
  status: AppointmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<AppointmentDocument>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: "Clinic", required: true, index: true },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    patientFullName: { type: String, required: true },
    patientPhone: { type: String, required: true, index: true },
    note: { type: String },
    status: { type: String, enum: ["confirmed", "cancelled"], default: "confirmed", index: true },
  },
  { timestamps: true }
);

appointmentSchema.index({ clinicId: 1, startAt: 1, status: 1 });

export const Appointment = model<AppointmentDocument>("Appointment", appointmentSchema);
