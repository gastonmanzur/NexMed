import { Request, Response } from "express";
import { Appointment } from "../models/Appointment";
import { Clinic } from "../models/Clinic";
import { Professional } from "../models/Professional";
import { Specialty } from "../models/Specialty";
import { buildAvailableSlots } from "../services/availabilityService";
import { upsertPatientClinicLink } from "../services/patientClinicService";
import { cancelScheduledAppointmentReminders, scheduleAppointmentReminders } from "../services/reminderService";
import {
  DEFAULT_CLINIC_TIMEZONE,
  formatDateKeyInClinicTz,
  getWeekdayInClinicTz,
  parseLocalDateTime,
} from "../utils/datetime";
import { fail, ok } from "../utils/http";

function dateOnlyToClinicStart(value: string) {
  return parseLocalDateTime(value, "00:00", DEFAULT_CLINIC_TIMEZONE);
}


function setNoCacheHeaders(res: Response) {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });
  res.removeHeader("ETag");
}



function buildPublicClinicPayload(clinic: any) {
  const visibility = {
    phone: true,
    whatsapp: true,
    website: true,
    address: true,
    city: true,
    province: true,
    postalCode: true,
    description: true,
    businessHoursNote: true,
    ...(clinic.publicVisibility ?? {}),
  };

  return {
    name: clinic.name,
    slug: clinic.slug,
    ...(visibility.phone && clinic.phone ? { phone: clinic.phone } : {}),
    ...(visibility.whatsapp && clinic.whatsapp ? { whatsapp: clinic.whatsapp } : {}),
    ...(visibility.website && clinic.website ? { website: clinic.website } : {}),
    ...(visibility.address && clinic.address ? { address: clinic.address } : {}),
    ...(visibility.city && clinic.city ? { city: clinic.city } : {}),
    ...(visibility.province && clinic.province ? { province: clinic.province } : {}),
    ...(visibility.postalCode && clinic.postalCode ? { postalCode: clinic.postalCode } : {}),
    ...(visibility.description && clinic.description ? { description: clinic.description } : {}),
    ...(visibility.businessHoursNote && clinic.businessHoursNote ? { businessHoursNote: clinic.businessHoursNote } : {}),
  };
}

function isDevEnvironment() {
  return process.env.NODE_ENV !== "production";
}

export async function getPublicClinic(req: Request, res: Response) {
  setNoCacheHeaders(res);
  const slug = String(req.params.slug);
  const clinic = await Clinic.findOne({ slug }).lean();
  if (!clinic) return fail(res, "Clínica no encontrada", 404);

  return ok(res, buildPublicClinicPayload(clinic));
}

export async function getClinicAvailability(req: Request, res: Response) {
  setNoCacheHeaders(res);
  const query = (res.locals.validated?.query ?? req.query) as {
    from: string;
    to: string;
    professionalId?: string;
    specialtyId?: string;
  };
  const slug = String(req.params.slug);
  const clinic = await Clinic.findOne({ slug }).lean();
  if (!clinic) return fail(res, "Clínica no encontrada", 404);

  const from = dateOnlyToClinicStart(String(query.from));
  const to = dateOnlyToClinicStart(String(query.to));
  const professionalId = query.professionalId ? String(query.professionalId) : undefined;
  const specialtyId = query.specialtyId ? String(query.specialtyId) : undefined;

  const slots = await buildAvailableSlots({
    clinicId: clinic._id,
    from,
    to,
    ...(professionalId ? { professionalId } : {}),
    ...(specialtyId ? { specialtyId } : {}),
  });

  const debug = isDevEnvironment()
    ? {
        clinicId: String(clinic._id),
        from: query.from,
        to: query.to,
      }
    : undefined;

  return ok(res, {
    clinic: buildPublicClinicPayload(clinic),
    slots: slots.map((s) => ({
      startAt: s.startAt.toISOString(),
      endAt: s.endAt.toISOString(),
      professionalId: s.professionalId,
    })),
    ...(debug ? { debug } : {}),
  });
}

export async function getClinicAvailabilityById(req: Request, res: Response) {
  setNoCacheHeaders(res);
  const query = (res.locals.validated?.query ?? req.query) as { from: string; to: string };
  const clinic = await Clinic.findById(req.params.clinicId).lean();
  if (!clinic) return fail(res, "Clínica no encontrada", 404);

  const from = dateOnlyToClinicStart(String(query.from));
  const to = dateOnlyToClinicStart(String(query.to));

  const slots = await buildAvailableSlots({
    clinicId: clinic._id,
    from,
    to,
  });

  return ok(res, {
    clinic: buildPublicClinicPayload(clinic),
    slots: slots.map((s) => ({ startAt: s.startAt.toISOString(), endAt: s.endAt.toISOString(), professionalId: s.professionalId })),
  });
}

export async function listPublicSpecialties(req: Request, res: Response) {
  setNoCacheHeaders(res);
  const slug = String(req.params.slug);
  const clinic = await Clinic.findOne({ slug }).select({ _id: 1 }).lean();
  if (!clinic) return fail(res, "Clínica no encontrada", 404);

  const rows = await Specialty.find({ clinicId: clinic._id, isActive: true }).sort({ name: 1 }).lean();
  return ok(res, rows);
}

export async function listPublicProfessionals(req: Request, res: Response) {
  setNoCacheHeaders(res);
  const query = (res.locals.validated?.query ?? req.query) as { includeSpecialties?: string };
  const slug = String(req.params.slug);
  const clinic = await Clinic.findOne({ slug }).select({ _id: 1 }).lean();
  if (!clinic) return fail(res, "Clínica no encontrada", 404);

  const includeSpecialties = String(query.includeSpecialties ?? "false") === "true";
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
  const body = (res.locals.validated?.body ?? req.body) as {
    professionalId?: string;
    specialtyId?: string;
    startAt: string;
    patientFullName: string;
    patientPhone: string;
    note?: string;
  };
  const slug = String(req.params.slug);
  const clinic = await Clinic.findOne({ slug }).lean();
  if (!clinic) return fail(res, "Clínica no encontrada", 404);

  const professionalId = body.professionalId ? String(body.professionalId) : undefined;
  const specialtyId = body.specialtyId ? String(body.specialtyId) : undefined;

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

  const startAt = new Date(body.startAt);
  const endAt = new Date(startAt.getTime() + clinic.settings.slotDurationMinutes * 60_000);

  const bookingDateKey = formatDateKeyInClinicTz(startAt, DEFAULT_CLINIC_TIMEZONE);
  const bookingWeekday = getWeekdayInClinicTz(startAt, DEFAULT_CLINIC_TIMEZONE);

  const from = parseLocalDateTime(bookingDateKey, "00:00", DEFAULT_CLINIC_TIMEZONE);
  const to = parseLocalDateTime(bookingDateKey, "23:59", DEFAULT_CLINIC_TIMEZONE);
  to.setMinutes(to.getMinutes() + 1);

  const availableSlots = await buildAvailableSlots({
    clinicId: clinic._id,
    from,
    to,
    ...(professionalId ? { professionalId } : {}),
    ...(specialtyId ? { specialtyId } : {}),
  });

  const found = availableSlots.find((slot) => slot.startAt.toISOString() === startAt.toISOString());

  if (isDevEnvironment()) {
    const candidateBlockMatches = availableSlots.filter((slot) => {
      if (professionalId && slot.professionalId !== professionalId) return false;
      return formatDateKeyInClinicTz(slot.startAt, DEFAULT_CLINIC_TIMEZONE) === bookingDateKey;
    });

    console.debug("[booking-validation] slot validation", {
      requested: { startAt: body.startAt, endAt: endAt.toISOString() },
      interpreted: {
        startAtIso: startAt.toISOString(),
        endAtIso: endAt.toISOString(),
        dateKey: bookingDateKey,
        weekday: bookingWeekday,
      },
      matchedBlocksCount: candidateBlockMatches.length,
    });
  }

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
    patientFullName: body.patientFullName,
    patientPhone: body.patientPhone,
    note: body.note,
    status: "confirmed",
  };

  if (professionalId) appointmentPayload.professionalId = professionalId;
  if (specialtyId) appointmentPayload.specialtyId = specialtyId;

  if (req.auth?.type === "patient") {
    appointmentPayload.patientId = req.auth.id;
  }

  const appointment = await Appointment.create(appointmentPayload);
  await scheduleAppointmentReminders(appointment);

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

export async function cancelMyAppointment(req: Request, res: Response) {
  const patientId = req.auth!.id;
  const appointmentId = String(req.params.id);

  const appointment = await Appointment.findOne({ _id: appointmentId, patientId, status: "confirmed" });
  if (!appointment) return fail(res, "Turno no encontrado", 404);

  appointment.status = "cancelled";
  await appointment.save();
  await cancelScheduledAppointmentReminders(appointment._id);

  return ok(res, appointment);
}

export async function rescheduleMyAppointment(req: Request, res: Response) {
  const body = (res.locals.validated?.body ?? req.body) as { startAt: string };
  const patientId = req.auth!.id;
  const appointmentId = String(req.params.id);

  const appointment = await Appointment.findOne({ _id: appointmentId, patientId, status: "confirmed" }).lean();
  if (!appointment) return fail(res, "Turno no encontrado", 404);

  const clinic = await Clinic.findById(appointment.clinicId).lean();
  if (!clinic) return fail(res, "Clínica no encontrada", 404);

  const nextStartAt = new Date(body.startAt);
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
  await cancelScheduledAppointmentReminders(appointmentId);

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
  await scheduleAppointmentReminders(newAppointment);

  return ok(res, { cancelledAppointmentId: appointmentId, appointment: newAppointment });
}
