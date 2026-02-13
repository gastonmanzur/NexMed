import { Schema, model, Types } from "mongoose";

export interface PatientDocument {
  _id: Types.ObjectId;
  email: string;
  passwordHash?: string;
  googleSub?: string;
  firstName: string;
  lastName: string;
  age?: number;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const patientSchema = new Schema<PatientDocument>(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: false },
    googleSub: { type: String, required: false, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    age: { type: Number, required: false, min: 0, max: 120 },
    phone: { type: String, required: false, default: "" },
  },
  { timestamps: true }
);

export const Patient = model<PatientDocument>("Patient", patientSchema);
