import { Schema, model, Types } from "mongoose";

export interface ProfessionalDocument {
  _id: Types.ObjectId;
  clinicId: Types.ObjectId;
  firstName: string;
  lastName: string;
  displayName?: string;
  email?: string;
  phone?: string;
  specialtyIds: Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const professionalSchema = new Schema<ProfessionalDocument>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: "Clinic", required: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    displayName: { type: String, trim: true },
    email: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    specialtyIds: { type: [{ type: Schema.Types.ObjectId, ref: "Specialty" }], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

professionalSchema.index({ clinicId: 1, isActive: 1 });

export const Professional = model<ProfessionalDocument>("Professional", professionalSchema);
