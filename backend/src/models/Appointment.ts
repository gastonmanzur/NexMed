import { Schema, model, Types } from "mongoose";

export type AppointmentStatus = "booked" | "cancelled" | "completed" | "no_show";

export interface AppointmentDocument {
  _id: Types.ObjectId;
  clinicId: Types.ObjectId;
  clinicSlug?: string;
  patientId?: Types.ObjectId;
  professionalId?: Types.ObjectId;
  specialtyId?: Types.ObjectId;
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
    clinicSlug: { type: String, required: false, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: false, index: true },
    professionalId: { type: Schema.Types.ObjectId, ref: "Professional", required: false, index: true },
    specialtyId: { type: Schema.Types.ObjectId, ref: "Specialty", required: false, index: true },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    patientFullName: { type: String, required: true },
    patientPhone: { type: String, required: true, index: true },
    note: { type: String },
    status: { type: String, enum: ["booked", "cancelled", "completed", "no_show"], default: "booked", index: true },
  },
  { timestamps: true }
);

appointmentSchema.index({ clinicId: 1, startAt: 1, status: 1 });
appointmentSchema.index(
  { clinicId: 1, professionalId: 1, startAt: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["booked"] },
      professionalId: { $exists: true },
    },
  }
);

function isDevEnvironment() {
  return process.env.NODE_ENV !== "production";
}

appointmentSchema.pre("save", function logStatusChangeOnSave() {
  if (!isDevEnvironment() || !this.isModified("status")) return;

  console.info("[appointment-status-change:model-save]", {
    appointmentId: String(this._id),
    newStatus: this.status,
    stack: new Error().stack,
  });
});

appointmentSchema.pre(["updateOne", "updateMany", "findOneAndUpdate"], function logStatusChangeOnUpdate() {
  if (!isDevEnvironment()) return;

  const query = this as any;
  const update = query.getUpdate?.() as Record<string, any> | undefined;
  const nextStatus = update?.status ?? update?.$set?.status;
  if (!nextStatus) return;

  console.info("[appointment-status-change:model-update]", {
    query: query.getQuery?.(),
    newStatus: nextStatus,
    stack: new Error().stack,
  });
});

export const Appointment = model<AppointmentDocument>("Appointment", appointmentSchema);
