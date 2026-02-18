import { Request, Response } from "express";
import { ClinicInvite } from "../models/ClinicInvite";
import { PatientClinic } from "../models/PatientClinic";
import { fail, ok } from "../utils/http";
import { upsertPatientClinicLink } from "../services/patientClinicService";

export async function joinClinic(req: Request, res: Response) {
  const body = (res.locals.validated?.body ?? req.body) as { token: string };
  const patientId = req.auth?.id;
  if (!patientId) return fail(res, "No autorizado", 401);

  const invite = await ClinicInvite.findOne({ token: body.token, active: true }).populate("clinicId").lean();
  if (!invite) return fail(res, "Invitación inválida o inactiva", 404);

  const clinic = invite.clinicId as any;
  if (!clinic?._id) return fail(res, "Clínica no encontrada", 404);

  await upsertPatientClinicLink({
    patientId,
    clinicId: clinic._id,
    source: "invite",
  });

  return ok(res, {
    _id: clinic._id,
    name: clinic.name,
    slug: clinic.slug,
    phone: clinic.phone,
    address: clinic.address,
    city: clinic.city,
  });
}

export async function listMyClinics(req: Request, res: Response) {
  const patientId = req.auth?.id;
  if (!patientId) return fail(res, "No autorizado", 401);

  const rows = await PatientClinic.find({ patientId })
    .sort({ lastSeenAt: -1 })
    .populate("clinicId")
    .lean();

  const clinics = rows
    .filter((row) => Boolean(row.clinicId))
    .map((row) => {
      const clinic = row.clinicId as any;
      return {
        _id: clinic._id,
        name: clinic.name,
        slug: clinic.slug,
        phone: clinic.phone,
        address: clinic.address,
        city: clinic.city,
        source: row.source,
        createdAt: row.createdAt,
        lastSeenAt: row.lastSeenAt,
      };
    });

  return ok(res, clinics);
}
