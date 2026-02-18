import { Schema, model, Types } from "mongoose";

export interface ProfessionalTimeOffDocument {
  _id: Types.ObjectId;
  clinicId: Types.ObjectId;
  professionalId: Types.ObjectId;
  date: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const professionalTimeOffSchema = new Schema<ProfessionalTimeOffDocument>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: "Clinic", required: true, index: true },
    professionalId: { type: Schema.Types.ObjectId, ref: "Professional", required: true, index: true },
    date: { type: String, required: true },
    startTime: { type: String },
    endTime: { type: String },
    reason: { type: String, default: "" },
  },
  { timestamps: true }
);

professionalTimeOffSchema.index({ clinicId: 1, professionalId: 1, date: 1 });

export const ProfessionalTimeOff = model<ProfessionalTimeOffDocument>("ProfessionalTimeOff", professionalTimeOffSchema);
