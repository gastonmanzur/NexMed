import { Request, Response } from "express";
import crypto from "node:crypto";
import { Clinic } from "../models/Clinic";
import { ClinicInvite } from "../models/ClinicInvite";
import { env } from "../config/env";
import { fail, ok } from "../utils/http";

export async function getMe(req: Request, res: Response) {
  const clinic = await Clinic.findById(req.auth?.id).select({ passwordHash: 0 }).lean();
  if (!clinic) return fail(res, "Clínica no encontrada", 404);
  return ok(res, clinic);
}

export async function updateSettings(req: Request, res: Response) {
  const body = res.locals.validated?.body ?? req.body;
  const clinic = await Clinic.findByIdAndUpdate(
    req.auth?.id,
    { settings: body },
    { new: true }
  )
    .select({ passwordHash: 0 })
    .lean();

  if (!clinic) return fail(res, "Clínica no encontrada", 404);
  return ok(res, clinic.settings);
}

export async function createInvite(req: Request, res: Response) {
  const body = (res.locals.validated?.body ?? req.body) as any;
  const clinicId = req.auth?.id;
  if (!clinicId) return fail(res, "No autorizado", 401);

  const token = crypto.randomBytes(24).toString("hex");

  const invite = await ClinicInvite.create({
    clinicId,
    token,
    active: true,
    label: body.label,
  });

  const baseUrl = env.corsOrigin.replace(/\/$/, "");
  return ok(res, { token: invite.token, url: `${baseUrl}/join/${invite.token}` }, 201);
}

export async function listInvites(req: Request, res: Response) {
  const clinicId = req.auth?.id;
  if (!clinicId) return fail(res, "No autorizado", 401);

  const invites = await ClinicInvite.find({ clinicId }).sort({ createdAt: -1 }).lean();

  return ok(
    res,
    invites.map((invite) => ({
      _id: invite._id,
      token: invite.token,
      active: invite.active,
      label: invite.label,
      createdAt: invite.createdAt,
    }))
  );
}
