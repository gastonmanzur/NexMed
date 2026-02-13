import { Request, Response } from "express";
import { Appointment } from "../models/Appointment";
import { fail, ok } from "../utils/http";

function dateOnlyToUtcStart(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function listAppointments(req: Request, res: Response) {
  const clinicId = req.auth?.id;
  const from = dateOnlyToUtcStart(String(req.query.from));
  const to = dateOnlyToUtcStart(String(req.query.to));
  const q = String(req.query.q ?? "").trim();

  const filter: any = {
    clinicId,
    startAt: { $gte: from, $lt: to },
  };

  if (q) {
    filter.patientPhone = { $regex: q, $options: "i" };
  }

  const appointments = await Appointment.find(filter).sort({ startAt: 1 }).lean();
  return ok(res, appointments);
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
