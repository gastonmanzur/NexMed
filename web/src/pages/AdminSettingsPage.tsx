import { useEffect, useState } from "react";
import { createInvite, getBookingSettings, listInvites, updateBookingSettings, updateSettings } from "../api/clinic";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { useAuth } from "../hooks/useAuth";
import { ClinicBookingSettings, ClinicInvite, WeeklyDay } from "../types";

const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function AdminSettingsPage() {
  const { clinic, token, refreshProfile } = useAuth();
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(30);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyDay[]>([]);
  const [bookingSettings, setBookingSettings] = useState<ClinicBookingSettings>({
    requireClinicConfirmation: false,
    autoConfirmAppointments: true,
  });
  const [inviteLabel, setInviteLabel] = useState("");
  const [invites, setInvites] = useState<ClinicInvite[]>([]);
  const [newInviteUrl, setNewInviteUrl] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!clinic) return;
    setSlotDurationMinutes(clinic.settings.slotDurationMinutes);
    setWeeklySchedule(clinic.settings.weeklySchedule);
  }, [clinic]);

  useEffect(() => {
    if (!token) return;
    listInvites(token).then(setInvites).catch(() => setInvites([]));
    getBookingSettings(token).then(setBookingSettings).catch(() => null);
  }, [token]);

  const save = async () => {
    await updateSettings(token!, { slotDurationMinutes, weeklySchedule });
    await updateBookingSettings(token!, bookingSettings);
    await refreshProfile();
    setMsg("Configuración guardada");
  };

  const onCreateInvite = async () => {
    if (!token) return;
    const created = await createInvite(token, inviteLabel.trim() ? { label: inviteLabel.trim() } : {});
    setNewInviteUrl(created.url);
    setInviteLabel("");
    const rows = await listInvites(token);
    setInvites(rows);
  };

  return (
    <>
      <Card>
      <h3>Configuración de agenda</h3>
      <div className="form-row">
        <label>Duración de turno (minutos)</label>
        <Input type="number" value={slotDurationMinutes} onChange={(e) => setSlotDurationMinutes(Number(e.target.value))} />
      </div>
      {weeklySchedule.map((day, idx) => (
        <div key={day.dayOfWeek} className="form-row">
          <label>
            <input
              type="checkbox"
              checked={day.enabled}
              onChange={(e) => setWeeklySchedule((prev) => prev.map((p, i) => (i === idx ? { ...p, enabled: e.target.checked } : p)))}
            /> {dayNames[day.dayOfWeek]}
          </label>
          <div className="grid-2">
            <Input
              value={day.intervals[0]?.start ?? "09:00"}
              onChange={(e) => setWeeklySchedule((prev) => prev.map((p, i) => (i === idx ? { ...p, intervals: [{ start: e.target.value, end: p.intervals[0]?.end ?? "17:00" }] } : p)))}
            />
            <Input
              value={day.intervals[0]?.end ?? "17:00"}
              onChange={(e) => setWeeklySchedule((prev) => prev.map((p, i) => (i === idx ? { ...p, intervals: [{ start: p.intervals[0]?.start ?? "09:00", end: e.target.value }] } : p)))}
            />
          </div>
        </div>
      ))}

      <h3>Confirmación de turnos</h3>
      <div className="form-row">
        <label>
          <input
            type="checkbox"
            checked={bookingSettings.requireClinicConfirmation}
            onChange={(e) => setBookingSettings((prev) => ({ ...prev, requireClinicConfirmation: e.target.checked, autoConfirmAppointments: e.target.checked ? prev.autoConfirmAppointments : true }))}
          /> Los turnos quedarán pendientes hasta que los confirmes
        </label>
      </div>
      <div className="form-row">
        <label>
          <input
            type="checkbox"
            disabled={!bookingSettings.requireClinicConfirmation}
            checked={bookingSettings.autoConfirmAppointments}
            onChange={(e) => setBookingSettings((prev) => ({ ...prev, autoConfirmAppointments: e.target.checked }))}
          /> Confirmar automáticamente al reservar (sin intervención)
        </label>
      </div>
      <Button onClick={save}>Guardar</Button>
      {msg && <p className="success">{msg}</p>}
      </Card>
      <Card>
      <h3>Invitaciones por QR / link</h3>
      <div className="form-row">
        <Input placeholder="Etiqueta opcional (ej: recepción)" value={inviteLabel} onChange={(e) => setInviteLabel(e.target.value)} />
        <Button onClick={onCreateInvite}>Generar link</Button>
      </div>
      {newInviteUrl && (
        <p className="success">
          Link generado: <a href={newInviteUrl}>{newInviteUrl}</a>
        </p>
      )}
      {invites.map((invite) => (
        <div key={invite._id} className="form-row">
          <div>
            <b>{invite.label || "Sin etiqueta"}</b>
            <div>{new Date(invite.createdAt).toLocaleString("es-AR")}</div>
          </div>
          <code>{invite.token}</code>
        </div>
      ))}
      </Card>
    </>
  );
}
