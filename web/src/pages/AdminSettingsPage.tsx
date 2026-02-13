import { useEffect, useState } from "react";
import { updateSettings } from "../api/clinic";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { useAuth } from "../hooks/useAuth";
import { WeeklyDay } from "../types";

const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function AdminSettingsPage() {
  const { clinic, token, refreshProfile } = useAuth();
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(30);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyDay[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!clinic) return;
    setSlotDurationMinutes(clinic.settings.slotDurationMinutes);
    setWeeklySchedule(clinic.settings.weeklySchedule);
  }, [clinic]);

  const save = async () => {
    await updateSettings(token!, { slotDurationMinutes, weeklySchedule });
    await refreshProfile();
    setMsg("Configuración guardada");
  };

  return (
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
      <Button onClick={save}>Guardar</Button>
      {msg && <p className="success">{msg}</p>}
    </Card>
  );
}
