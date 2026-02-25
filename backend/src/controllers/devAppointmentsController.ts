import { Request, Response } from "express";
import { PipelineStage } from "mongoose";
import { Appointment } from "../models/Appointment";
import { updateAppointmentStatus } from "../services/appointmentStatusService";
import { fail, ok } from "../utils/http";
import { normalizeStartAt } from "../utils/slots";

function parseDate(value: unknown, fallback: Date) {
  if (!value) return fallback;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Fecha inválida: ${String(value)}`);
  }
  return parsed;
}

function duplicatePipeline(from: Date, to: Date): PipelineStage[] {
  return [
    {
      $match: {
        status: { $in: ["booked"] },
        startAt: { $gte: from, $lt: to },
        professionalId: { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: {
          clinicId: "$clinicId",
          professionalId: "$professionalId",
          startAt: "$startAt",
        },
        count: { $sum: 1 },
        appointments: {
          $push: {
            _id: "$_id",
            status: "$status",
            createdAt: "$createdAt",
          },
        },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { "_id.startAt": 1 } },
  ];
}

export async function listDuplicateAppointments(req: Request, res: Response) {
  try {
    const from = parseDate(req.query.from, new Date("2020-01-01T00:00:00.000Z"));
    const to = parseDate(req.query.to, new Date("2100-01-01T00:00:00.000Z"));
    const rows = await Appointment.aggregate(duplicatePipeline(from, to));

    return ok(res, {
      range: { from: from.toISOString(), to: to.toISOString() },
      groups: rows.map((row) => ({
        clinicId: String(row._id.clinicId),
        professionalId: String(row._id.professionalId),
        startAt: normalizeStartAt(new Date(row._id.startAt)).toISOString(),
        count: row.count,
        appointments: row.appointments,
      })),
    });
  } catch (error: any) {
    return fail(res, error?.message ?? "No se pudieron listar duplicados", 400);
  }
}

export async function dedupAppointments(req: Request, res: Response) {
  const from = parseDate(req.body?.from, new Date("2020-01-01T00:00:00.000Z"));
  const to = parseDate(req.body?.to, new Date("2100-01-01T00:00:00.000Z"));
  const groups = await Appointment.aggregate(duplicatePipeline(from, to));

  let groupsProcessed = 0;
  let cancelledCount = 0;

  for (const group of groups) {
    const appointments = [...group.appointments].sort(
      (a: { createdAt: string }, b: { createdAt: string }) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const [, ...duplicates] = appointments;
    if (!duplicates.length) continue;

    const duplicateIds = duplicates.map((item: { _id: string }) => item._id);

    for (const duplicateId of duplicateIds) {
      await updateAppointmentStatus(duplicateId, "canceled", "dev_dedup", "dev_dedup_endpoint");
      cancelledCount += 1;
    }

    groupsProcessed += 1;
  }

  return ok(res, {
    range: { from: from.toISOString(), to: to.toISOString() },
    groupsFound: groups.length,
    groupsProcessed,
    cancelledCount,
  });
}
