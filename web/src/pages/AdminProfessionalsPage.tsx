import { FormEvent, useEffect, useMemo, useState } from "react";
import { createProfessional, listProfessionals, listSpecialties, updateProfessional } from "../api/clinic";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Icon } from "../components/ui/Icon";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/Page";
import { Skeleton } from "../components/ui/Skeleton";
import { useAuth } from "../hooks/useAuth";
import { Professional, Specialty } from "../types";

export function AdminProfessionalsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Professional[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [editing, setEditing] = useState<Professional | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", specialtyIds: [] as string[] });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const specialtyMap = useMemo(() => new Map(specialties.map((s) => [s._id, s.name])), [specialties]);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    const [p, s] = await Promise.all([listProfessionals(token), listSpecialties(token)]);
    setRows(p);
    setSpecialties(s);
    setLoading(false);
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [token]);

  const toggleSpec = (id: string, target: { specialtyIds: string[] }) => target.specialtyIds.includes(id) ? target.specialtyIds.filter((x) => x !== id) : [...target.specialtyIds, id];

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError("");
    if (!form.firstName || !form.lastName) return setError("Nombre y apellido son obligatorios");
    if (form.specialtyIds.length === 0) return setError("Debe seleccionar al menos una especialidad");
    try {
      await createProfessional(token, form);
      setForm({ firstName: "", lastName: "", email: "", phone: "", specialtyIds: [] });
      setShowCreate(false);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <>
      <PageHeader title="Profesionales" subtitle="Administrá tu equipo médico" actions={<Button onClick={() => setShowCreate((v) => !v)}><Icon name="plus" />Nuevo profesional</Button>} />

      {showCreate && (
        <Card className="ui-form-row">
          <h3>Nuevo profesional</h3>
          <form onSubmit={onCreate}>
            <div className="ui-grid-2">
              <div><label className="ui-label">Nombre</label><Input value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} required /></div>
              <div><label className="ui-label">Apellido</label><Input value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} required /></div>
              <div><label className="ui-label">Email</label><Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /></div>
              <div><label className="ui-label">Teléfono</label><Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></div>
            </div>
            <div className="ui-form-row" style={{ marginTop: "0.7rem" }}>
              <label className="ui-label">Especialidades</label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {specialties.map((s) => <button key={s._id} type="button" className="ui-link-button" style={{ border: form.specialtyIds.includes(s._id) ? "1px solid #111827" : "1px solid #e5e7eb" }} onClick={() => setForm((p) => ({ ...p, specialtyIds: toggleSpec(s._id, p) }))}>{s.name}</button>)}
              </div>
            </div>
            <Button><Icon name="save" />Crear profesional</Button>
          </form>
        </Card>
      )}

      <Card>
        {loading ? (
          <div style={{ display: "grid", gap: "0.7rem" }}>{Array.from({ length: 6 }).map((_, idx) => <Skeleton key={idx} variant="card" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Icon name="users" size={20} />} title="No hay profesionales cargados" description="Creá el primer profesional para habilitar agendas y turnos." />
        ) : (
          <div style={{ display: "grid", gap: "0.7rem" }}>
            {rows.map((row) => {
              const initials = `${row.firstName?.[0] || ""}${row.lastName?.[0] || ""}`.toUpperCase();
              return (
                <div key={row._id} className="ui-list-item">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.7rem", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: "0.7rem", alignItems: "flex-start" }}>
                      <div style={{ width: 36, height: 36, borderRadius: 999, background: "#f3f4f6", border: "1px solid #e5e7eb", display: "grid", placeItems: "center", fontWeight: 700, color: "#4b5563" }}>{initials || "MD"}</div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "1rem" }}>{row.displayName || `${row.firstName} ${row.lastName}`}</h3>
                        <p style={{ margin: "0.3rem 0 0", color: "#6b7280" }}>{row.email || "Sin email"} · {row.phone || "Sin teléfono"}</p>
                        <div style={{ marginTop: "0.45rem", display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                          {row.specialtyIds.map((id) => <Badge key={id} variant="muted"><Icon name="tags" size={16} />{specialtyMap.get(id) ?? id}</Badge>)}
                        </div>
                      </div>
                    </div>
                    <Badge variant={row.isActive ? "success" : "muted"}>{row.isActive ? "Activo" : "Inactivo"}</Badge>
                  </div>
                  <div style={{ display: "flex", gap: "0.45rem", marginTop: "0.65rem", flexWrap: "wrap" }}>
                    <Button variant="secondary" onClick={() => setEditing(row)}><Icon name="pencil" />Editar</Button>
                    <Button variant="secondary" onClick={async () => token && (await updateProfessional(token, row._id, { isActive: !row.isActive }).then(load))}><Icon name="ban" />{row.isActive ? "Desactivar" : "Activar"}</Button>
                    <Button variant="secondary" onClick={() => (window.location.href = "/admin/schedules")}><Icon name="clock" />Horarios</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {editing && (
        <Card style={{ marginTop: "1rem" }}>
          <h3>Editar profesional</h3>
          <div className="ui-grid-2">
            <div><label className="ui-label">Nombre</label><Input value={editing.firstName} onChange={(e) => setEditing({ ...editing, firstName: e.target.value })} /></div>
            <div><label className="ui-label">Apellido</label><Input value={editing.lastName} onChange={(e) => setEditing({ ...editing, lastName: e.target.value })} /></div>
            <div><label className="ui-label">Email</label><Input value={editing.email || ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
            <div><label className="ui-label">Teléfono</label><Input value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
          </div>
          <div className="ui-form-row" style={{ marginTop: "0.7rem" }}>
            <label className="ui-label">Especialidades</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
              {specialties.map((s) => <button key={s._id} type="button" className="ui-link-button" style={{ border: editing.specialtyIds.includes(s._id) ? "1px solid #111827" : "1px solid #e5e7eb" }} onClick={() => setEditing((p) => (p ? { ...p, specialtyIds: toggleSpec(s._id, p) } : p))}>{s.name}</button>)}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button onClick={async () => {
              if (!token || !editing) return;
              await updateProfessional(token, editing._id, { firstName: editing.firstName, lastName: editing.lastName, email: editing.email, phone: editing.phone, specialtyIds: editing.specialtyIds, isActive: editing.isActive });
              setEditing(null);
              await load();
            }}><Icon name="save" />Guardar</Button>
            <Button variant="secondary" onClick={() => setEditing(null)}><Icon name="x" />Cancelar</Button>
          </div>
        </Card>
      )}

      {error && <p style={{ color: "#991b1b" }}>{error}</p>}
    </>
  );
}
