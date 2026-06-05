import type { FormEvent, ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { PatientFamilyMemberDto } from '@starter/shared-types';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { patientApi } from './patient-api';

type FamilyForm = {
  firstName: string;
  lastName: string;
  relationship: string;
  dateOfBirth: string;
  documentId: string;
  phone: string;
  email: string;
  sex: string;
  address: string;
  city: string;
  province: string;
  insuranceProvider: string;
  insuranceMemberId: string;
  insurancePlan: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  bloodType: string;
  allergies: string;
  regularMedication: string;
  preexistingConditions: string;
  medicalNotes: string;
  notes: string;
  isActive: boolean;
};

const emptyForm: FamilyForm = {
  firstName: '', lastName: '', relationship: 'hijo/a', dateOfBirth: '', documentId: '', phone: '', email: '', sex: '', address: '', city: '', province: '',
  insuranceProvider: '', insuranceMemberId: '', insurancePlan: '', emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelationship: '',
  bloodType: '', allergies: '', regularMedication: '', preexistingConditions: '', medicalNotes: '', notes: '', isActive: true
};

const toForm = (member: PatientFamilyMemberDto): FamilyForm => ({
  firstName: member.firstName,
  lastName: member.lastName,
  relationship: member.relationship,
  dateOfBirth: member.dateOfBirth,
  documentId: member.documentId,
  phone: member.phone ?? '',
  email: member.email ?? '',
  sex: member.sex ?? '',
  address: member.address ?? '',
  city: member.city ?? '',
  province: member.province ?? '',
  insuranceProvider: member.insuranceProvider ?? '',
  insuranceMemberId: member.insuranceMemberId ?? '',
  insurancePlan: member.insurancePlan ?? '',
  emergencyContactName: member.emergencyContactName ?? '',
  emergencyContactPhone: member.emergencyContactPhone ?? '',
  emergencyContactRelationship: member.emergencyContactRelationship ?? '',
  bloodType: member.bloodType ?? '',
  allergies: member.allergies ?? '',
  regularMedication: member.regularMedication ?? '',
  preexistingConditions: member.preexistingConditions ?? '',
  medicalNotes: member.medicalNotes ?? '',
  notes: member.notes ?? '',
  isActive: member.isActive
});

const ageFromDate = (date: string): string => {
  if (!date) return 'Sin fecha';
  const birth = new Date(`${date}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return date;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return `${age} años · ${date}`;
};

const sectionFields: Array<{ title: string; fields: Array<{ key: keyof FamilyForm; label: string; type?: string; required?: boolean; textarea?: boolean }> }> = [
  { title: 'Datos personales', fields: [
    { key: 'firstName', label: 'Nombre', required: true }, { key: 'lastName', label: 'Apellido', required: true },
    { key: 'relationship', label: 'Relación con el titular', required: true }, { key: 'documentId', label: 'DNI / documento', required: true },
    { key: 'dateOfBirth', label: 'Fecha de nacimiento', type: 'date', required: true }, { key: 'sex', label: 'Sexo / género' },
    { key: 'phone', label: 'Teléfono' }, { key: 'email', label: 'Email' }, { key: 'address', label: 'Dirección' }, { key: 'city', label: 'Localidad' }, { key: 'province', label: 'Provincia' }
  ] },
  { title: 'Cobertura médica', fields: [
    { key: 'insuranceProvider', label: 'Obra social / prepaga' }, { key: 'insuranceMemberId', label: 'N° de afiliado' }, { key: 'insurancePlan', label: 'Plan' }
  ] },
  { title: 'Contacto de emergencia', fields: [
    { key: 'emergencyContactName', label: 'Nombre' }, { key: 'emergencyContactPhone', label: 'Teléfono' }, { key: 'emergencyContactRelationship', label: 'Relación' }
  ] },
  { title: 'Información relevante de salud', fields: [
    { key: 'bloodType', label: 'Grupo sanguíneo' }, { key: 'allergies', label: 'Alergias', textarea: true },
    { key: 'regularMedication', label: 'Medicación habitual', textarea: true }, { key: 'preexistingConditions', label: 'Enfermedades preexistentes', textarea: true },
    { key: 'medicalNotes', label: 'Observaciones médicas', textarea: true }, { key: 'notes', label: 'Notas administrativas', textarea: true }
  ] }
];

export const PatientFamilyMembersPage = (): ReactElement => {
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<PatientFamilyMemberDto[]>([]);
  const [form, setForm] = useState<FamilyForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<PatientFamilyMemberDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const activeCount = useMemo(() => rows.filter((item) => item.isActive).length, [rows]);

  const load = async (): Promise<void> => {
    if (!accessToken) return;
    setLoading(true); setError('');
    try { setRows(await patientApi.listFamilyMembers(accessToken)); } catch (cause) { setError((cause as Error).message); } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [accessToken]);

  const resetForm = (): void => { setForm(emptyForm); setEditingId(null); setMessage(''); };

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!accessToken) return;
    setSaving(true); setError(''); setMessage('');
    try {
      if (editingId) await patientApi.patchFamilyMember(accessToken, editingId, form);
      else await patientApi.createFamilyMember(accessToken, form);
      setMessage(editingId ? 'Datos del familiar actualizados.' : 'Familiar agregado con perfil de paciente propio.');
      resetForm();
      await load();
    } catch (cause) { setError((cause as Error).message); } finally { setSaving(false); }
  };

  const edit = (member: PatientFamilyMemberDto): void => { setEditingId(member.id); setForm(toForm(member)); setViewing(null); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return <div className="nx-stack">
    <Card title="Familiares" subtitle="Administrá perfiles completos de pacientes asociados a tu cuenta.">
      <div className="nx-family-toolbar">
        <div><strong>{activeCount}</strong> familiares activos</div>
        <button className="nx-btn nx-btn--secondary" type="button" onClick={resetForm}>Agregar familiar</button>
      </div>
      {error ? <p className="nx-alert nx-alert--danger">{error}</p> : null}
      {message ? <p className="nx-alert nx-alert--success">{message}</p> : null}
      <form className="nx-family-form" onSubmit={(event) => { void submit(event); }}>
        <div className="nx-family-form__header"><h3>{editingId ? 'Editar familiar' : 'Nuevo familiar'}</h3><p>Estos datos se guardan también en el PatientProfile del familiar.</p></div>
        {sectionFields.map((section) => <fieldset key={section.title} className="nx-family-section">
          <legend>{section.title}</legend>
          <div className="nx-form-grid">
            {section.fields.map((field) => <label key={field.key} className={`nx-field ${field.textarea ? 'nx-field--wide' : ''}`.trim()}>
              <span>{field.label}{field.required ? ' *' : ''}</span>
              {field.textarea ? <textarea value={form[field.key] as string} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} /> :
                <input type={field.type ?? 'text'} required={field.required} value={form[field.key] as string} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} />}
            </label>)}
          </div>
        </fieldset>)}
        {editingId ? <label className="nx-check"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} /> Familiar activo</label> : null}
        <div className="nx-form-actions"><button className="nx-btn" disabled={saving} type="submit">{saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear familiar'}</button>{editingId ? <button className="nx-btn nx-btn--secondary" type="button" onClick={resetForm}>Cancelar</button> : null}</div>
      </form>
    </Card>

    <Card title="Listado de familiares" subtitle="Cada card representa un perfil de paciente independiente.">
      {loading ? <p>Cargando familiares...</p> : rows.length === 0 ? <div className="nx-empty-state"><h3>No tenés familiares cargados</h3><p>Agregá un familiar para reservar turnos a su nombre.</p></div> : <div className="nx-family-grid">
        {rows.map((member) => <article key={member.id} className={`nx-family-card ${!member.isActive ? 'is-inactive' : ''}`.trim()}>
          <div className="nx-family-card__top"><span className="nx-patient-avatar">{member.firstName[0]}{member.lastName[0]}</span><div><h3>{member.firstName} {member.lastName}</h3><p>{member.relationship} · {ageFromDate(member.dateOfBirth)}</p></div></div>
          <dl><div><dt>Documento</dt><dd>{member.documentId}</dd></div><div><dt>Cobertura</dt><dd>{member.insuranceProvider || '—'}</dd></div><div><dt>Teléfono</dt><dd>{member.phone || '—'}</dd></div><div><dt>PatientProfile</dt><dd>{member.patientProfileId}</dd></div></dl>
          <div className="nx-family-card__actions"><button className="nx-btn nx-btn--secondary" type="button" onClick={() => setViewing(member)}>Ver datos</button><button className="nx-btn" type="button" onClick={() => edit(member)}>Editar</button><button className="nx-btn nx-btn--ghost" type="button" onClick={async () => { if (!accessToken) return; await patientApi.deleteFamilyMember(accessToken, member.id); await load(); }}>Desactivar</button></div>
        </article>)}
      </div>}
    </Card>

    {viewing ? <Card title={`Datos de ${viewing.firstName} ${viewing.lastName}`} subtitle={`Relación: ${viewing.relationship}`}>
      <div className="nx-family-detail">
        <p><strong>Documento:</strong> {viewing.documentId}</p><p><strong>Nacimiento:</strong> {viewing.dateOfBirth}</p><p><strong>Teléfono:</strong> {viewing.phone ?? '—'}</p><p><strong>Email:</strong> {viewing.email ?? '—'}</p>
        <p><strong>Dirección:</strong> {[viewing.address, viewing.city, viewing.province].filter(Boolean).join(', ') || '—'}</p><p><strong>Cobertura:</strong> {[viewing.insuranceProvider, viewing.insurancePlan, viewing.insuranceMemberId].filter(Boolean).join(' · ') || '—'}</p>
        <p><strong>Emergencia:</strong> {[viewing.emergencyContactName, viewing.emergencyContactPhone, viewing.emergencyContactRelationship].filter(Boolean).join(' · ') || '—'}</p><p><strong>Grupo sanguíneo:</strong> {viewing.bloodType ?? '—'}</p>
        <p><strong>Alergias:</strong> {viewing.allergies ?? '—'}</p><p><strong>Medicación:</strong> {viewing.regularMedication ?? '—'}</p><p><strong>Condiciones:</strong> {viewing.preexistingConditions ?? '—'}</p><p><strong>Observaciones:</strong> {viewing.medicalNotes ?? '—'}</p>
      </div>
    </Card> : null}
  </div>;
};
