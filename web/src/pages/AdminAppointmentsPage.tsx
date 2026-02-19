import { useEffect, useMemo, useState } from "react";
import { cancelAppointment, listAppointments } from "../api/appointments";
import { listProfessionals, listSpecialties } from "../api/clinic";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/Page";
import { Select } from "../components/ui/Select";
import { Skeleton } from "../components/ui/Skeleton";
import { Table } from "../components/ui/Table";
import { useAuth } from "../hooks/useAuth";
import { Appointment, Professional, Specialty } from "../types";
import { fmtDate, humanDate } from "./helpers";

export function AdminAppointmentsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [q, setQ] = useState("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState(fmtDate(new Date()));
  const [to, setTo] = useState(() => {
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 14);
    return fmtDate(toDate);
  });
  const [loading, setLoading] = useState(true);

  const specialtiesById = useMemo(() => new Map(specialties.map((s) => [s._id, s.name])), [specialties]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listAppointments(token!, from, to, q, selectedProfessionalId || undefined);
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => setItems([]));
    listProfessionals(token!).then((data) => setProfessionals(data.filter((item) => item.isActive))).catch(() => setProfessionals([]));
    listSpecialties(token!).then(setSpecialties).catch(() => setSpecialties([]));
  }, []);

  const visibleItems = status === "all" ? items : items.filter((item) => item.status === status);

  return (
    <>
      <PageHeader title="Turnos" subtitle="Gestión de turnos y estado de atención" />

      <Card className="ui-form-row">
        <div className="ui-grid-4">
          <div>
            <label className="ui-label" htmlFor="from">Desde</label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="ui-label" htmlFor="to">Hasta</label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className="ui-label" htmlFor="professional">Profesional</label>
            <Select id="professional" value={selectedProfessionalId} onChange={(e) => setSelectedProfessionalId(e.target.value)}>
              <option value="">Todos los profesionales</option>
              {professionals.map((professional) => (
                <option key={professional._id} value={professional._id}>{professional.displayName || `${professional.firstName} ${professional.lastName}`.trim()}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="ui-label" htmlFor="status">Estado</label>
            <Select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">Todos</option>
              <option value="confirmed">Confirmado</option>
              <option value="cancelled">Cancelado</option>
            </Select>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.55rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
          <Input placeholder="Buscar por teléfono o nombre" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button onClick={load}>Aplicar filtros</Button>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div style={{ display: "grid", gap: "0.6rem" }}>
            <Skeleton height="1.4rem" />
            <Skeleton height="1.4rem" />
            <Skeleton height="1.4rem" />
          </div>
        ) : visibleItems.length === 0 ? (
          <EmptyState title="No hay turnos para los filtros seleccionados" description="Probá ajustar el rango de fechas o el profesional." />
        ) : (
          <Table>
            <thead><tr><th>Fecha/hora</th><th>Paciente</th><th>Profesional</th><th>Especialidad</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {visibleItems.map((a) => (
                <tr key={a._id}>
                  <td>{humanDate(a.startAt)}</td>
                  <td>{a.patientFullName}<br /><span style={{ color: "#6b7280" }}>{a.patientPhone}</span></td>
                  <td>{a.professionalName ?? "—"}</td>
                  <td>{(a.specialtyId && specialtiesById.get(a.specialtyId)) || "—"}</td>
                  <td><Badge variant={a.status === "confirmed" ? "success" : "muted"}>{a.status === "confirmed" ? "Confirmado" : "Cancelado"}</Badge></td>
                  <td>{a.status === "confirmed" && <Button variant="secondary" onClick={async () => { await cancelAppointment(token!, a._id); load(); }}>Cancelar</Button>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
