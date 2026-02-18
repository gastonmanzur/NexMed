import { Request, Response } from "express";
import { Appointment } from "../models/Appointment";
import { Clinic } from "../models/Clinic";
import { Professional } from "../models/Professional";
import { Specialty } from "../models/Specialty";
import { buildAvailableSlots } from "../services/availabilityService";
import { upsertPatientClinicLink } from "../services/patientClinicService";
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
  const professionalId = req.query.professionalId ? String(req.query.professionalId) : undefined;
  const specialtyId = req.query.specialtyId ? String(req.query.specialtyId) : undefined;

  const slots = await buildAvailableSlots({
    clinicId: clinic._id,
    from,
    to,
    weeklySchedule: clinic.settings.weeklySchedule,
    slotDurationMinutes: clinic.settings.slotDurationMinutes,
    ...(professionalId ? { professionalId } : {}),
    ...(specialtyId ? { specialtyId } : {}),
  });

  return ok(res, {
    clinic: { name: clinic.name, slug: clinic.slug, phone: clinic.phone, address: clinic.address, city: clinic.city },
    slots: slots.map((s) => ({
      startAt: s.startAt.toISOString(),
      endAt: s.endAt.toISOString(),
      professionalId: s.professionalId,
    })),
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
    slots: slots.map((s) => ({ startAt: s.startAt.toISOString(), endAt: s.endAt.toISOString(), professionalId: s.professionalId })),
  });
}

export async function listPublicSpecialties(req: Request, res: Response) {
  const slug = String(req.params.slug);
  const clinic = await Clinic.findOne({ slug }).select({ _id: 1 }).lean();
  if (!clinic) return fail(res, "Clínica no encontrada", 404);

  const rows = await Specialty.find({ clinicId: clinic._id, isActive: true }).sort({ name: 1 }).lean();
  return ok(res, rows);
}

export async function listPublicProfessionals(req: Request, res: Response) {
  const slug = String(req.params.slug);
  const clinic = await Clinic.findOne({ slug }).select({ _id: 1 }).lean();
  if (!clinic) return fail(res, "Clínica no encontrada", 404);

  const includeSpecialties = String(req.query.includeSpecialties ?? "false") === "true";
  const professionals = await Professional.find({ clinicId: clinic._id, isActive: true })
    .sort({ firstName: 1, lastName: 1 })
    .lean();

  if (!includeSpecialties) return ok(res, professionals);

  const specialtyIds = [...new Set(professionals.flatMap((p) => p.specialtyIds.map((id) => String(id))))];
  const specialties = await Specialty.find({ clinicId: clinic._id, _id: { $in: specialtyIds }, isActive: true })
    .select({ _id: 1, name: 1 })
    .lean();
  const specialtyMap = new Map(specialties.map((s) => [String(s._id), s]));

  return ok(
    res,
    professionals.map((p) => ({
      ...p,
      specialties: p.specialtyIds.map((id) => specialtyMap.get(String(id))).filter(Boolean),
    }))
  );
}

export async function createPublicAppointment(req: Request, res: Response) {
  const slug = String(req.params.slug);
  const clinic = await Clinic.findOne({ slug }).lean();
  if (!clinic) return fail(res, "Clínica no encontrada", 404);

  const professionalId = req.body.professionalId ? String(req.body.professionalId) : undefined;
  const specialtyId = req.body.specialtyId ? String(req.body.specialtyId) : undefined;

  if (professionalId) {
    const professional = await Professional.findOne({ _id: professionalId, clinicId: clinic._id, isActive: true }).lean();
    if (!professional) return fail(res, "Profesional inválido", 400);
    if (specialtyId && !professional.specialtyIds.some((id) => String(id) === specialtyId)) {
      return fail(res, "Especialidad inválida para el profesional", 400);
    }
  }

  if (specialtyId) {
    const specialty = await Specialty.findOne({ _id: specialtyId, clinicId: clinic._id, isActive: true }).lean();
    if (!specialty) return fail(res, "Especialidad inválida", 400);
  }

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
    ...(professionalId ? { professionalId } : {}),
    ...(specialtyId ? { specialtyId } : {}),
  });

  const found = availableSlots.find((slot) => slot.startAt.toISOString() === startAt.toISOString());
  if (!found) return fail(res, "Turno no disponible", 409);

  const alreadyBookedFilter: any = { clinicId: clinic._id, startAt, status: "confirmed" };
  if (professionalId) alreadyBookedFilter.professionalId = professionalId;
  const alreadyBooked = await Appointment.exists(alreadyBookedFilter);
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

  if (professionalId) appointmentPayload.professionalId = professionalId;
  if (specialtyId) appointmentPayload.specialtyId = specialtyId;

  if (req.auth?.type === "patient") {
    appointmentPayload.patientId = req.auth.id;
  }

  const appointment = await Appointment.create(appointmentPayload);

  if (req.auth?.type === "patient") {
    await upsertPatientClinicLink({
      patientId: req.auth.id,
      clinicId: clinic._id,
      source: "appointment",
    });
  }

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

  const appointmentProfessionalId = appointment.professionalId ? String(appointment.professionalId) : "";
  const appointmentSpecialtyId = appointment.specialtyId ? String(appointment.specialtyId) : "";

  const availableSlots = await buildAvailableSlots({
    clinicId: clinic._id,
    from,
    to,
    weeklySchedule: clinic.settings.weeklySchedule,
    slotDurationMinutes: clinic.settings.slotDurationMinutes,
    ...(appointmentProfessionalId ? { professionalId: appointmentProfessionalId } : {}),
    ...(appointmentSpecialtyId ? { specialtyId: appointmentSpecialtyId } : {}),
  });

  const found = availableSlots.find((slot) => slot.startAt.toISOString() === nextStartAt.toISOString());
  if (!found) return fail(res, "Turno no disponible", 409);

  const alreadyBookedFilter: any = { clinicId: clinic._id, startAt: nextStartAt, status: "confirmed" };
  if (appointment.professionalId) alreadyBookedFilter.professionalId = appointment.professionalId;
  const alreadyBooked = await Appointment.exists(alreadyBookedFilter);
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
    professionalId: appointment.professionalId,
    specialtyId: appointment.specialtyId,
  };

  if (appointment.note) {
    newAppointmentPayload.note = appointment.note;
  }

  const newAppointment = await Appointment.create(newAppointmentPayload);

  return ok(res, { cancelledAppointmentId: appointmentId, appointment: newAppointment });
}
