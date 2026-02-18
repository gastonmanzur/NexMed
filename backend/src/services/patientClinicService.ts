import { Types } from "mongoose";
import { PatientClinic } from "../models/PatientClinic";

export async function upsertPatientClinicLink(params: {
  patientId: string;
  clinicId: Types.ObjectId;
  source: "invite" | "appointment";
}) {
  const now = new Date();

  await PatientClinic.findOneAndUpdate(
    { patientId: params.patientId, clinicId: params.clinicId },
    {
      $set: {
        source: params.source,
        lastSeenAt: now,
      },
      $setOnInsert: {
        patientId: params.patientId,
        clinicId: params.clinicId,
      },
    },
    { upsert: true, new: true }
  );
}
