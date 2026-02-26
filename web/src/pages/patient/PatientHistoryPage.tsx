import { useEffect, useMemo, useState } from "react";

import { listMyAppointmentHistory } from "../../api/appointments";
import { listMyClinics } from "../../api/patientClinics";
import { Navbar } from "../../components/Navbar";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAuth } from "../../hooks/useAuth";
import { Appointment, PatientClinic } from "../../types";

const STATUS_OPTIONS: { value: "canceled" | "completed" | "no_show"; label: string }[] = [
  { value: "canceled", label: "Cancelado" },
  { value: "completed", label: "Completado" },
  { value: "no_show", label: "Ausente" },
];

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function badgeVariant(status: Appointment["status"]): "default" | "muted" | "success" | "danger" {
  if (status === "completed") return "success";
  if (status === "no_show") return "danger";
  return "muted";
}

function statusLabel(status: Appointment["status"]) {
  if (status === "completed") return "Completado";
  if (status === "no_show") return "Ausente";
  if (status === "canceled") return "Cancelado";
  return "Reservado";
}

export function PatientHistoryPage() {
  const { logout, token, user } = useAuth();
  const [items, setItems] = useState<Appointment[]>([]);
  const [clinics, setClinics] = useState<PatientClinic[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<("canceled" | "completed" | "no_show")[]>(["canceled", "completed", "no_show"]);
  const [datePreset, setDatePreset] = useState<30 | 90 | 365>(90);
  const [clinicId, setClinicId] = useState("all");
  const [professionalId, setProfessionalId] = useState("all");
  const [specialtyId, setSpecialtyId] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const professionalOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => {
      if (item.professional?._id && item.professional.fullName) {
        map.set(item.professional._id, item.professional.fullName);
      }
    });
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [items]);

  const specialtyOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => {
      if (item.specialty?._id && item.specialty.name) {
        map.set(item.specialty._id, item.specialty.name);
      }
    });
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError("");

    try {
      const from = dateDaysAgo(datePreset);
      const [history, clinicData] = await Promise.all([
        listMyAppointmentHistory(token, {
          status: selectedStatuses,
          from,
          clinicId: clinicId !== "all" ? clinicId : undefined,
          professionalId: professionalId !== "all" ? professionalId : undefined,
          specialtyId: specialtyId !== "all" ? specialtyId : undefined,
          q: q.trim() || undefined,
          page,
          limit,
          sort: "startAt:desc",
        }),
        listMyClinics(token),
      ]);

      setItems(history.items);
      setTotal(history.total);
      setClinics(clinicData);
    } catch (e: any) {
      setError(e.message || "No se pudo cargar el historial");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token, page]);

  const applyFilters = () => {
    setPage(1);
    load();
  };

  const toggleStatus = (status: "canceled" | "completed" | "no_show") => {
    setSelectedStatuses((prev) => {
      if (prev.includes(status)) return prev.filter((item) => item !== status);
      return [...prev, status];
    });
  };

  const onLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <>
      {user && <Navbar user={user} token={token} onLogout={onLogout} />}
      <div className="page">
        <Card className="ui-form-row">
          <h2 style={{ marginTop: 0 }}>Historial de turnos</h2>
          <p style={{ color: "#6b7280" }}>Consultá cancelaciones, turnos completados y ausencias con filtros avanzados.</p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            {STATUS_OPTIONS.map((status) => (
              <label key={status.value} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid #e5e7eb", borderRadius: 999, padding: "6px 10px" }}>
                <input type="checkbox" checked={selectedStatuses.includes(status.value)} onChange={() => toggleStatus(status.value)} />
                {status.label}
              </label>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {[30, 90, 365].map((days) => (
              <Button key={days} variant={datePreset === days ? "primary" : "secondary"} onClick={() => setDatePreset(days as 30 | 90 | 365)}>
                Últimos {days} días
              </Button>
            ))}
          </div>

          <div className="ui-grid-4" style={{ marginBottom: 10 }}>
            <select className="input" value={clinicId} onChange={(e) => setClinicId(e.target.value)}>
              <option value="all">Todas las clínicas</option>
              {clinics.map((clinic) => <option key={clinic._id} value={clinic._id}>{clinic.name}</option>)}
            </select>
            <select className="input" value={professionalId} onChange={(e) => setProfessionalId(e.target.value)}>
              <option value="all">Todos los profesionales</option>
              {professionalOptions.map((professional) => <option key={professional.value} value={professional.value}>{professional.label}</option>)}
            </select>
            <select className="input" value={specialtyId} onChange={(e) => setSpecialtyId(e.target.value)}>
              <option value="all">Todas las especialidades</option>
              {specialtyOptions.map((specialty) => <option key={specialty.value} value={specialty.value}>{specialty.label}</option>)}
            </select>
            <Input placeholder="Buscar por clínica/profesional" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={applyFilters}><Icon name="filter" />Aplicar filtros</Button>
          </div>
        </Card>

        <Card>
          {loading ? (
            <div style={{ display: "grid", gap: 10 }}>
              {Array.from({ length: 4 }).map((_, idx) => <Skeleton key={idx} variant="card" />)}
            </div>
          ) : error ? (
            <p className="error">{error}</p>
          ) : items.length === 0 ? (
            <EmptyState icon={<Icon name="calendar-x" size={20} />} title="Sin resultados" description="No encontramos turnos para esos filtros." />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {items.map((item) => {
                const clinicSlug = item.clinic?.slug || item.clinicSlug || "";
                const repeatUrl = `/c/${clinicSlug}?professionalId=${encodeURIComponent(item.professionalId || "")}&specialtyId=${encodeURIComponent(item.specialtyId || "")}`;
                return (
                  <article key={item._id} className="ui-card ui-card-interactive" style={{ padding: "0.95rem", transitionDuration: "150ms" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div>
                        <strong>{item.clinic?.name || "Clínica"}</strong>
                        <div style={{ color: "#6b7280", marginTop: 4 }}>{new Date(item.startAt).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })}</div>
                      </div>
                      <Badge variant={badgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
                    </div>
                    <div style={{ marginTop: 8, color: "#4b5563", display: "grid", gap: 2 }}>
                      <span>Profesional: {item.professional?.fullName || item.professionalName || "Profesional a confirmar"}</span>
                      <span>Especialidad: {item.specialty?.name || "—"}</span>
                      <span>{item.clinic?.address || ""} {item.clinic?.city ? `· ${item.clinic.city}` : ""} {item.clinic?.phone ? `· ${item.clinic.phone}` : ""}</span>
                      {item.status === "canceled" && (item.cancelReasonText || item.cancelReason) && (
                        <span>Motivo: {item.cancelReasonText || item.cancelReason}</span>
                      )}
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <a className="btn" href={repeatUrl}>Repetir turno</a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, alignItems: "center" }}>
            <small style={{ color: "#6b7280" }}>Página {page} de {totalPages} · {total} resultados</small>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="secondary" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>Anterior</Button>
              <Button variant="secondary" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>Siguiente</Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
