import mongoose from "mongoose";
import { connectDB } from "../db/connect";
import { Appointment } from "../models/Appointment";
import { buildSlotKey, normalizeStartAt } from "../utils/slots";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta variable ${name}`);
  return value;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  await connectDB();

  const clinicId = requireEnv("CHECK_CLINIC_ID");
  const professionalId = requireEnv("CHECK_PROFESSIONAL_ID");
  const startAtRaw = requireEnv("CHECK_START_AT");
  const patientId = process.env.CHECK_PATIENT_ID;

  const startAt = normalizeStartAt(new Date(startAtRaw));
  if (Number.isNaN(startAt.getTime())) throw new Error("CHECK_START_AT inválido");

  const existingActive = await Appointment.findOne({
    clinicId,
    professionalId,
    startAt,
    status: { $in: ["booked"] },
  }).lean();

  if (existingActive) {
    throw new Error(`Ya existe un turno activo para ese slot: ${existingActive._id}`);
  }

  const appointment = await Appointment.create({
    clinicId,
    professionalId,
    startAt,
    endAt: new Date(startAt.getTime() + 30 * 60_000),
    patientFullName: "Regression Check",
    patientPhone: "0000000000",
    status: "booked",
    ...(patientId ? { patientId } : {}),
  });

  console.log("[check] created", { appointmentId: String(appointment._id), status: appointment.status });

  await sleep(1_000);
  const after1s = await Appointment.findById(appointment._id).lean();
  console.log("[check] after1s", { status: after1s?.status });
  if (!after1s || after1s.status !== "booked") {
    throw new Error(`El estado cambió luego de 1 segundo: ${after1s?.status}`);
  }

  await sleep(9_000);
  const after10s = await Appointment.findById(appointment._id).lean();
  console.log("[check] after10s", { status: after10s?.status });
  if (!after10s || after10s.status !== "booked") {
    throw new Error(`El estado cambió luego de 10 segundos: ${after10s?.status}`);
  }

  const slotStillBlocked = await Appointment.findOne({
    clinicId,
    professionalId,
    startAt,
    status: { $in: ["booked"] },
  }).lean();

  console.log("[check] slot blocked", {
    key: buildSlotKey(String(clinicId), String(professionalId), startAt),
    blocked: Boolean(slotStillBlocked),
  });

  if (!slotStillBlocked) {
    throw new Error("El slot volvió a estar disponible después de reservar");
  }

  console.log("[check] OK");
}

run()
  .catch((error) => {
    console.error("[check] FAILED", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
