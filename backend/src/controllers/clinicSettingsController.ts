import { Request, Response } from "express";
import { Clinic } from "../models/Clinic";
import { fail, ok } from "../utils/http";
import { getDefaultReminderPolicy } from "../services/reminders/reminderService";

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
