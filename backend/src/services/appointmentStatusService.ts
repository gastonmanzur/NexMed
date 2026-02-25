import { Types } from "mongoose";
import { Appointment, AppointmentDocument, AppointmentStatus } from "../models/Appointment";

const CANCELLATION_ACTORS = new Set([
  "patient_cancel_endpoint",
  "clinic_cancel_endpoint",
  "patient_reschedule_endpoint",
  "dev_dedup_endpoint",
]);

function isDevEnvironment() {
  return process.env.NODE_ENV !== "production";
}

function logStatusTransition(params: {
  appointmentId: string;
  prevStatus: AppointmentStatus;
  newStatus: AppointmentStatus;
  reason?: string | undefined;
  actor?: string | undefined;
}) {
  if (!isDevEnvironment()) return;
  const stack = new Error().stack;
  console.info("[appointment-status-transition]", {
    appointmentId: params.appointmentId,
    prevStatus: params.prevStatus,
    newStatus: params.newStatus,
    reason: params.reason,
    actor: params.actor,
    stack,
  });
}

function assertAllowedTransition(params: {
  prevStatus: AppointmentStatus;
  newStatus: AppointmentStatus;
  actor?: string | undefined;
}) {
  const { prevStatus, newStatus, actor } = params;
  if (prevStatus === newStatus) return;

  const baseAllowed = new Set<AppointmentStatus>(["booked", "confirmed", "canceled"]);
  if (!baseAllowed.has(prevStatus) || !baseAllowed.has(newStatus)) {
    throw new Error(`Transición de estado no soportada: ${prevStatus} -> ${newStatus}`);
  }

  if (newStatus === "canceled") {
    if (!CANCELLATION_ACTORS.has(actor ?? "")) {
      throw new Error("No se permite cancelar turnos fuera de endpoints explícitos de cancelación");
    }
    if (!(prevStatus === "booked" || prevStatus === "confirmed")) {
      throw new Error(`No se permite cancelar turnos desde estado ${prevStatus}`);
    }
    return;
  }

  if (newStatus === "confirmed" && prevStatus === "booked") return;
  if (newStatus === "booked" && prevStatus === "confirmed") return;

  throw new Error(`Transición de estado no permitida: ${prevStatus} -> ${newStatus}`);
}

export async function updateAppointmentStatus(
  appointmentId: string | Types.ObjectId,
  status: AppointmentStatus,
  reason?: string,
  actor?: string
): Promise<AppointmentDocument> {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new Error("Turno no encontrado");
  }

  const prevStatus = appointment.status;
  assertAllowedTransition({ prevStatus, newStatus: status, actor });

  if (prevStatus !== status) {
    logStatusTransition({
      appointmentId: String(appointment._id),
      prevStatus,
      newStatus: status,
      reason,
      actor,
    });
  }

  appointment.status = status;
  await appointment.save();
  return appointment;
}
