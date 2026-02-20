import { Request, Response } from "express";
import { Appointment } from "../models/Appointment";
import { ClinicNotificationSettings } from "../models/ClinicNotificationSettings";
import { Reminder } from "../models/Reminder";
import { fail, ok } from "../utils/http";
import { getOrCreateClinicNotificationSettings, previewReminderSchedule } from "../services/reminderService";

export async function getClinicNotificationSettings(req: Request, res: Response) {
  const clinicId = req.auth?.id;
  if (!clinicId) return fail(res, "No autorizado", 401);

  const settings = await getOrCreateClinicNotificationSettings(clinicId);
  return ok(res, settings);
}

export async function updateClinicNotificationSettings(req: Request, res: Response) {
  const clinicId = req.auth?.id;
  if (!clinicId) return fail(res, "No autorizado", 401);

  const body = res.locals.validated?.body ?? req.body;

  const settings = await ClinicNotificationSettings.findOneAndUpdate(
    { clinicId },
    {
      remindersEnabled: body.remindersEnabled,
      timezone: body.timezone ?? "America/Argentina/Buenos_Aires",
      rules: body.rules,
    },
    { new: true, upsert: true }
  ).lean();

  return ok(res, settings);
}

export async function listPatientNotifications(req: Request, res: Response) {
  const patientId = req.auth?.id;
  if (!patientId) return fail(res, "No autorizado", 401);

  const reminders = await Reminder.find({
    patientId,
    channel: "inApp",
    status: "sent",
  })
    .sort({ sentAt: -1 })
    .limit(50)
    .select("appointmentId scheduledFor payloadSnapshot sentAt")
    .lean();

  return ok(res, reminders);
}

export async function previewClinicNotificationSchedule(req: Request, res: Response) {
  const clinicId = req.auth?.id;
  if (!clinicId) return fail(res, "No autorizado", 401);

  const query = (res.locals.validated?.query ?? req.query) as { appointmentId: string };
  const appointment = await Appointment.findOne({ _id: query.appointmentId, clinicId });
  if (!appointment) return fail(res, "Turno no encontrado", 404);

  const settings = await getOrCreateClinicNotificationSettings(clinicId);
  const preview = await previewReminderSchedule(appointment, settings);

  return ok(res, { appointmentId: appointment._id, startAt: appointment.startAt, preview });
}
