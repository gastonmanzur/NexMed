import { Schema, model, Types } from "mongoose";

export interface ProfessionalAvailabilityDocument {
  _id: Types.ObjectId;
  clinicId: Types.ObjectId;
  professionalId: Types.ObjectId;
  weekday: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const professionalAvailabilitySchema = new Schema<ProfessionalAvailabilityDocument>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: "Clinic", required: true, index: true },
    professionalId: { type: Schema.Types.ObjectId, ref: "Professional", required: true, index: true },
    weekday: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    slotMinutes: { type: Number, required: true, min: 5, max: 180 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

professionalAvailabilitySchema.index({ clinicId: 1, professionalId: 1, weekday: 1, isActive: 1 });

export const ProfessionalAvailability = model<ProfessionalAvailabilityDocument>(
  "ProfessionalAvailability",
  professionalAvailabilitySchema
);
