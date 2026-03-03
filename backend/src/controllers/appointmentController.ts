import { Request, Response } from "express";
import { Appointment } from "../models/Appointment";
import { updateAppointmentStatus } from "../services/appointmentStatusService";
import { Types } from "mongoose";
import { Professional } from "../models/Professional";
import { Specialty } from "../models/Specialty";
import { Patient } from "../models/Patient";
import { Clinic } from "../models/Clinic";
import { fail, ok } from "../utils/http";
import { cancelPendingReminders } from "../services/reminders/reminderService";
import { enqueueEmailJobs } from "../services/email/emailQueue";
import { createNotificationIdempotent } from "../services/notificationService";

const AR_TZ = "America/Argentina/Buenos_Aires";

function formatDateTimeAr(value: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: AR_TZ,
  }).format(value);
}

function dateOnlyToUtcStart(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function listAppointments(req: Request, res: Response) {
  const clinicId = req.auth?.id;
  if (!clinicId) return fail(res, "No autorizado", 401);

  const query = (res.locals.validated?.query ?? req.query) as {
    from: string;
    to: string;
    q?: string;
    professionalId?: string;
    status?: "booked" | "canceled" | "completed" | "no_show";
    confirmation?: "pending" | "confirmed" | "rejected";
  };
  const from = dateOnlyToUtcStart(String(query.from));
  const to = dateOnlyToUtcStart(String(query.to));
  const q = String(query.q ?? "").trim();
  const professionalId = query.professionalId ? String(query.professionalId) : "";

  const filter: any = {
    clinicId,
    startAt: { $gte: from, $lt: to },
  };

  if (query.status) filter.status = query.status;
  if (query.confirmation) filter.confirmationStatus = query.confirmation;

  if (q) {
    filter.patientPhone = { $regex: q, $options: "i" };
  }

  if (professionalId && Types.ObjectId.isValid(professionalId)) {
    filter.professionalId = professionalId;
  }

  const appointments = await Appointment.find(filter)
    .select("startAt endAt patientFullName patientPhone note status confirmationStatus confirmedAt professionalId specialtyId clinicId clinicSlug")
    .sort({ startAt: 1 })
    .lean();

  const professionalIds = [
    ...new Set(
      appointments
        .map((appointment) => appointment.professionalId)
        .filter((id): id is Types.ObjectId => Boolean(id))
        .map((id) => id.toString())
    ),
  ];

  const professionals = professionalIds.length
    ? await Professional.find({ _id: { $in: professionalIds }, clinicId: new Types.ObjectId(clinicId) })
        .select("firstName lastName displayName")
        .lean()
    : [];

  const professionalNameById = new Map(
    professionals.map((professional) => {
      const fullName = `${professional.firstName ?? ""} ${professional.lastName ?? ""}`.trim();
      return [String(professional._id), professional.displayName || fullName || null] as const;
    })
  );

  const mappedAppointments = appointments.map((appointment) => {
    const professionalId = appointment.professionalId ? String(appointment.professionalId) : null;

    return {
      ...appointment,
      professionalId,
      professionalName: professionalId ? professionalNameById.get(professionalId) ?? "Profesional a confirmar" : "Profesional a confirmar",
    };
  });

  return ok(res, mappedAppointments);
}

export async function confirmAppointment(req: Request, res: Response) {
  const clinicId = req.auth?.id;
  if (!clinicId) return fail(res, "No autorizado", 401);

  const appointment = await Appointment.findOne({ _id: req.params.id, clinicId } as any);
  console.info("[appointment.confirm] confirm request", { appointmentId: req.params.id, clinicId });
  if (!appointment) return fail(res, "Turno no encontrado", 404);
  if (appointment.status !== "booked") return fail(res, "Solo podés confirmar turnos reservados", 400);

  if (appointment.confirmationStatus !== "confirmed") {
    appointment.confirmationStatus = "confirmed";
    appointment.confirmedAt = new Date();
    appointment.confirmedBy = { clinicId: new Types.ObjectId(clinicId) };
    appointment.rejectedAt = null;
    appointment.rejectedBy = null;
    appointment.rejectionReason = null;
    await appointment.save();
  }

  const [professional, specialty, patient, clinic] = await Promise.all([
    appointment.professionalId ? Professional.findById(appointment.professionalId).select("firstName lastName displayName").lean() : null,
    appointment.specialtyId ? Specialty.findById(appointment.specialtyId).select("name").lean() : null,
    appointment.patientId ? Patient.findById(appointment.patientId).select("firstName lastName email").lean() : null,
    Clinic.findById(appointment.clinicId).select("name slug address city phone").lean(),
  ]);

  const professionalFullName = professional?.displayName || `${professional?.firstName ?? ""} ${professional?.lastName ?? ""}`.trim() || "Profesional asignado";

  const email = await enqueueEmailJobs("appointment.confirmed_by_clinic", appointment, {
    dedupeKey: `appointment.confirmed_by_clinic:${String(appointment._id)}`,
  });

  if (appointment.patientId && clinic) {
    const appointmentDate = new Intl.DateTimeFormat("es-AR", {
      dateStyle: "short",
      timeZone: AR_TZ,
    }).format(appointment.startAt);
    const appointmentTime = new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: AR_TZ,
    }).format(appointment.startAt);

    try {
      await createNotificationIdempotent({
        recipientUserId: appointment.patientId,
        recipientType: "patient",
        dedupeKey: `appointment.confirmed:${String(appointment._id)}`,
        type: "appointment.confirmed",
        title: "Turno confirmado",
        message: `Tu turno fue confirmado por ${clinic.name} para ${appointmentDate} ${appointmentTime} con ${professionalFullName}.`,
        data: {
          appointmentId: String(appointment._id),
          clinicSlug: appointment.clinicSlug || clinic.slug,
          clinicName: clinic.name,
          clinicId: String(clinic._id),
          startAt: appointment.startAt.toISOString(),
          endAt: appointment.endAt.toISOString(),
          professionalId: appointment.professionalId ? String(appointment.professionalId) : null,
          professionalFullName,
          url: `/patient/my-appointments`,
        },
      });
    } catch (notificationError) {
      console.error("[appointment.confirm] failed to create internal notification", {
        appointmentId: String(appointment._id),
        patientId: String(appointment.patientId),
        error: notificationError,
      });
    }
  }

  return ok(res, {
    appointment: {
      ...appointment.toObject(),
      professional: appointment.professionalId ? { _id: String(appointment.professionalId), fullName: professionalFullName } : null,
      specialty: specialty ? { _id: String(specialty._id), name: specialty.name } : null,
      patient: patient
        ? {
            name: `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim(),
            email: patient.email,
          }
        : null,
      clinic: clinic
        ? {
            _id: String(clinic._id),
            name: clinic.name,
            slug: clinic.slug,
            address: clinic.address,
            city: clinic.city,
            phone: clinic.phone,
          }
        : null,
    },
    emailQueued: email.queued,
  });
}

export async function cancelAppointment(req: Request, res: Response) {
  const clinicId = req.auth?.id;

  const appointment = await Appointment.findOne({ _id: req.params.id, clinicId } as any);
  if (!appointment) return fail(res, "Turno no encontrado", 404);

  const updatedAppointment = await updateAppointmentStatus(appointment._id, "canceled", "clinic_cancel", "clinic_cancel_endpoint");
  await cancelPendingReminders(updatedAppointment._id, "appointment_canceled");
  const email = await enqueueEmailJobs("appointment.canceled", updatedAppointment);
  return ok(res, { appointment: updatedAppointment, emailQueued: email.queued });
}
