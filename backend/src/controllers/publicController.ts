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

export async function getClinicAvailabilityById(req: Request, res: Response) {
  const clinic = await Clinic.findById(req.params.clinicId).lean();
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

  const appointmentPayload: any = {
    clinicId: clinic._id,
    clinicSlug: clinic.slug,
    startAt,
    endAt,
    patientFullName: req.body.patientFullName,
    patientPhone: req.body.patientPhone,
    note: req.body.note,
    status: "confirmed",
  };

  if (req.auth?.type === "patient") {
    appointmentPayload.patientId = req.auth.id;
  }

  const appointment = await Appointment.create(appointmentPayload);

  return ok(res, appointment, 201);
}

export async function listMyAppointments(req: Request, res: Response) {
  const patientId = req.auth!.id;
  const appointments = await Appointment.find({ patientId }).sort({ startAt: 1 }).lean();
  return ok(res, appointments);
}

export async function rescheduleMyAppointment(req: Request, res: Response) {
  const patientId = req.auth!.id;
  const appointmentId = String(req.params.id);

  const appointment = await Appointment.findOne({ _id: appointmentId, patientId, status: "confirmed" }).lean();
  if (!appointment) return fail(res, "Turno no encontrado", 404);

  const clinic = await Clinic.findById(appointment.clinicId).lean();
  if (!clinic) return fail(res, "Clínica no encontrada", 404);

  const nextStartAt = new Date(req.body.startAt);
  const nextEndAt = new Date(nextStartAt.getTime() + clinic.settings.slotDurationMinutes * 60_000);

  const from = new Date(Date.UTC(nextStartAt.getUTCFullYear(), nextStartAt.getUTCMonth(), nextStartAt.getUTCDate()));
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 1);

  const availableSlots = await buildAvailableSlots({
    clinicId: clinic._id,
    from,
    to,
    weeklySchedule: clinic.settings.weeklySchedule,
    slotDurationMinutes: clinic.settings.slotDurationMinutes,
  });

  const found = availableSlots.find((slot) => slot.startAt.toISOString() === nextStartAt.toISOString());
  if (!found) return fail(res, "Turno no disponible", 409);

  const alreadyBooked = await Appointment.exists({ clinicId: clinic._id, startAt: nextStartAt, status: "confirmed" });
  if (alreadyBooked) return fail(res, "Turno no disponible", 409);

  await Appointment.findByIdAndUpdate(appointmentId, { status: "cancelled" });

  const newAppointmentPayload: any = {
    clinicId: clinic._id,
    clinicSlug: clinic.slug,
    patientId,
    startAt: nextStartAt,
    endAt: nextEndAt,
    patientFullName: appointment.patientFullName,
    patientPhone: appointment.patientPhone,
    status: "confirmed",
  };

  if (appointment.note) {
    newAppointmentPayload.note = appointment.note;
  }

  const newAppointment = await Appointment.create(newAppointmentPayload);

  return ok(res, { cancelledAppointmentId: appointmentId, appointment: newAppointment });
}
