import { Request, Response } from "express";
import { Appointment } from "../models/Appointment";
import { Clinic } from "../models/Clinic";
import { buildAvailableSlots } from "../services/availabilityService";
import { fail, ok } from "../utils/http";

function dateOnlyToUtcStart(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function getClinicAvailability(req: Request, res: Response) {
  const slug = String(req.params.slug);
  const clinic = await Clinic.findOne({ slug }).lean();
  if (!clinic) return fail(res, "Clínica no encontrada", 404);

  const from = dateOnlyToUtcStart(String(req.query.from));
  const to = dateOnlyToUtcStart(String(req.query.to));

  const slots = await buildAvailableSlots({
    clinicId: clinic._id,
    from,
    to,
    weeklySchedule: clinic.settings.weeklySchedule,
    slotDurationMinutes: clinic.settings.slotDurationMinutes,
  });

  return ok(res, {
    clinic: { name: clinic.name, slug: clinic.slug, phone: clinic.phone, address: clinic.address, city: clinic.city },
    slots: slots.map((s) => ({ startAt: s.startAt.toISOString(), endAt: s.endAt.toISOString() })),
  });
}

export async function createPublicAppointment(req: Request, res: Response) {
  const slug = String(req.params.slug);
  const clinic = await Clinic.findOne({ slug }).lean();
  if (!clinic) return fail(res, "Clínica no encontrada", 404);

  const startAt = new Date(req.body.startAt);
  const endAt = new Date(startAt.getTime() + clinic.settings.slotDurationMinutes * 60_000);

  const from = new Date(Date.UTC(startAt.getUTCFullYear(), startAt.getUTCMonth(), startAt.getUTCDate()));
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 1);

  const availableSlots = await buildAvailableSlots({
    clinicId: clinic._id,
    from,
    to,
    weeklySchedule: clinic.settings.weeklySchedule,
    slotDurationMinutes: clinic.settings.slotDurationMinutes,
  });

  const found = availableSlots.find((slot) => slot.startAt.toISOString() === startAt.toISOString());
  if (!found) return fail(res, "Turno no disponible", 409);

  const alreadyBooked = await Appointment.exists({ clinicId: clinic._id, startAt, status: "confirmed" });
  if (alreadyBooked) return fail(res, "Turno no disponible", 409);

  const appointment = await Appointment.create({
    clinicId: clinic._id,
    startAt,
    endAt,
    patientFullName: req.body.patientFullName,
    patientPhone: req.body.patientPhone,
    note: req.body.note,
    status: "confirmed",
  });

  return ok(res, appointment, 201);
}
