import { Schema, Types, model } from "mongoose";

export interface ClinicInviteDocument {
  _id: Types.ObjectId;
  clinicId: Types.ObjectId;
  token: string;
  active: boolean;
  label?: string;
  createdAt: Date;
  updatedAt: Date;
}

const clinicInviteSchema = new Schema<ClinicInviteDocument>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: "Clinic", required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    active: { type: Boolean, default: true },
    label: { type: String, required: false },
  },
  { timestamps: true }
);

export const ClinicInvite = model<ClinicInviteDocument>("ClinicInvite", clinicInviteSchema);
