import { AppointmentEmailPayload } from "../../../models/EmailJob";
import { buildIcsForAppointment, createAppointmentEmailLayout } from "../templateUtils";
import { EmailTemplateResult } from "../types";

export function appointmentBookedTemplate(payload: AppointmentEmailPayload): EmailTemplateResult {
  const subject = `✅ Turno confirmado — ${payload.clinic.name}`;
  const ctas = [
    { label: "Ver mis turnos", url: payload.actions.myAppointmentsUrl },
    { label: "Reprogramar", url: payload.actions.rescheduleUrl },
    ...(payload.actions.cancelUrl ? [{ label: "Cancelar", url: payload.actions.cancelUrl }] : []),
  ];
  const base = createAppointmentEmailLayout({
    title: "Tu turno fue confirmado",
    intro: `Hola ${payload.patient.firstName ?? ""}, tu turno quedó confirmado con éxito.`,
    payload,
    ctas,
  });

  return { ...base, subject, ics: buildIcsForAppointment(payload) };
}
