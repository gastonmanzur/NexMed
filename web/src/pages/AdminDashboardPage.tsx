import { useEffect, useMemo, useState } from "react";
import { listAppointments } from "../api/appointments";
import { listProfessionals, listSpecialties } from "../api/clinic";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Icon } from "../components/ui/Icon";
import { PageHeader } from "../components/ui/Page";
import { Skeleton } from "../components/ui/Skeleton";
import { useAuth } from "../hooks/useAuth";
import { Appointment } from "../types";
import { fmtDate } from "./helpers";

export function AdminDashboardPage() {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionalCount, setProfessionalCount] = useState(0);
  const [specialtyCount, setSpecialtyCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    const end = new Date(now);
    end.setDate(end.getDate() + 8);

    setLoading(true);
    Promise.all([
      listAppointments(token!, fmtDate(start), fmtDate(end)).then(setAppointments).catch(() => setAppointments([])),
      listProfessionals(token!).then((rows) => setProfessionalCount(rows.filter((p) => p.isActive).length)).catch(() => setProfessionalCount(0)),
      listSpecialties(token!).then((rows) => setSpecialtyCount(rows.filter((s) => s.isActive).length)).catch(() => setSpecialtyCount(0)),
    ]).finally(() => setLoading(false));
  }, [token]);

  const today = fmtDate(new Date());
  const todayCount = useMemo(() => appointments.filter((a) => a.startAt.slice(0, 10) === today && a.status === "confirmed").length, [appointments, today]);
  const weekCount = useMemo(() => appointments.filter((a) => a.status === "confirmed").length, [appointments]);

  const statCards = [
    { label: "Turnos de hoy", value: todayCount, hint: "Confirmados para hoy", icon: "calendar-check" as const },
    { label: "Próximos 7 días", value: weekCount, hint: "Agenda activa semanal", icon: "calendar-days" as const },
    { label: "Profesionales activos", value: professionalCount, hint: "Equipo disponible", icon: "users" as const },
    { label: "Especialidades", value: specialtyCount, hint: "Oferta médica actual", icon: "tags" as const },
  ];

  const hasInitialSetup = professionalCount > 0 && specialtyCount > 0;

  return (
    <>
      <PageHeader
        title="Inicio"
        subtitle="Resumen rápido de tu consultorio"
        actions={<Button variant="secondary" onClick={() => (window.location.href = "/admin/appointments")}><Icon name="list-checks" />Ver turnos</Button>}
      />

      <div className="ui-grid-4" style={{ marginBottom: "1rem" }}>
        {loading
          ? Array.from({ length: 4 }).map((_, idx) => <Skeleton key={idx} variant="card" />)
          : statCards.map((item) => (
              <Card key={item.label}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", color: "#4b5563" }}><Icon name={item.icon} /><p style={{ margin: 0, fontSize: "0.9rem" }}>{item.label}</p></div>
                <p style={{ margin: "0.35rem 0 0", fontSize: "1.8rem", fontWeight: 700 }}>{item.value}</p>
                <p style={{ margin: "0.3rem 0 0", color: "#6b7280", fontSize: "0.82rem" }}>{item.hint}</p>
              </Card>
            ))}
      </div>

      <Card className="ui-form-row">
        <h3 style={{ marginBottom: "0.7rem", display: "flex", alignItems: "center", gap: "0.45rem" }}><Icon name="plus" />Acciones rápidas</h3>
        {loading ? (
          <div style={{ display: "grid", gap: "0.5rem" }}>{Array.from({ length: 3 }).map((_, idx) => <Skeleton key={idx} height="2.3rem" />)}</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
            <Button variant="secondary" onClick={() => (window.location.href = "/admin/professionals")}><Icon name="plus" />Crear profesional</Button>
            <Button variant="secondary" onClick={() => (window.location.href = "/admin/specialties")}><Icon name="plus" />Crear especialidad</Button>
            <Button variant="secondary" onClick={() => (window.location.href = "/admin/schedules")}><Icon name="clock" />Configurar horarios</Button>
            <Button onClick={() => (window.location.href = "/admin/appointments")}><Icon name="list-checks" />Ver turnos</Button>
          </div>
        )}
      </Card>

      {!loading && !hasInitialSetup && (
        <Card>
          <EmptyState
            icon={<Icon name="calendar-x" size={20} />}
            title="Tu clínica aún no tiene configuración inicial"
            description="Creá profesionales, especialidades y horarios para comenzar a recibir turnos."
            action={<div style={{ display: "flex", justifyContent: "center", gap: "0.55rem", flexWrap: "wrap" }}><Button variant="secondary" onClick={() => (window.location.href = "/admin/professionals")}>Ir a profesionales</Button><Button onClick={() => (window.location.href = "/admin/specialties")}>Ir a especialidades</Button></div>}
          />
        </Card>
      )}
    </>
  );
}
