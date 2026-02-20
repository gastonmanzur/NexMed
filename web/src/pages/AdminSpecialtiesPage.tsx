import { FormEvent, useEffect, useMemo, useState } from "react";
import { createSpecialty, deleteSpecialty, listSpecialties, updateSpecialty } from "../api/clinic";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Icon } from "../components/ui/Icon";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/Page";
import { Skeleton } from "../components/ui/Skeleton";
import { TextArea } from "../components/ui/TextArea";
import { useAuth } from "../hooks/useAuth";
import { Specialty } from "../types";

export function AdminSpecialtiesPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Specialty[]>([]);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState<Specialty | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    const data = await listSpecialties(token);
    setRows(data);
    setLoading(false);
  };

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [token]);

  const filtered = useMemo(() => rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase())), [rows, search]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError("");
    try {
      await createSpecialty(token, { name, description: description || undefined });
      setName("");
      setDescription("");
      setShowCreate(false);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const onEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !editing) return;
    setError("");
    try {
      await updateSpecialty(token, editing._id, { name: editing.name, description: editing.description || "", isActive: editing.isActive });
      setEditing(null);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <>
      <PageHeader title="Especialidades" subtitle="Organizá la oferta médica de tu clínica" actions={<Button onClick={() => setShowCreate((p) => !p)}><Icon name="plus" />Nueva especialidad</Button>} />

      <Card className="ui-form-row">
        <label className="ui-label" htmlFor="specialty-search">Buscar</label>
        <div className="ui-input-with-icon"><span className="ui-input-leading-icon"><Icon name="search" size={16} /></span><Input id="specialty-search" placeholder="Buscar por nombre" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </Card>

      {showCreate && (
        <Card className="ui-form-row">
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><Icon name="tags" />Nueva especialidad</h3>
          <form onSubmit={onCreate}>
            <div className="ui-form-row"><label className="ui-label" htmlFor="specialty-name">Nombre</label><Input id="specialty-name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div className="ui-form-row"><label className="ui-label" htmlFor="specialty-description">Descripción</label><TextArea id="specialty-description" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <Button><Icon name="save" />Crear especialidad</Button>
          </form>
        </Card>
      )}

      <Card>
        {loading ? (
          <div style={{ display: "grid", gap: "0.7rem" }}>{Array.from({ length: 6 }).map((_, idx) => <Skeleton key={idx} variant="card" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Icon name="tags" size={20} />} title="No hay especialidades cargadas" description="Creá la primera especialidad para comenzar." />
        ) : (
          <div style={{ display: "grid", gap: "0.7rem" }}>
            {filtered.map((row) => (
              <div key={row._id} className="ui-list-item">
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.7rem", alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1rem", display: "flex", alignItems: "center", gap: "0.35rem" }}><Icon name="tags" size={16} />{row.name}</h3>
                    <p style={{ margin: "0.3rem 0 0", color: "#6b7280" }}>{row.description || "Sin descripción"}</p>
                  </div>
                  <Badge variant={row.isActive ? "success" : "muted"}>{row.isActive ? "Activa" : "Inactiva"}</Badge>
                </div>
                <div style={{ display: "flex", gap: "0.45rem", marginTop: "0.65rem", flexWrap: "wrap" }}>
                  <Button variant="secondary" onClick={() => setEditing(row)}><Icon name="pencil" />Editar</Button>
                  <Button variant="secondary" onClick={async () => token && (await updateSpecialty(token, row._id, { isActive: !row.isActive }).then(load))}><Icon name="ban" />{row.isActive ? "Desactivar" : "Activar"}</Button>
                  <Button variant="danger" onClick={async () => token && (await deleteSpecialty(token, row._id).then(load))}><Icon name="trash" />Eliminar</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {editing && (
        <Card className="ui-form-row" style={{ marginTop: "1rem" } as React.CSSProperties}>
          <h3>Editar especialidad</h3>
          <form onSubmit={onEdit}>
            <div className="ui-grid-2">
              <div><label className="ui-label">Nombre</label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required /></div>
              <div><label className="ui-label">Descripción</label><Input value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
            </div>
            <div style={{ marginTop: "0.8rem", display: "flex", gap: "0.5rem" }}><Button><Icon name="save" />Guardar</Button><Button type="button" variant="secondary" onClick={() => setEditing(null)}><Icon name="x" />Cancelar</Button></div>
          </form>
        </Card>
      )}
      {error && <p style={{ color: "#991b1b" }}>{error}</p>}
    </>
  );
}
