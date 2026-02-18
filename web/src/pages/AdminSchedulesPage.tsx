import { useEffect, useMemo, useState } from "react";
import {
  createProfessionalTimeOff,
  deleteProfessionalTimeOff,
  getProfessionalAvailability,
  listProfessionals,
  putProfessionalAvailability,
} from "../api/clinic";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { useAuth } from "../hooks/useAuth";
import { Professional, ProfessionalAvailabilityBlock, ProfessionalTimeOff } from "../types";

const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function AdminSchedulesPage() {
  const { token } = useAuth();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [professionalId, setProfessionalId] = useState("");
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [weeklyBlocks, setWeeklyBlocks] = useState<ProfessionalAvailabilityBlock[]>([]);
  const [timeoff, setTimeoff] = useState<ProfessionalTimeOff[]>([]);
  const [newTimeoff, setNewTimeoff] = useState({ date: "", startTime: "", endTime: "", reason: "" });

  const grouped = useMemo(() => {
    return dayNames.map((_, weekday) => ({
      weekday,
      blocks: weeklyBlocks.filter((b) => b.weekday === weekday),
    }));
  }, [weeklyBlocks]);

  const loadProfessionals = async () => {
    if (!token) return;
    const rows = await listProfessionals(token);
    setProfessionals(rows);
    if (!professionalId && rows[0]?._id) setProfessionalId(rows[0]._id);
  };

  const loadAvailability = async (id: string) => {
    if (!token || !id) return;
    const data = await getProfessionalAvailability(token, id);
    setWeeklyBlocks(data.weeklyBlocks || []);
    setSlotMinutes(data.slotMinutes || 30);
    setTimeoff(data.timeoff || []);
  };

  useEffect(() => {
    loadProfessionals();
  }, [token]);

  useEffect(() => {
    if (professionalId) loadAvailability(professionalId);
  }, [professionalId]);

  return (
    <>
      <Card>
        <h3>Horarios por profesional</h3>
        <select className="input" value={professionalId} onChange={(e) => setProfessionalId(e.target.value)}>
          {professionals.map((p) => (
            <option key={p._id} value={p._id}>{p.displayName || `${p.firstName} ${p.lastName}`}</option>
          ))}
        </select>
        <div className="form-row" style={{ marginTop: 8 }}>
          <label>Duración de turno</label>
          <Input type="number" value={slotMinutes} onChange={(e) => setSlotMinutes(Number(e.target.value))} />
        </div>
        {grouped.map((day) => (
          <div key={day.weekday} className="form-row">
            <b>{dayNames[day.weekday]}</b>
            {day.blocks.map((b, idx) => (
              <div className="grid-2" key={`${b.weekday}-${idx}`}>
                <Input
                  value={b.startTime}
                  onChange={(e) =>
                    setWeeklyBlocks((prev) => prev.map((row) => (row === b ? { ...row, startTime: e.target.value } : row)))
                  }
                />
                <Input
                  value={b.endTime}
                  onChange={(e) =>
                    setWeeklyBlocks((prev) => prev.map((row) => (row === b ? { ...row, endTime: e.target.value } : row)))
                  }
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setWeeklyBlocks((prev) => [...prev, { _id: `new-${Math.random()}`, professionalId, weekday: day.weekday, startTime: "09:00", endTime: "17:00", slotMinutes, isActive: true }])
              }
            >
              + Agregar bloque
            </button>
          </div>
        ))}
        <Button
          onClick={async () => {
            if (!token || !professionalId) return;
            await putProfessionalAvailability(token, professionalId, {
              slotMinutes,
              weeklyBlocks: weeklyBlocks.map((b) => ({ weekday: b.weekday, startTime: b.startTime, endTime: b.endTime })),
            });
            await loadAvailability(professionalId);
          }}
        >
          Guardar horarios
        </Button>
      </Card>

      <Card>
        <h3>Excepciones / tiempo fuera</h3>
        <div className="grid-2">
          <Input type="date" value={newTimeoff.date} onChange={(e) => setNewTimeoff((p) => ({ ...p, date: e.target.value }))} />
          <Input placeholder="Motivo (opcional)" value={newTimeoff.reason} onChange={(e) => setNewTimeoff((p) => ({ ...p, reason: e.target.value }))} />
          <Input placeholder="Inicio (HH:mm opcional)" value={newTimeoff.startTime} onChange={(e) => setNewTimeoff((p) => ({ ...p, startTime: e.target.value }))} />
          <Input placeholder="Fin (HH:mm opcional)" value={newTimeoff.endTime} onChange={(e) => setNewTimeoff((p) => ({ ...p, endTime: e.target.value }))} />
        </div>
        <Button
          onClick={async () => {
            if (!token || !professionalId || !newTimeoff.date) return;
            await createProfessionalTimeOff(token, professionalId, {
              date: newTimeoff.date,
              startTime: newTimeoff.startTime || undefined,
              endTime: newTimeoff.endTime || undefined,
              reason: newTimeoff.reason || undefined,
            });
            setNewTimeoff({ date: "", startTime: "", endTime: "", reason: "" });
            await loadAvailability(professionalId);
          }}
        >Agregar excepción</Button>

        {timeoff.map((row) => (
          <div key={row._id} className="form-row">
            <span>
              {row.date} {row.startTime && row.endTime ? `${row.startTime}-${row.endTime}` : "(día completo)"} {row.reason ? `· ${row.reason}` : ""}
            </span>
            <button
              onClick={async () => {
                if (!token || !professionalId) return;
                await deleteProfessionalTimeOff(token, professionalId, row._id);
                await loadAvailability(professionalId);
              }}
            >
              Eliminar
            </button>
          </div>
        ))}
      </Card>
    </>
  );
}
