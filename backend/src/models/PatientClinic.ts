import { Schema, Types, model } from "mongoose";

export interface PatientClinicDocument {
  _id: Types.ObjectId;
  patientId: Types.ObjectId;
  clinicId: Types.ObjectId;
  source: "invite" | "appointment";
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt: Date;
}

const patientClinicSchema = new Schema<PatientClinicDocument>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    clinicId: { type: Schema.Types.ObjectId, ref: "Clinic", required: true, index: true },
    source: { type: String, enum: ["invite", "appointment"], required: true },
    lastSeenAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true }
);

patientClinicSchema.index({ patientId: 1, clinicId: 1 }, { unique: true });

export const PatientClinic = model<PatientClinicDocument>("PatientClinic", patientClinicSchema);
