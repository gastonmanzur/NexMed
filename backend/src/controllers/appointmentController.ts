import { Request, Response } from "express";
import { Appointment } from "../models/Appointment";
import { Types } from "mongoose";
import { Professional } from "../models/Professional";
import { fail, ok } from "../utils/http";

function dateOnlyToUtcStart(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function listAppointments(req: Request, res: Response) {
  const clinicId = req.auth?.id;
  if (!clinicId) return fail(res, "No autorizado", 401);

  const query = (res.locals.validated?.query ?? req.query) as {
    from: string;
    to: string;
    q?: string;
    professionalId?: string;
  };
  const from = dateOnlyToUtcStart(String(query.from));
  const to = dateOnlyToUtcStart(String(query.to));
  const q = String(query.q ?? "").trim();
  const professionalId = query.professionalId ? String(query.professionalId) : "";

  const filter: any = {
    clinicId,
    startAt: { $gte: from, $lt: to },
  };

  if (q) {
    filter.patientPhone = { $regex: q, $options: "i" };
  }

  if (professionalId && Types.ObjectId.isValid(professionalId)) {
    filter.professionalId = professionalId;
  }

  const appointments = await Appointment.find(filter)
    .select("startAt endAt patientFullName patientPhone note status professionalId specialtyId clinicId clinicSlug")
    .sort({ startAt: 1 })
    .lean();

  const professionalIds = [
    ...new Set(
      appointments
        .map((appointment) => appointment.professionalId)
        .filter((id): id is Types.ObjectId => Boolean(id))
        .map((id) => id.toString())
    ),
  ];

  const professionals = professionalIds.length
    ? await Professional.find({ _id: { $in: professionalIds }, clinicId: new Types.ObjectId(clinicId) })
        .select("firstName lastName displayName")
        .lean()
    : [];

  const professionalNameById = new Map(
    professionals.map((professional) => {
      const fullName = `${professional.firstName ?? ""} ${professional.lastName ?? ""}`.trim();
      return [String(professional._id), professional.displayName || fullName || null] as const;
    })
  );

  const mappedAppointments = appointments.map((appointment) => {
    const professionalId = appointment.professionalId ? String(appointment.professionalId) : null;

    return {
      ...appointment,
      professionalId,
      professionalName: professionalId ? professionalNameById.get(professionalId) ?? null : null,
    };
  });

  return ok(res, mappedAppointments);
}

export async function cancelAppointment(req: Request, res: Response) {
  const clinicId = req.auth?.id;

  const appointment = await Appointment.findOneAndUpdate(
    { _id: req.params.id, clinicId } as any,
    { status: "cancelled" },
    { new: true }
  ).lean();

  if (!appointment) return fail(res, "Turno no encontrado", 404);
  return ok(res, appointment);
}
