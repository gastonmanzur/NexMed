import crypto from "node:crypto";
import { Request, Response } from "express";
import { env } from "../config/env";
import { Clinic, ClinicPublicVisibility } from "../models/Clinic";
import { ClinicInvite } from "../models/ClinicInvite";
import { Patient } from "../models/Patient";
import { fail, ok } from "../utils/http";

const defaultPublicVisibility: ClinicPublicVisibility = {
  phone: true,
  whatsapp: true,
  website: true,
  address: true,
  city: true,
  province: true,
  postalCode: true,
  description: true,
  businessHoursNote: true,
};

function setNoStore(res: Response) {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });
  res.removeHeader("ETag");
}

async function ensureDefaultInvite(clinicId: string) {
  let invite = await ClinicInvite.findOne({ clinicId, active: true }).sort({ createdAt: 1 }).lean();
  if (invite) return invite;

  const created = await ClinicInvite.create({
    clinicId,
    token: crypto.randomBytes(24).toString("hex"),
    active: true,
    label: "Default",
  });

  return created.toObject();
}

function webBaseUrl() {
  return env.publicWebBaseUrl.replace(/\/$/, "");
}

async function buildClinicProfile(clinicId: string) {
  const clinic = await Clinic.findById(clinicId).select({ passwordHash: 0 }).lean();
  if (!clinic) return null;
  const defaultInvite = await ensureDefaultInvite(String(clinic._id));
  const base = webBaseUrl();

  return {
    type: "clinic" as const,
    ...clinic,
    publicVisibility: {
      ...defaultPublicVisibility,
      ...(clinic.publicVisibility ?? {}),
    },
    publicBookingUrl: `${base}/c/${clinic.slug}`,
    joinUrlDefault: `${base}/join/${defaultInvite.token}`,
    defaultInvite: {
      _id: defaultInvite._id,
      token: defaultInvite.token,
      label: defaultInvite.label,
      active: defaultInvite.active,
      createdAt: defaultInvite.createdAt,
      updatedAt: defaultInvite.updatedAt,
    },
  };
}

export async function getProfile(req: Request, res: Response) {
  setNoStore(res);
  if (!req.auth) return fail(res, "No autorizado", 401);

  if (req.auth.type === "clinic") {
    const profile = await buildClinicProfile(req.auth.id);
    if (!profile) return fail(res, "Clínica no encontrada", 404);
    return ok(res, profile);
  }

  const patient = await Patient.findById(req.auth.id).select({ passwordHash: 0 }).lean();
  if (!patient) return fail(res, "Paciente no encontrado", 404);

  return ok(res, {
    type: "patient",
    ...patient,
  });
}

export async function updateProfile(req: Request, res: Response) {
  setNoStore(res);
  if (!req.auth) return fail(res, "No autorizado", 401);

  if (req.auth.type === "clinic") {
    const body = (res.locals.validated?.body ?? req.body) as any;
    const updatePayload: Record<string, unknown> = {};
    const editableFields = [
      "name",
      "phone",
      "whatsapp",
      "website",
      "address",
      "city",
      "province",
      "postalCode",
      "description",
      "businessHoursNote",
      "legalName",
      "taxId",
      "billingEmail",
      "fiscalAddress",
      "fiscalCity",
      "fiscalProvince",
      "fiscalPostalCode",
      "invoiceNotes",
    ];

    for (const field of editableFields) {
      if (body[field] !== undefined) {
        updatePayload[field] = field === "taxId" ? String(body[field]).replace(/\D/g, "") : body[field];
      }
    }

    if (body.publicVisibility) {
      const current = await Clinic.findById(req.auth.id).select({ publicVisibility: 1 }).lean();
      if (!current) return fail(res, "Clínica no encontrada", 404);
      updatePayload.publicVisibility = {
        ...defaultPublicVisibility,
        ...(current.publicVisibility ?? {}),
        ...body.publicVisibility,
      };
    }

    const updated = await Clinic.findByIdAndUpdate(req.auth.id, updatePayload, { new: true }).lean();
    if (!updated) return fail(res, "Clínica no encontrada", 404);

    const profile = await buildClinicProfile(req.auth.id);
    if (!profile) return fail(res, "Clínica no encontrada", 404);
    return ok(res, profile);
  }

  const body = (res.locals.validated?.body ?? req.body) as any;
  const updatePayload: Record<string, unknown> = {};
  for (const field of ["firstName", "lastName", "phone", "whatsapp", "age"]) {
    if (body[field] !== undefined) updatePayload[field] = body[field];
  }

  const updated = await Patient.findByIdAndUpdate(req.auth.id, updatePayload, { new: true }).select({ passwordHash: 0 }).lean();
  if (!updated) return fail(res, "Paciente no encontrado", 404);

  return ok(res, {
    type: "patient",
    ...updated,
  });
}
