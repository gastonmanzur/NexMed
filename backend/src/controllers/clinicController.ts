import { Request, Response } from "express";
import { Clinic } from "../models/Clinic";
import { fail, ok } from "../utils/http";

export async function getMe(req: Request, res: Response) {
  const clinic = await Clinic.findById(req.auth?.clinicId).select({ passwordHash: 0 }).lean();
  if (!clinic) return fail(res, "Clínica no encontrada", 404);
  return ok(res, clinic);
}

export async function updateSettings(req: Request, res: Response) {
  const clinic = await Clinic.findByIdAndUpdate(
    req.auth?.clinicId,
    { settings: req.body },
    { new: true }
  )
    .select({ passwordHash: 0 })
    .lean();

  if (!clinic) return fail(res, "Clínica no encontrada", 404);
  return ok(res, clinic.settings);
}
