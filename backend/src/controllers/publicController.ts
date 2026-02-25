import { Request, Response } from "express";
import { Appointment } from "../models/Appointment";
import { Clinic } from "../models/Clinic";
import { Professional } from "../models/Professional";
import { ProfessionalAvailability } from "../models/ProfessionalAvailability";
import { Specialty } from "../models/Specialty";
import { buildSlots, CLINIC_TIMEZONE, getClinicLocalParts, isSlotAvailable } from "../services/availabilityService";
import { upsertPatientClinicLink } from "../services/patientClinicService";
import { cancelScheduledAppointmentReminders, scheduleAppointmentReminders } from "../services/reminderService";
import { fail, ok } from "../utils/http";

function dateOnlyToClinicStart(value: string) {
  return value;
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

function failConflict(res: Response, code: string, details: Record<string, unknown>) {
  const payload: Record<string, unknown> = { ok: false, error: "Turno no disponible", code };
  if (isDevEnvironment()) payload.details = details;
  return res.status(409).json(payload);
}

function hasTimezoneOffset(value: string) {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
}

function parseRequestedStart(body: {
  startAt?: string;
  endAt?: string;
  date?: string;
  time?: string;
  slotMinutes?: number;
}) {
  if (body.startAt) {
    if (!hasTimezoneOffset(body.startAt)) {
      throw new Error("startAt debe incluir zona horaria");
    }
    const startAt = new Date(body.startAt);
    startAt.setSeconds(0, 0);
    return startAt;
  }

  if (!body.date || !body.time) {
    throw new Error("Debés enviar startAt o date+time");
  }

  const [hourRaw, minuteRaw] = body.time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  const clinicDateUtc = new Date(`${body.date}T03:00:00.000Z`);
  const startAt = new Date(clinicDateUtc.getTime() + (hour * 60 + minute) * 60_000);
  startAt.setSeconds(0, 0);
  return startAt;
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

  const slots = await buildSlots({
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

  const slots = await buildSlots({
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
    startAt?: string;
    endAt?: string;
    date?: string;
    time?: string;
    slotMinutes?: number;
    patientFullName: string;
    patientPhone: string;
    note?: string;
  };
  const slug = String(req.params.slug);
  const clinic = await Clinic.findOne({ slug }).lean();
  if (!clinic) return fail(res, "Clínica no encontrada", 404);

  const professionalId = body.professionalId ? String(body.professionalId) : undefined;
  const specialtyId = body.specialtyId ? String(body.specialtyId) : undefined;

  let startAt: Date;
  try {
    startAt = parseRequestedStart(body);
  } catch (error: any) {
    return fail(res, error?.message ?? "Fecha y hora inválidas", 400);
  }
  const clinicLocal = getClinicLocalParts(startAt);
  const clinicTzDateKey = clinicLocal.dateKey;

  const professional = professionalId
    ? await Professional.findOne({ _id: professionalId, clinicId: clinic._id, isActive: true }).lean()
    : null;
  if (professionalId && !professional) {
    return failConflict(res, "PROFESSIONAL_MISMATCH", {
      startAt: startAt.toISOString(),
      clinicTzDateKey,
      weekday: clinicLocal.weekday,
      clinicTimezone: CLINIC_TIMEZONE,
      professionalId,
      specialtyId,
    });
  }

  if (professional && specialtyId && !professional.specialtyIds.some((id) => String(id) === specialtyId)) {
    return failConflict(res, "SPECIALTY_MISMATCH", {
      startAt: startAt.toISOString(),
      clinicTzDateKey,
      weekday: clinicLocal.weekday,
      clinicTimezone: CLINIC_TIMEZONE,
      professionalId,
      specialtyId,
    });
  }

  if (specialtyId) {
    const specialty = await Specialty.findOne({ _id: specialtyId, clinicId: clinic._id, isActive: true }).lean();
    if (!specialty) return fail(res, "Especialidad inválida", 400);
  }

  const weekday = clinicLocal.weekday;
  const blockRows = professionalId
    ? await ProfessionalAvailability.find({ clinicId: clinic._id, professionalId, weekday, isActive: true }).lean()
    : [];

  const requestedMinutes = clinicLocal.hour * 60 + clinicLocal.minute;
  const slotMinutes = professionalId
    ? blockRows.find((b) => {
        const start = Number(b.startTime.slice(0, 2)) * 60 + Number(b.startTime.slice(3, 5));
        const end = Number(b.endTime.slice(0, 2)) * 60 + Number(b.endTime.slice(3, 5));
        return requestedMinutes >= start && requestedMinutes < end;
      })?.slotMinutes ?? clinic.settings.slotDurationMinutes
    : clinic.settings.slotDurationMinutes;
  const endAt = new Date(startAt.getTime() + slotMinutes * 60_000);

  if (professionalId) {
    const invalidGrid = !blockRows.some((b) => {
      const blockStart = Number(b.startTime.slice(0, 2)) * 60 + Number(b.startTime.slice(3, 5));
      const blockEnd = Number(b.endTime.slice(0, 2)) * 60 + Number(b.endTime.slice(3, 5));
      return requestedMinutes >= blockStart && requestedMinutes + b.slotMinutes <= blockEnd && (requestedMinutes - blockStart) % b.slotMinutes === 0;
    });

    if (invalidGrid) {
      return failConflict(res, "INVALID_GRID", {
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        clinicTzDateKey,
        weekday,
        clinicTimezone: CLINIC_TIMEZONE,
        professionalId,
        specialtyId,
      });
    }
  }

  const availability = await isSlotAvailable({
    clinicId: clinic._id,
    ...(professionalId ? { professionalId } : {}),
    ...(specialtyId ? { specialtyId } : {}),
    startAt,
    endAt,
  });
  if (!availability.available) {
    const code = (availability.code === "SLOT_NOT_AVAILABLE" && professionalId ? "OUTSIDE_BLOCK" : availability.code) ?? "SLOT_NOT_AVAILABLE";
    return failConflict(res, code, {
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      clinicTzDateKey,
      weekday,
      clinicTimezone: CLINIC_TIMEZONE,
      professionalId,
      specialtyId,
    });
  }

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

  const appointmentProfessionalId = appointment.professionalId ? String(appointment.professionalId) : undefined;
  const appointmentSpecialtyId = appointment.specialtyId ? String(appointment.specialtyId) : undefined;

  const availability = await isSlotAvailable({
    clinicId: clinic._id,
    ...(appointmentProfessionalId ? { professionalId: appointmentProfessionalId } : {}),
    ...(appointmentSpecialtyId ? { specialtyId: appointmentSpecialtyId } : {}),
    startAt: nextStartAt,
    endAt: nextEndAt,
  });

  if (!availability.available) return fail(res, "Turno no disponible", 409);

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
