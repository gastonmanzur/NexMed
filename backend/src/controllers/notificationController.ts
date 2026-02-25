import { Request, Response } from "express";
import { Appointment } from "../models/Appointment";
import { Clinic } from "../models/Clinic";
import { Reminder } from "../models/Reminder";
import { ReminderJob } from "../models/ReminderJob";
import { fail, ok } from "../utils/http";
import { computeScheduledFor, getDefaultReminderPolicy } from "../services/reminders/reminderService";

export async function getClinicNotificationSettings(req: Request, res: Response) {
  const clinicId = req.auth?.id;
  if (!clinicId) return fail(res, "No autorizado", 401);

  const clinic = await Clinic.findById(clinicId).select("reminderPolicy").lean();
  return ok(res, clinic?.reminderPolicy ?? getDefaultReminderPolicy());
}

export async function updateClinicNotificationSettings(req: Request, res: Response) {
  const clinicId = req.auth?.id;
  if (!clinicId) return fail(res, "No autorizado", 401);

  const body = res.locals.validated?.body ?? req.body;
  const reminderPolicy = {
    enabled: body.remindersEnabled,
    channels: { email: true },
    offsets: (body.rules ?? [])
      .filter((rule: any) => rule.channel === "email" && rule.enabled)
      .map((rule: any) => ({ amount: rule.offsetValue, unit: rule.offsetUnit })),
    updatedAt: new Date(),
  };

  await Clinic.updateOne({ _id: clinicId }, { $set: { reminderPolicy } });
  return ok(res, reminderPolicy);
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
  const appointment = await Appointment.findOne({ _id: query.appointmentId, clinicId }).lean();
  if (!appointment) return fail(res, "Turno no encontrado", 404);

  const clinic = await Clinic.findById(clinicId).select("reminderPolicy").lean();
  const policy = clinic?.reminderPolicy ?? getDefaultReminderPolicy();
  const now = Date.now();

  const preview = policy.offsets.map((offset) => {
    const scheduledFor = computeScheduledFor(appointment.startAt, offset, "America/Argentina/Buenos_Aires");
    return {
      ruleId: `${offset.amount}${offset.unit}`,
      channel: "email",
      offsetValue: offset.amount,
      offsetUnit: offset.unit,
      scheduledFor,
      skipped: !policy.enabled || !policy.channels.email || scheduledFor.getTime() <= now,
      label: `${offset.amount} ${offset.unit} antes por email`,
    };
  });

  return ok(res, { appointmentId: appointment._id, startAt: appointment.startAt, preview });
}

export async function triggerAppointmentRemindersNow(req: Request, res: Response) {
  if (process.env.NODE_ENV === "production") {
    return fail(res, "No disponible en producción", 404);
  }

  const params = (res.locals.validated?.params ?? req.params) as { appointmentId: string };

  const result = await ReminderJob.updateMany(
    { appointmentId: params.appointmentId, status: { $in: ["pending", "failed"] } },
    { $set: { nextRunAt: new Date(), status: "pending", lastError: "" } }
  );

  return ok(res, {
    appointmentId: params.appointmentId,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    forcedAt: new Date(),
  });
}
