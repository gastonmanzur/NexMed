import crypto from "node:crypto";
import { Request, Response } from "express";
import { env } from "../config/env";
import { ClinicInvite } from "../models/ClinicInvite";
import { fail, ok } from "../utils/http";

function baseUrl() {
  return env.publicWebBaseUrl.replace(/\/$/, "");
}

export async function createClinicInvite(req: Request, res: Response) {
  const body = (res.locals.validated?.body ?? req.body) as { label?: string; active?: boolean };
  const clinicId = req.auth?.id;
  if (!clinicId) return fail(res, "No autorizado", 401);

  const payload: Record<string, unknown> = {
    clinicId,
    token: crypto.randomBytes(24).toString("hex"),
    active: body.active ?? true,
  };
  if (body.label !== undefined) payload.label = body.label;

  const invite = await ClinicInvite.create(payload);
  const inviteObj = invite.toObject();
  return ok(res, { ...inviteObj, url: `${baseUrl()}/join/${inviteObj.token}` }, 201);
}

export async function listClinicInvites(req: Request, res: Response) {
  const clinicId = req.auth?.id;
  if (!clinicId) return fail(res, "No autorizado", 401);

  const invites = await ClinicInvite.find({ clinicId }).sort({ createdAt: -1 }).lean();
  return ok(
    res,
    invites.map((invite) => ({
      ...invite,
      url: `${baseUrl()}/join/${invite.token}`,
    }))
  );
}

export async function updateClinicInvite(req: Request, res: Response) {
  const clinicId = req.auth?.id;
  if (!clinicId) return fail(res, "No autorizado", 401);

  const existing = await ClinicInvite.findById(req.params.id);
  if (!existing || String(existing.clinicId) !== clinicId) return fail(res, "Invitación no encontrada", 404);

  const body = (res.locals.validated?.body ?? req.body) as { label?: string; active?: boolean };
  if (body.label !== undefined) existing.label = body.label;
  if (body.active !== undefined) existing.active = body.active;
  await existing.save();

  const invite = existing.toObject();
  return ok(res, { ...invite, url: `${baseUrl()}/join/${invite.token}` });
}

export async function ensureDefaultClinicInvite(req: Request, res: Response) {
  const clinicId = req.auth?.id;
  if (!clinicId) return fail(res, "No autorizado", 401);

  let invite = await ClinicInvite.findOne({ clinicId, active: true }).sort({ createdAt: 1 }).lean();
  if (!invite) {
    const created = await ClinicInvite.create({
      clinicId,
      token: crypto.randomBytes(24).toString("hex"),
      active: true,
      label: "Default",
    });
    invite = created.toObject();
  }

  return ok(res, { ...invite, url: `${baseUrl()}/join/${invite.token}` });
}
