import { Request, Response } from "express";
import { Types } from "mongoose";
import { Clinic } from "../models/Clinic";
import { Professional } from "../models/Professional";
import { ProfessionalAvailability } from "../models/ProfessionalAvailability";
import { ProfessionalTimeOff } from "../models/ProfessionalTimeOff";
import { Specialty } from "../models/Specialty";
import { fail, ok } from "../utils/http";

function normalizeName(name: string) {
  return name.trim().toLocaleLowerCase();
}

async function getProfessionalForClinic(clinicId: string, id: string) {
  return Professional.findOne({ _id: id, clinicId }).lean();
}

export async function listSpecialties(req: Request, res: Response) {
  const clinicId = req.auth!.id;
  const rows = await Specialty.find({ clinicId }).sort({ name: 1 }).lean();
  return ok(res, rows);
}

export async function createSpecialty(req: Request, res: Response) {
  const body = (res.locals.validated?.body ?? req.body) as { name: string; description?: string };
  const clinicId = req.auth!.id;
  const name = body.name.trim();

  try {
    const row = await Specialty.create({
      clinicId,
      name,
      normalizedName: normalizeName(name),
      description: body.description?.trim() || "",
      isActive: true,
    });
    return ok(res, row, 201);
  } catch (err: any) {
    if (err?.code === 11000) return fail(res, "La especialidad ya existe", 409);
    throw err;
  }
}

export async function updateSpecialty(req: Request, res: Response) {
  const params = (res.locals.validated?.params ?? req.params) as { id: string };
  const body = (res.locals.validated?.body ?? req.body) as { name?: string; description?: string; isActive?: boolean };
  const clinicId = req.auth!.id;
  const id = String(params.id);

  const update: any = {};
  if (typeof body.name === "string") {
    const name = body.name.trim();
    update.name = name;
    update.normalizedName = normalizeName(name);
  }
  if (typeof body.description === "string") update.description = body.description.trim();
  if (typeof body.isActive === "boolean") update.isActive = body.isActive;

  try {
    const row = await Specialty.findOneAndUpdate({ _id: id, clinicId }, update, { new: true }).lean();
    if (!row) return fail(res, "Especialidad no encontrada", 404);
    return ok(res, row);
  } catch (err: any) {
    if (err?.code === 11000) return fail(res, "La especialidad ya existe", 409);
    throw err;
  }
}

export async function deleteSpecialty(req: Request, res: Response) {
  const params = (res.locals.validated?.params ?? req.params) as { id: string };
  const clinicId = req.auth!.id;
  const id = String(params.id);

  const row = await Specialty.findOneAndUpdate({ _id: id, clinicId }, { isActive: false }, { new: true }).lean();
  if (!row) return fail(res, "Especialidad no encontrada", 404);
  return ok(res, row);
}

export async function listProfessionals(req: Request, res: Response) {
  const clinicId = req.auth!.id;
  const rows = await Professional.find({ clinicId }).sort({ firstName: 1, lastName: 1 }).lean();
  return ok(res, rows);
}

async function validateSpecialties(clinicId: string, specialtyIds: string[]) {
  const uniqueIds = [...new Set(specialtyIds)];
  if (uniqueIds.length === 0) return [];
  const rows = await Specialty.find({ clinicId, _id: { $in: uniqueIds }, isActive: true }).select({ _id: 1 }).lean();
  if (rows.length !== uniqueIds.length) {
    throw new Error("Especialidades inválidas");
  }
  return uniqueIds.map((id) => new Types.ObjectId(id));
}

export async function createProfessional(req: Request, res: Response) {
  const body = (res.locals.validated?.body ?? req.body) as {
    specialtyIds: string[];
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    isActive?: boolean;
  };
  const clinicId = req.auth!.id;

  let specialtyObjectIds: Types.ObjectId[] = [];
  try {
    specialtyObjectIds = await validateSpecialties(clinicId, body.specialtyIds);
  } catch {
    return fail(res, "Especialidades inválidas", 400);
  }

  const firstName = body.firstName.trim();
  const lastName = body.lastName.trim();
  const row = await Professional.create({
    clinicId,
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`.trim(),
    email: body.email?.trim() || "",
    phone: body.phone?.trim() || "",
    specialtyIds: specialtyObjectIds,
    isActive: body.isActive ?? true,
  });

  return ok(res, row, 201);
}

export async function updateProfessional(req: Request, res: Response) {
  const params = (res.locals.validated?.params ?? req.params) as { id: string };
  const body = (res.locals.validated?.body ?? req.body) as {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    isActive?: boolean;
    specialtyIds?: string[];
  };
  const clinicId = req.auth!.id;
  const id = String(params.id);

  const update: any = {};
  if (typeof body.firstName === "string") update.firstName = body.firstName.trim();
  if (typeof body.lastName === "string") update.lastName = body.lastName.trim();
  if (typeof body.email === "string") update.email = body.email.trim();
  if (typeof body.phone === "string") update.phone = body.phone.trim();
  if (typeof body.isActive === "boolean") update.isActive = body.isActive;

  if (Array.isArray(body.specialtyIds)) {
    try {
      update.specialtyIds = await validateSpecialties(clinicId, body.specialtyIds);
    } catch {
      return fail(res, "Especialidades inválidas", 400);
    }
  }

  const previous = await Professional.findOne({ _id: id, clinicId }).lean();
  if (!previous) return fail(res, "Profesional no encontrado", 404);

  const nextFirst = update.firstName ?? previous.firstName;
  const nextLast = update.lastName ?? previous.lastName;
  update.displayName = `${nextFirst} ${nextLast}`.trim();

  const row = await Professional.findOneAndUpdate({ _id: id, clinicId }, update, { new: true }).lean();
  return ok(res, row);
}

export async function deleteProfessional(req: Request, res: Response) {
  const params = (res.locals.validated?.params ?? req.params) as { id: string };
  const clinicId = req.auth!.id;
  const id = String(params.id);

  const row = await Professional.findOneAndUpdate({ _id: id, clinicId }, { isActive: false }, { new: true }).lean();
  if (!row) return fail(res, "Profesional no encontrado", 404);
  return ok(res, row);
}

export async function getProfessionalAvailability(req: Request, res: Response) {
  const params = (res.locals.validated?.params ?? req.params) as { id: string };
  const clinicId = req.auth!.id;
  const professionalId = String(params.id);

  const professional = await getProfessionalForClinic(clinicId, professionalId);
  if (!professional) return fail(res, "Profesional no encontrado", 404);

  const weeklyBlocks = await ProfessionalAvailability.find({ clinicId, professionalId, isActive: true })
    .sort({ weekday: 1, startTime: 1 })
    .lean();
  const timeoff = await ProfessionalTimeOff.find({ clinicId, professionalId }).sort({ date: 1, startTime: 1 }).lean();

  return ok(res, { weeklyBlocks, slotMinutes: weeklyBlocks[0]?.slotMinutes, timeoff });
}

export async function putProfessionalAvailability(req: Request, res: Response) {
  const params = (res.locals.validated?.params ?? req.params) as { id: string };
  const body = (res.locals.validated?.body ?? req.body) as {
    slotMinutes?: number;
    weeklyBlocks: Array<{ weekday: number; startTime: string; endTime: string }>;
  };
  const clinicId = req.auth!.id;
  const professionalId = String(params.id);

  const professional = await getProfessionalForClinic(clinicId, professionalId);
  if (!professional) return fail(res, "Profesional no encontrado", 404);

  const clinic = await Clinic.findById(clinicId).lean();
  const slotMinutes = body.slotMinutes ?? clinic?.settings.slotDurationMinutes ?? 30;

  await ProfessionalAvailability.deleteMany({ clinicId, professionalId });

  if (body.weeklyBlocks.length > 0) {
    await ProfessionalAvailability.insertMany(
      body.weeklyBlocks.map((b) => ({
        clinicId,
        professionalId,
        weekday: b.weekday,
        startTime: b.startTime,
        endTime: b.endTime,
        slotMinutes,
        isActive: true,
      }))
    );
  }

  const weeklyBlocks = await ProfessionalAvailability.find({ clinicId, professionalId, isActive: true })
    .sort({ weekday: 1, startTime: 1 })
    .lean();

  return ok(res, { weeklyBlocks, slotMinutes });
}

export async function listProfessionalTimeOff(req: Request, res: Response) {
  const params = (res.locals.validated?.params ?? req.params) as { id: string };
  const clinicId = req.auth!.id;
  const professionalId = String(params.id);

  const professional = await getProfessionalForClinic(clinicId, professionalId);
  if (!professional) return fail(res, "Profesional no encontrado", 404);

  const rows = await ProfessionalTimeOff.find({ clinicId, professionalId }).sort({ date: 1, startTime: 1 }).lean();
  return ok(res, rows);
}

export async function createProfessionalTimeOff(req: Request, res: Response) {
  const params = (res.locals.validated?.params ?? req.params) as { id: string };
  const body = (res.locals.validated?.body ?? req.body) as {
    date: string;
    startTime: string;
    endTime: string;
    reason?: string;
  };
  const clinicId = req.auth!.id;
  const professionalId = String(params.id);

  const professional = await getProfessionalForClinic(clinicId, professionalId);
  if (!professional) return fail(res, "Profesional no encontrado", 404);

  const row = await ProfessionalTimeOff.create({
    clinicId,
    professionalId,
    date: body.date,
    startTime: body.startTime,
    endTime: body.endTime,
    reason: body.reason?.trim() || "",
  });

  return ok(res, row, 201);
}

export async function deleteProfessionalTimeOff(req: Request, res: Response) {
  const params = (res.locals.validated?.params ?? req.params) as { id: string; timeoffId: string };
  const clinicId = req.auth!.id;
  const professionalId = String(params.id);
  const timeoffId = String(params.timeoffId);

  const professional = await getProfessionalForClinic(clinicId, professionalId);
  if (!professional) return fail(res, "Profesional no encontrado", 404);

  const row = await ProfessionalTimeOff.findOneAndDelete({ _id: timeoffId, clinicId, professionalId }).lean();
  if (!row) return fail(res, "Bloqueo no encontrado", 404);

  return ok(res, row);
}
