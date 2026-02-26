import { AppointmentEmailPayload } from "../../../models/EmailJob";
import { buildIcsForAppointment, createAppointmentEmailLayout } from "../templateUtils";
import { EmailTemplateResult } from "../types";

export function appointmentBookedTemplate(payload: AppointmentEmailPayload): EmailTemplateResult {
  const isPending = payload.confirmationStatus === "pending";
  const subject = isPending
    ? `🕒 Solicitud de turno pendiente — ${payload.clinic.name}`
    : `✅ Turno confirmado — ${payload.clinic.name}`;
  const ctas = [
    { label: "Ver mis turnos", url: payload.actions.myAppointmentsUrl },
    { label: "Reprogramar", url: payload.actions.rescheduleUrl },
    ...(payload.actions.cancelUrl ? [{ label: "Cancelar", url: payload.actions.cancelUrl }] : []),
  ];
  const base = createAppointmentEmailLayout({
    title: isPending ? "Tu turno está pendiente" : "Tu turno fue confirmado",
    intro: isPending
      ? `Hola ${payload.patient.firstName ?? ""}, tu turno fue solicitado y está pendiente de confirmación por la clínica.`
      : `Hola ${payload.patient.firstName ?? ""}, tu turno está confirmado.`,
    payload,
    ctas,
  });

  return { ...base, subject, ics: buildIcsForAppointment(payload) };
}
