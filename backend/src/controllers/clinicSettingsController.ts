import { Request, Response } from "express";
import { Clinic } from "../models/Clinic";
import { fail, ok } from "../utils/http";
import { getDefaultReminderPolicy } from "../services/reminders/reminderService";

const DEFAULT_BOOKING_SETTINGS = {
  requireClinicConfirmation: false,
  autoConfirmAppointments: true,
};

export async function getClinicReminderSettings(req: Request, res: Response) {
  const clinicId = req.auth?.id;
  if (!clinicId) return fail(res, "No autorizado", 401);

  const clinic = await Clinic.findById(clinicId).select("reminderPolicy").lean();
  const reminderPolicy = clinic?.reminderPolicy ?? getDefaultReminderPolicy();

  return ok(res, reminderPolicy);
}

export async function updateClinicReminderSettings(req: Request, res: Response) {
  const clinicId = req.auth?.id;
  if (!clinicId) return fail(res, "No autorizado", 401);

  const body = res.locals.validated?.body ?? req.body;
  const reminderPolicy = {
    enabled: body.enabled,
    channels: { email: body.channels.email },
    offsets: body.offsets,
    updatedAt: new Date(),
  };

  await Clinic.updateOne({ _id: clinicId }, { $set: { reminderPolicy } });
  return ok(res, reminderPolicy);
}

export async function getClinicBookingSettings(req: Request, res: Response) {
  const clinicId = req.auth?.id;
  if (!clinicId) return fail(res, "No autorizado", 401);

  const clinic = await Clinic.findById(clinicId).select("bookingSettings").lean();
  const bookingSettings = clinic?.bookingSettings ?? DEFAULT_BOOKING_SETTINGS;

  return ok(res, bookingSettings);
}

export async function updateClinicBookingSettings(req: Request, res: Response) {
  const clinicId = req.auth?.id;
  if (!clinicId) return fail(res, "No autorizado", 401);

  const body = res.locals.validated?.body ?? req.body;
  const bookingSettings = {
    requireClinicConfirmation: Boolean(body.requireClinicConfirmation),
    autoConfirmAppointments: body.requireClinicConfirmation ? Boolean(body.autoConfirmAppointments) : true,
  };

  await Clinic.updateOne({ _id: clinicId }, { $set: { bookingSettings } });
  return ok(res, bookingSettings);
}
