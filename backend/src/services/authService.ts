import { Clinic } from "../models/Clinic";
import { Patient } from "../models/Patient";

export type AuthUserType = "clinic" | "patient";

export type AuthUserRecord = {
  id: string;
  type: AuthUserType;
  email: string;
  passwordHash: string;
  displayName: string;
};

export async function findUserByEmail(email: string): Promise<AuthUserRecord | null> {
  const clinic = await Clinic.findOne({ email }).lean();
  if (clinic) {
    return {
      id: clinic._id.toString(),
      type: "clinic",
      email: clinic.email,
      passwordHash: clinic.passwordHash,
      displayName: clinic.name,
    };
  }

  const patient = await Patient.findOne({ email }).lean();
  if (!patient) return null;

  return {
    id: patient._id.toString(),
    type: "patient",
    email: patient.email,
    passwordHash: patient.passwordHash,
    displayName: `${patient.firstName} ${patient.lastName}`.trim(),
  };
}

export async function emailExists(email: string): Promise<boolean> {
  const [clinicExists, patientExists] = await Promise.all([
    Clinic.exists({ email }),
    Patient.exists({ email }),
  ]);

  return Boolean(clinicExists || patientExists);
}
