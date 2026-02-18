import { Schema, model, Types } from "mongoose";

export interface SpecialtyDocument {
  _id: Types.ObjectId;
  clinicId: Types.ObjectId;
  name: string;
  normalizedName: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const specialtySchema = new Schema<SpecialtyDocument>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: "Clinic", required: true, index: true },
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

specialtySchema.index({ clinicId: 1, normalizedName: 1 }, { unique: true });

export const Specialty = model<SpecialtyDocument>("Specialty", specialtySchema);
