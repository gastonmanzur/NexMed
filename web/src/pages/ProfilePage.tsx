import { useEffect, useState } from "react";
import { createClinicInvite, listClinicInvites, updateClinicInvite } from "../api/invites";
import { getProfile, updateClinicProfile, updatePatientProfile } from "../api/profile";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Navbar } from "../components/Navbar";
import { useAuth } from "../hooks/useAuth";
import { ClinicInvite, ClinicPublicVisibility } from "../types";

const defaultVisibility: ClinicPublicVisibility = {
  phone: true,
  whatsapp: true,
  website: true,
  address: true,
  city: true,
  province: true,
  postalCode: true,
  description: true,
  businessHoursNote: true,
};

export function ProfilePage() {
  const { token, user, clinic, logout, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [invites, setInvites] = useState<ClinicInvite[]>([]);
  const [clinicForm, setClinicForm] = useState<any>(null);
  const [patientForm, setPatientForm] = useState<any>(null);

  const load = async () => {
    if (!token || !user) return;
    setLoading(true);
    setError("");
    try {
      const data = await getProfile(token);
      if (data.type === "clinic") {
        setClinicForm({
          ...data,
          publicVisibility: { ...defaultVisibility, ...(data.publicVisibility ?? {}) },
        });
        const rows = await listClinicInvites(token);
        setInvites(rows);
      } else {
        setPatientForm(data);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token, user?.id]);

  const onCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setMsg("Link copiado");
  };

  const saveClinic = async () => {
    if (!token || !clinicForm) return;
    setSaving(true);
    setError("");
    setMsg("");
    try {
      await updateClinicProfile(token, clinicForm);
      await refreshProfile();
      setMsg("Guardado");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const savePatient = async () => {
    if (!token || !patientForm) return;
    setSaving(true);
    setError("");
    setMsg("");
    try {
      await updatePatientProfile(token, {
        firstName: patientForm.firstName,
        lastName: patientForm.lastName,
        phone: patientForm.phone,
        whatsapp: patientForm.whatsapp,
        age: patientForm.age === "" ? undefined : Number(patientForm.age),
      });
      await refreshProfile();
      setMsg("Guardado");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const createInviteRow = async () => {
    if (!token) return;
    const invite = await createClinicInvite(token, { label: `Link ${invites.length + 1}`, active: true });
    setInvites((prev) => [invite, ...prev]);
  };

  const joinUrlDefault = clinicForm?.joinUrlDefault || "";
  const bookingUrl = clinicForm?.publicBookingUrl || "";

  if (!user) return null;

  return (
    <>
      <Navbar user={user} clinicName={clinic?.name} onLogout={() => { logout(); window.location.href = "/login"; }} />
      <div className="page">
        <h2 style={{ color: "white" }}>Mi Perfil</h2>
        {loading && <Card><p>Cargando...</p></Card>}
        {error && <Card><p className="error">{error}</p></Card>}
        {msg && <Card><p className="success">{msg}</p></Card>}

        {!loading && clinicForm && (
          <>
            <Card><h3>Datos (Público)</h3>
              <div className="grid-2">
                {['name','phone','whatsapp','website','address','city','province','postalCode','description','businessHoursNote'].map((k) => (
                  <div className="form-row" key={k}><label>{k}</label><Input value={clinicForm[k] || ""} onChange={(e) => setClinicForm((p: any) => ({ ...p, [k]: e.target.value }))} /></div>
                ))}
              </div>
            </Card>

            <Card><h3>Visibilidad</h3><p>Esto se muestra a los pacientes en la página pública.</p>
              <div className="grid-2">
                {Object.keys(defaultVisibility).map((k) => (
                  <label key={k}><input type="checkbox" checked={clinicForm.publicVisibility?.[k]} onChange={(e) => setClinicForm((p: any) => ({ ...p, publicVisibility: { ...p.publicVisibility, [k]: e.target.checked } }))} /> {k}</label>
                ))}
              </div>
            </Card>

            <Card><h3>Facturación (Interno)</h3>
              <div className="grid-2">
                {['legalName','taxId','billingEmail','fiscalAddress','fiscalCity','fiscalProvince','fiscalPostalCode','invoiceNotes'].map((k) => (
                  <div className="form-row" key={k}><label>{k}</label><Input value={clinicForm[k] || ""} onChange={(e) => setClinicForm((p: any) => ({ ...p, [k]: e.target.value }))} /></div>
                ))}
              </div>
            </Card>

            <Card><h3>Enlaces y QR</h3>
              <div className="form-row"><label>Link público</label><Input readOnly value={bookingUrl} /></div>
              <Button type="button" onClick={() => onCopy(bookingUrl)}>Copiar link</Button>
              <img alt="QR link público" src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(bookingUrl || "-")}`} />

              <div className="form-row" style={{ marginTop: 16 }}><label>Link join default</label><Input readOnly value={joinUrlDefault} /></div>
              <Button type="button" onClick={() => onCopy(joinUrlDefault)}>Copiar link</Button>
              <img alt="QR join default" src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(joinUrlDefault || "-")}`} />

              <hr />
              <div className="form-row"><Button type="button" onClick={createInviteRow}>Nuevo link/QR</Button></div>
              {invites.map((invite) => {
                const url = invite.url || `${window.location.origin}/join/${invite.token}`;
                return <div key={invite._id} className="card-box">
                  <Input value={invite.label || ""} onChange={(e) => setInvites((prev) => prev.map((i) => i._id === invite._id ? { ...i, label: e.target.value } : i))} />
                  <label><input type="checkbox" checked={invite.active} onChange={(e) => setInvites((prev) => prev.map((i) => i._id === invite._id ? { ...i, active: e.target.checked } : i))} /> activo</label>
                  <Input readOnly value={url} />
                  <Button type="button" onClick={() => onCopy(url)}>Copiar</Button>
                  <Button type="button" onClick={async () => {
                    if (!token) return;
                    const updated = await updateClinicInvite(token, invite._id, { label: invite.label, active: invite.active });
                    setInvites((prev) => prev.map((i) => i._id === invite._id ? updated : i));
                  }}>Guardar link</Button>
                  <img alt="QR invitación" src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}`} />
                </div>;
              })}
            </Card>

            <Button disabled={saving} onClick={saveClinic}>Guardar perfil</Button>
          </>
        )}

        {!loading && patientForm && (
          <>
            <Card><h3>Datos personales</h3>
              <div className="grid-2">
                <div className="form-row"><label>Nombre</label><Input value={patientForm.firstName || ""} onChange={(e) => setPatientForm((p: any) => ({ ...p, firstName: e.target.value }))} /></div>
                <div className="form-row"><label>Apellido</label><Input value={patientForm.lastName || ""} onChange={(e) => setPatientForm((p: any) => ({ ...p, lastName: e.target.value }))} /></div>
                <div className="form-row"><label>Edad</label><Input type="number" value={patientForm.age ?? ""} onChange={(e) => setPatientForm((p: any) => ({ ...p, age: e.target.value }))} /></div>
                <div className="form-row"><label>Email</label><Input readOnly value={patientForm.email || ""} /></div>
                <div className="form-row"><label>Teléfono</label><Input value={patientForm.phone || ""} onChange={(e) => setPatientForm((p: any) => ({ ...p, phone: e.target.value }))} /></div>
                <div className="form-row"><label>WhatsApp</label><Input value={patientForm.whatsapp || ""} onChange={(e) => setPatientForm((p: any) => ({ ...p, whatsapp: e.target.value }))} /></div>
              </div>
            </Card>
            <Card><h3>Seguridad</h3><p>{patientForm.googleSub ? "Tu cuenta usa Google Sign-In" : "Cambiar contraseña (próximamente)"}</p></Card>
            <Button disabled={saving} onClick={savePatient}>Guardar perfil</Button>
          </>
        )}
      </div>
    </>
  );
}
