import { useEffect, useMemo, useState } from "react";
import { createProfessionalTimeOff, deleteProfessionalTimeOff, getProfessionalAvailability, listProfessionals, putProfessionalAvailability } from "../api/clinic";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Icon } from "../components/ui/Icon";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/Page";
import { Select } from "../components/ui/Select";
import { Skeleton } from "../components/ui/Skeleton";
import { useAuth } from "../hooks/useAuth";
import { Professional, ProfessionalAvailabilityBlock, ProfessionalTimeOff } from "../types";

const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function AdminSchedulesPage() {
  const { token } = useAuth();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [professionalId, setProfessionalId] = useState("");
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [weeklyBlocks, setWeeklyBlocks] = useState<ProfessionalAvailabilityBlock[]>([]);
  const [timeoff, setTimeoff] = useState<ProfessionalTimeOff[]>([]);
  const [newTimeoff, setNewTimeoff] = useState({ date: "", startTime: "", endTime: "", reason: "" });
  const [loading, setLoading] = useState(true);

  const grouped = useMemo(() => dayNames.map((_, weekday) => ({ weekday, blocks: weeklyBlocks.filter((b) => b.weekday === weekday) })), [weeklyBlocks]);
  const selectedProfessional = professionals.find((item) => item._id === professionalId);

  const loadProfessionals = async () => {
    if (!token) return;
    setLoading(true);
    const rows = await listProfessionals(token);
    setProfessionals(rows);
    if (!professionalId && rows[0]?._id) setProfessionalId(rows[0]._id);
    setLoading(false);
  };

  const loadAvailability = async (id: string) => {
    if (!token || !id) return;
    const data = await getProfessionalAvailability(token, id);
    setWeeklyBlocks(data.weeklyBlocks || []);
    setSlotMinutes(data.slotMinutes || 30);
    setTimeoff(data.timeoff || []);
  };

  useEffect(() => { loadProfessionals(); }, [token]);
  useEffect(() => { if (professionalId) loadAvailability(professionalId); }, [professionalId]);

  return (
    <>
      <PageHeader title="Horarios" subtitle="Configurá disponibilidad semanal y excepciones" />

      {loading ? (
        <div className="ui-grid-2"><Skeleton variant="card" /><Skeleton variant="card" /></div>
      ) : professionals.length === 0 ? (
        <Card><EmptyState title="No hay profesionales para configurar" description="Creá un profesional para empezar a cargar horarios." /></Card>
      ) : (
        <div className="ui-grid-2" style={{ alignItems: "flex-start" }}>
          <div style={{ display: "grid", gap: "0.9rem" }}>
            <Card>
              <label className="ui-label" htmlFor="professional-selector">Profesional</label>
              <div className="ui-input-with-icon"><span className="ui-input-leading-icon"><Icon name="users" size={16} /></span><Select id="professional-selector" value={professionalId} onChange={(e) => setProfessionalId(e.target.value)}>{professionals.map((p) => <option key={p._id} value={p._id}>{p.displayName || `${p.firstName} ${p.lastName}`}</option>)}</Select></div>
            </Card>

            <Card>
              <h3 style={{ marginBottom: "0.4rem" }}>Resumen</h3>
              <p style={{ margin: 0, color: "#6b7280" }}>{selectedProfessional?.email || "Sin email"}</p>
              <p style={{ margin: "0.25rem 0 0", color: "#6b7280" }}>{selectedProfessional?.phone || "Sin teléfono"}</p>
              <div style={{ marginTop: "0.7rem" }}><label className="ui-label" htmlFor="slot-minutes">Duración de turno (minutos)</label><Input id="slot-minutes" type="number" min={5} value={slotMinutes} onChange={(e) => setSlotMinutes(Number(e.target.value) || 30)} /></div>
            </Card>
          </div>

          <div style={{ display: "grid", gap: "0.9rem" }}>
            <Card>
              <h3>Editor semanal</h3>
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {grouped.map((day) => {
                  const active = day.blocks.length > 0;
                  return (
                    <div key={day.weekday} className="ui-list-item">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.55rem" }}>
                        <strong style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}><Icon name="clock" size={16} />{dayNames[day.weekday]}</strong>
                        <Button variant="secondary" onClick={() => {
                          if (active) setWeeklyBlocks((prev) => prev.filter((b) => b.weekday !== day.weekday));
                          else setWeeklyBlocks((prev) => [...prev, { _id: `new-${Math.random()}`, professionalId, weekday: day.weekday, startTime: "09:00", endTime: "17:00", slotMinutes, isActive: true }]);
                        }}><Icon name="ban" />{active ? "Desactivar" : "Activar"}</Button>
                      </div>
                      {day.blocks.map((b, idx) => (
                        <div key={`${b.weekday}-${idx}`} className="ui-grid-2" style={{ marginBottom: "0.4rem" }}>
                          <Input type="time" value={b.startTime} onChange={(e) => setWeeklyBlocks((prev) => prev.map((row) => (row === b ? { ...row, startTime: e.target.value } : row)))} />
                          <div style={{ display: "flex", gap: "0.4rem" }}>
                            <Input type="time" value={b.endTime} onChange={(e) => setWeeklyBlocks((prev) => prev.map((row) => (row === b ? { ...row, endTime: e.target.value } : row)))} />
                            <Button variant="danger" title="Quitar bloque" aria-label="Quitar bloque" onClick={() => setWeeklyBlocks((prev) => prev.filter((row) => row !== b))}><Icon name="x" size={16} /></Button>
                          </div>
                        </div>
                      ))}
                      {active && <Button variant="secondary" onClick={() => setWeeklyBlocks((prev) => [...prev, { _id: `new-${Math.random()}`, professionalId, weekday: day.weekday, startTime: "09:00", endTime: "17:00", slotMinutes, isActive: true }])}><Icon name="plus" />Agregar bloque</Button>}
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: "0.8rem" }}><Button onClick={async () => {
                if (!token || !professionalId) return;
                await putProfessionalAvailability(token, professionalId, { slotMinutes, weeklyBlocks: weeklyBlocks.map((b) => ({ weekday: b.weekday, startTime: b.startTime, endTime: b.endTime })) });
                await loadAvailability(professionalId);
              }}><Icon name="save" />Guardar horarios</Button></div>
            </Card>

            <Card>
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><Icon name="calendar-x" />Tiempo fuera / excepciones</h3>
              <div className="ui-grid-2">
                <div><label className="ui-label">Fecha</label><Input type="date" value={newTimeoff.date} onChange={(e) => setNewTimeoff((p) => ({ ...p, date: e.target.value }))} /></div>
                <div><label className="ui-label">Motivo</label><Input value={newTimeoff.reason} onChange={(e) => setNewTimeoff((p) => ({ ...p, reason: e.target.value }))} /></div>
                <div><label className="ui-label">Inicio</label><Input type="time" value={newTimeoff.startTime} onChange={(e) => setNewTimeoff((p) => ({ ...p, startTime: e.target.value }))} /></div>
                <div><label className="ui-label">Fin</label><Input type="time" value={newTimeoff.endTime} onChange={(e) => setNewTimeoff((p) => ({ ...p, endTime: e.target.value }))} /></div>
              </div>
              <Button style={{ marginTop: "0.7rem" }} onClick={async () => {
                if (!token || !professionalId || !newTimeoff.date) return;
                await createProfessionalTimeOff(token, professionalId, { date: newTimeoff.date, startTime: newTimeoff.startTime || undefined, endTime: newTimeoff.endTime || undefined, reason: newTimeoff.reason || undefined });
                setNewTimeoff({ date: "", startTime: "", endTime: "", reason: "" });
                await loadAvailability(professionalId);
              }}><Icon name="plus" />Agregar excepción</Button>

              <div style={{ marginTop: "0.8rem", display: "grid", gap: "0.45rem" }}>
                {timeoff.map((row) => (
                  <div key={row._id} className="ui-list-item" style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                    <span>{row.date} {row.startTime && row.endTime ? `${row.startTime}-${row.endTime}` : "(día completo)"} {row.reason ? `· ${row.reason}` : ""}</span>
                    <Button variant="danger" title="Eliminar excepción" aria-label="Eliminar excepción" onClick={async () => {
                      if (!token || !professionalId) return;
                      await deleteProfessionalTimeOff(token, professionalId, row._id);
                      await loadAvailability(professionalId);
                    }}><Icon name="trash" size={16} /></Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
