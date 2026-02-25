import { Request, Response } from "express";
import { MongoServerError } from "mongodb";
import { Appointment } from "../models/Appointment";
import { Patient } from "../models/Patient";
import { Clinic } from "../models/Clinic";
import { Professional } from "../models/Professional";
import { ProfessionalAvailability } from "../models/ProfessionalAvailability";
import { Specialty } from "../models/Specialty";
import { buildSlots, CLINIC_TIMEZONE, getClinicLocalParts } from "../services/availabilityService";
import { upsertPatientClinicLink } from "../services/patientClinicService";
import { cancelScheduledAppointmentReminders, scheduleAppointmentReminders } from "../services/reminderService";
import { updateAppointmentStatus } from "../services/appointmentStatusService";
import { fail, ok } from "../utils/http";
import { alignToGrid, buildSlotKey, normalizeStartAt, SlotValidationError } from "../utils/slots";

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

function isDuplicateSlotError(error: unknown) {
  return error instanceof MongoServerError && error.code === 11000;
}

function logDuplicateSlot(details: { clinicId: string; professionalId?: string; startAt: string }) {
  if (!isDevEnvironment()) return;
  console.info("[public-booking] duplicate slot", details);
}


function failConflict(res: Response, code: string, details: Record<string, unknown>) {
  const payload: Record<string, unknown> = { ok: false, error: "Turno no disponible", code };
  if (isDevEnvironment()) payload.details = details;
  return res.status(409).json(payload);
}

function hasTimezoneOffset(value: string) {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
}


async function buildProfessionalNameMap(professionalIds: string[]) {
  if (!professionalIds.length) return new Map<string, string>();

  const professionals = await Professional.find({ _id: { $in: professionalIds } })
    .select({ firstName: 1, lastName: 1, displayName: 1 })
    .lean();

  return new Map(
    professionals.map((professional) => {
      const fullName = `${professional.firstName ?? ""} ${professional.lastName ?? ""}`.trim();
      return [String(professional._id), professional.displayName || fullName || "Profesional a confirmar"] as const;
    })
  );
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
    if (Number.isNaN(startAt.getTime())) {
      throw new Error("startAt inválido");
    }
    return normalizeStartAt(startAt);
  }

  if (!body.date || !body.time) {
    throw new Error("Debés enviar startAt o date+time");
  }

  const [hourRaw, minuteRaw] = body.time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error("Hora inválida");
  }

  const clinicDateUtc = new Date(`${body.date}T03:00:00.000Z`);
  const startAt = new Date(clinicDateUtc.getTime() + (hour * 60 + minute) * 60_000);
  if (Number.isNaN(startAt.getTime())) {
    throw new Error("Fecha inválida");
  }
  return normalizeStartAt(startAt);
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
      professionalFullName: s.professionalFullName,
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
    slots: slots.map((s) => ({
      startAt: s.startAt.toISOString(),
      endAt: s.endAt.toISOString(),
      professionalId: s.professionalId,
      professionalFullName: s.professionalFullName,
    })),
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
    note?: string;
  };
  const slug = String(req.params.slug);
  const clinic = await Clinic.findOne({ slug }).lean();
  if (!clinic) return fail(res, "Clínica no encontrada", 404);

  const professionalId = body.professionalId ? String(body.professionalId) : undefined;
  const specialtyId = body.specialtyId ? String(body.specialtyId) : undefined;

  if (!professionalId && !specialtyId) {
    return res.status(400).json({
      ok: false,
      error: "Debés seleccionar un profesional o una especialidad",
      code: "MISSING_PROFESSIONAL_OR_SPECIALTY",
    });
  }

  let startAt: Date;
  try {
    startAt = parseRequestedStart(body);
  } catch (error: any) {
    return fail(res, error?.message ?? "Fecha y hora inválidas", 400);
  }
  const clinicLocal = getClinicLocalParts(startAt);
  const clinicTzDateKey = clinicLocal.dateKey;

  let resolvedProfessionalId = professionalId;

  if (!resolvedProfessionalId && specialtyId) {
    const fromKey = clinicTzDateKey;
    const nextDate = new Date(`${clinicTzDateKey}T00:00:00.000Z`);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    const dayAfter = nextDate.toISOString().slice(0, 10);

    const daySlots = await buildSlots({
      clinicId: clinic._id,
      from: fromKey,
      to: dayAfter,
      specialtyId,
    });

    const matchedSlot = daySlots.find((slot) => slot.startAt.getTime() === startAt.getTime());
    if (!matchedSlot?.professionalId) {
      return failConflict(res, "SLOT_NOT_AVAILABLE", {
        startAt: startAt.toISOString(),
        clinicTzDateKey,
        specialtyId,
      });
    }

    resolvedProfessionalId = matchedSlot.professionalId;
  }

  const professional = resolvedProfessionalId
    ? await Professional.findOne({ _id: resolvedProfessionalId, clinicId: clinic._id, isActive: true }).lean()
    : null;
  if (resolvedProfessionalId && !professional) {
    return res.status(400).json({
      ok: false,
      error: "El profesional seleccionado no pertenece a la clínica",
      code: "PROFESSIONAL_NOT_IN_CLINIC",
    });
  }

  if (specialtyId) {
    const specialty = await Specialty.findOne({ _id: specialtyId, clinicId: clinic._id, isActive: true }).lean();
    if (!specialty) {
      return res.status(400).json({
        ok: false,
        error: "La especialidad seleccionada no pertenece a la clínica",
        code: "SPECIALTY_NOT_IN_CLINIC",
      });
    }
  }

  if (professional && specialtyId && !professional.specialtyIds.some((id) => String(id) === specialtyId)) {
    return res.status(400).json({
      ok: false,
      error: "La especialidad seleccionada no corresponde al profesional",
      code: "SPECIALTY_NOT_IN_PROFESSIONAL",
    });
  }

  const weekday = clinicLocal.weekday;
  const blockRows = resolvedProfessionalId
    ? await ProfessionalAvailability.find({ clinicId: clinic._id, professionalId: resolvedProfessionalId, weekday, isActive: true }).lean()
    : [];

  const requestedMinutes = clinicLocal.hour * 60 + clinicLocal.minute;
  const slotMinutes = resolvedProfessionalId
    ? blockRows.find((b) => {
        const start = Number(b.startTime.slice(0, 2)) * 60 + Number(b.startTime.slice(3, 5));
        const end = Number(b.endTime.slice(0, 2)) * 60 + Number(b.endTime.slice(3, 5));
        return requestedMinutes >= start && requestedMinutes < end;
      })?.slotMinutes ?? clinic.settings.slotDurationMinutes
    : clinic.settings.slotDurationMinutes;
  const endAt = new Date(startAt.getTime() + slotMinutes * 60_000);

  if (resolvedProfessionalId) {
    const matchedBlock = blockRows.find((b) => {
      const blockStart = Number(b.startTime.slice(0, 2)) * 60 + Number(b.startTime.slice(3, 5));
      const blockEnd = Number(b.endTime.slice(0, 2)) * 60 + Number(b.endTime.slice(3, 5));
      return requestedMinutes >= blockStart && requestedMinutes + b.slotMinutes <= blockEnd;
    });

    if (!matchedBlock) {
      return failConflict(res, "OUTSIDE_BLOCK", {
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        clinicTzDateKey,
        weekday,
        clinicTimezone: CLINIC_TIMEZONE,
        professionalId: resolvedProfessionalId,
        specialtyId,
      });
    }

    try {
      alignToGrid(startAt, matchedBlock.startTime, matchedBlock.slotMinutes, CLINIC_TIMEZONE);
    } catch (error) {
      if (error instanceof SlotValidationError) {
        return fail(res, error.message, 400);
      }
      throw error;
    }
  }

  if (req.auth?.type !== "patient") {
    return fail(res, "Debés iniciar sesión para reservar", 401);
  }

  const patient = await Patient.findById(req.auth.id).select({ firstName: 1, lastName: 1, phone: 1 }).lean();
  if (!patient) {
    return fail(res, "Paciente no encontrado", 404);
  }

  const patientFullName = `${patient.firstName} ${patient.lastName}`.trim();
  const patientPhone = patient.phone?.trim() || "N/A";

  const appointmentPayload: any = {
    clinicId: clinic._id,
    clinicSlug: clinic.slug,
    startAt,
    endAt,
    patientFullName,
    patientPhone,
    note: body.note,
    status: "booked",
  };

  if (resolvedProfessionalId) appointmentPayload.professionalId = resolvedProfessionalId;
  if (specialtyId) appointmentPayload.specialtyId = specialtyId;

  if (req.auth?.type === "patient") {
    appointmentPayload.patientId = req.auth.id;
  }

  let appointment;
  try {
    appointment = await Appointment.create(appointmentPayload);
  } catch (error) {
    if (isDuplicateSlotError(error)) {
      logDuplicateSlot({
        clinicId: String(clinic._id),
        ...(resolvedProfessionalId ? { professionalId: resolvedProfessionalId } : {}),
        startAt: buildSlotKey(String(clinic._id), resolvedProfessionalId ?? "none", normalizeStartAt(startAt)),
      });
      return res.status(409).json({ ok: false, error: "Turno no disponible", code: "DUPLICATE_SLOT" });
    }
    throw error;
  }

  await scheduleAppointmentReminders(appointment);

  if (req.auth?.type === "patient") {
    await upsertPatientClinicLink({
      patientId: req.auth.id,
      clinicId: clinic._id,
      source: "appointment",
    });
  }

  const appointmentData = appointment.toObject();
  const map = await buildProfessionalNameMap(appointmentData.professionalId ? [String(appointmentData.professionalId)] : []);
  const professionalName = appointmentData.professionalId ? map.get(String(appointmentData.professionalId)) ?? "Profesional a confirmar" : "Profesional a confirmar";

  const warnings: { missingPhone?: boolean } = {};
  if (!patient.phone || patient.phone.trim() === "") {
    warnings.missingPhone = true;
  }

  return ok(
    res,
    {
      appointment: {
        ...appointmentData,
        professionalName,
      },
      warnings,
    },
    201
  );
}

export async function listMyAppointments(req: Request, res: Response) {
  const patientId = req.auth!.id;
  const appointments = await Appointment.find({ patientId, status: { $in: ["booked"] } }).sort({ startAt: 1 }).lean();

  const professionalIds = [
    ...new Set(
      appointments
        .map((appointment) => appointment.professionalId)
        .filter(Boolean)
        .map((id) => String(id))
    ),
  ];

  const professionalNameById = await buildProfessionalNameMap(professionalIds);

  return ok(
    res,
    appointments.map((appointment) => {
      const professionalIdValue = appointment.professionalId ? String(appointment.professionalId) : null;
      return {
        ...appointment,
        professionalId: professionalIdValue,
        professionalName: professionalIdValue ? professionalNameById.get(professionalIdValue) ?? "Profesional a confirmar" : "Profesional a confirmar",
      };
    })
  );
}


export async function listMyAppointmentHistory(req: Request, res: Response) {
  const patientId = req.auth!.id;
  const query = req.query as Record<string, string | undefined>;

  const defaultStatuses = ["canceled", "completed", "no_show"];
  const statuses = (query.status ?? defaultStatuses.join(",")).split(",").map((value) => value.trim()).filter((value) => defaultStatuses.includes(value));

  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit ?? "10", 10) || 10));

  const sortRaw = (query.sort ?? "startAt:desc").trim();
  const [sortFieldRaw, sortDirectionRaw] = sortRaw.split(":");
  const sortField = sortFieldRaw === "startAt" ? "startAt" : "startAt";
  const sortDirection = sortDirectionRaw === "asc" ? 1 : -1;

  const filter: Record<string, any> = {
    patientId,
    status: { $in: statuses.length ? statuses : defaultStatuses },
  };

  if (query.from || query.to) {
    filter.startAt = {};
    if (query.from) {
      const fromDate = new Date(`${query.from}T00:00:00.000Z`);
      if (!Number.isNaN(fromDate.getTime())) filter.startAt.$gte = fromDate;
    }
    if (query.to) {
      const toDate = new Date(`${query.to}T23:59:59.999Z`);
      if (!Number.isNaN(toDate.getTime())) filter.startAt.$lte = toDate;
    }
    if (!Object.keys(filter.startAt).length) delete filter.startAt;
  }

  if (query.clinicId) filter.clinicId = query.clinicId;
  if (query.professionalId) filter.professionalId = query.professionalId;
  if (query.specialtyId) filter.specialtyId = query.specialtyId;

  if (query.q?.trim()) {
    const q = query.q.trim();
    filter.$or = [
      { patientFullName: { $regex: q, $options: "i" } },
      { patientPhone: { $regex: q, $options: "i" } },
      { note: { $regex: q, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    Appointment.find(filter)
      .sort({ [sortField]: sortDirection })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: "clinicId", select: "name slug address city phone" })
      .populate({ path: "professionalId", select: "firstName lastName displayName" })
      .populate({ path: "specialtyId", select: "name" })
      .lean(),
    Appointment.countDocuments(filter),
  ]);

  const mapped = items.map((item: any) => {
    const clinic = item.clinicId && typeof item.clinicId === "object"
      ? {
          _id: String(item.clinicId._id),
          name: item.clinicId.name,
          slug: item.clinicId.slug,
          address: item.clinicId.address,
          city: item.clinicId.city,
          phone: item.clinicId.phone,
        }
      : null;

    const professional = item.professionalId && typeof item.professionalId === "object"
      ? {
          _id: String(item.professionalId._id),
          fullName: item.professionalId.displayName || `${item.professionalId.firstName || ""} ${item.professionalId.lastName || ""}`.trim() || "Profesional a confirmar",
        }
      : null;

    const specialty = item.specialtyId && typeof item.specialtyId === "object"
      ? { _id: String(item.specialtyId._id), name: item.specialtyId.name }
      : null;

    return {
      ...item,
      clinicId: clinic?._id ?? (item.clinicId ? String(item.clinicId) : undefined),
      professionalId: professional?._id ?? (item.professionalId ? String(item.professionalId) : undefined),
      specialtyId: specialty?._id ?? (item.specialtyId ? String(item.specialtyId) : undefined),
      clinic,
      professional,
      specialty,
    };
  });

  return ok(res, {
    items: mapped,
    page,
    limit,
    total,
  });
}

export async function cancelMyAppointment(req: Request, res: Response) {
  const patientId = req.auth!.id;
  const appointmentId = String(req.params.id);

  const appointment = await Appointment.findOne({ _id: appointmentId, patientId, status: { $in: ["booked"] } });
  if (!appointment) return fail(res, "Turno no encontrado", 404);

  const updatedAppointment = await updateAppointmentStatus(appointment._id, "canceled", "patient_cancel", "patient_cancel_endpoint");
  await cancelScheduledAppointmentReminders(appointment._id);

  return ok(res, updatedAppointment);
}

export async function rescheduleMyAppointment(req: Request, res: Response) {
  const body = (res.locals.validated?.body ?? req.body) as { startAt: string; professionalId?: string; specialtyId?: string };
  const patientId = req.auth!.id;
  const appointmentId = String(req.params.id);

  const appointment = await Appointment.findOne({ _id: appointmentId, patientId, status: { $in: ["booked"] } }).lean();
  if (!appointment) return fail(res, "Turno no encontrado", 404);

  const clinic = await Clinic.findById(appointment.clinicId).lean();
  if (!clinic) return fail(res, "Clínica no encontrada", 404);

  const nextStartAt = new Date(body.startAt);
  if (Number.isNaN(nextStartAt.getTime())) return fail(res, "Fecha y hora inválidas", 400);
  const nextStartAtNormalized = normalizeStartAt(nextStartAt);
  const nextEndAt = new Date(nextStartAtNormalized.getTime() + clinic.settings.slotDurationMinutes * 60_000);

  const requestedProfessionalId = body.professionalId ? String(body.professionalId) : (appointment.professionalId ? String(appointment.professionalId) : undefined);
  const requestedSpecialtyId = body.specialtyId ? String(body.specialtyId) : (appointment.specialtyId ? String(appointment.specialtyId) : undefined);

  if (requestedProfessionalId) {
    const nextLocal = getClinicLocalParts(nextStartAtNormalized);
    const weekday = nextLocal.weekday;
    const requestedMinutes = nextLocal.hour * 60 + nextLocal.minute;
    const blockRows = await ProfessionalAvailability.find({
      clinicId: clinic._id,
      professionalId: requestedProfessionalId,
      weekday,
      isActive: true,
    }).lean();

    const matchedBlock = blockRows.find((b) => {
      const blockStart = Number(b.startTime.slice(0, 2)) * 60 + Number(b.startTime.slice(3, 5));
      const blockEnd = Number(b.endTime.slice(0, 2)) * 60 + Number(b.endTime.slice(3, 5));
      return requestedMinutes >= blockStart && requestedMinutes + b.slotMinutes <= blockEnd;
    });

    if (!matchedBlock) return fail(res, "Turno fuera de disponibilidad", 409);

    try {
      alignToGrid(nextStartAtNormalized, matchedBlock.startTime, matchedBlock.slotMinutes, CLINIC_TIMEZONE);
    } catch (error) {
      if (error instanceof SlotValidationError) {
        return fail(res, error.message, 400);
      }
      throw error;
    }
  }

  const rescheduledAppointmentPayload: any = {
    clinicId: appointment.clinicId,
    clinicSlug: appointment.clinicSlug,
    patientId: appointment.patientId,
    professionalId: requestedProfessionalId,
    specialtyId: requestedSpecialtyId,
    startAt: nextStartAtNormalized,
    endAt: nextEndAt,
    patientFullName: appointment.patientFullName,
    patientPhone: appointment.patientPhone,
    note: appointment.note,
    status: "booked",
    rescheduledFromAppointmentId: appointment._id,
  };

  let newAppointmentId = "";
  const session = await Appointment.startSession();
  try {
    await session.withTransaction(async () => {
      const createdAppointments = await Appointment.create([rescheduledAppointmentPayload], { session });
      const created = createdAppointments[0];
      if (!created) {
        throw new Error("No se pudo crear el nuevo turno");
      }
      newAppointmentId = String(created._id);

      const canceledAppointment = await Appointment.findOneAndUpdate(
        { _id: appointmentId, patientId, status: { $in: ["booked"] } },
        {
          $set: {
            status: "canceled",
            canceledAt: new Date(),
            canceledBy: "patient",
            cancelReason: "reschedule",
            cancelReasonText: "patient_reschedule",
          },
        },
        { new: true, session }
      );

      if (!canceledAppointment) {
        throw new Error("Turno no encontrado");
      }
    });
  } catch (error) {
    if (isDuplicateSlotError(error)) {
      return res.status(409).json({ ok: false, error: "Turno no disponible", code: "DUPLICATE_SLOT" });
    }
    throw error;
  } finally {
    await session.endSession();
  }

  if (!newAppointmentId) return fail(res, "No se pudo reprogramar el turno", 500);

  const newAppointment = await Appointment.findById(newAppointmentId);
  if (!newAppointment) return fail(res, "No se pudo reprogramar el turno", 500);

  await cancelScheduledAppointmentReminders(appointmentId);
  await scheduleAppointmentReminders(newAppointment);

  const map = await buildProfessionalNameMap(newAppointment.professionalId ? [String(newAppointment.professionalId)] : []);
  const professionalName = newAppointment.professionalId ? map.get(String(newAppointment.professionalId)) ?? "Profesional a confirmar" : "Profesional a confirmar";

  return ok(res, { appointment: { ...newAppointment.toObject(), professionalName } });
}
