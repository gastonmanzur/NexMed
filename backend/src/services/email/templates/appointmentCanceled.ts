import { AppointmentEmailPayload } from "../../../models/EmailJob";
import { createAppointmentEmailLayout } from "../templateUtils";
import { EmailTemplateResult } from "../types";

export function appointmentCanceledTemplate(payload: AppointmentEmailPayload): EmailTemplateResult {
  const subject = `❌ Turno cancelado — ${payload.clinic.name}`;
  const ctas = [
    { label: "Ver mis turnos", url: payload.actions.myAppointmentsUrl },
    { label: "Reprogramar", url: payload.actions.rescheduleUrl },
  ];
  const base = createAppointmentEmailLayout({
    title: "Tu turno fue cancelado",
    intro: `Hola ${payload.patient.firstName ?? ""}, este turno quedó cancelado.`,
    payload,
    ctas,
  });

  return { ...base, subject };
}
