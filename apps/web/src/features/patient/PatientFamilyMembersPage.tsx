import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { PatientFamilyMemberDto } from '@starter/shared-types';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { patientApi } from './patient-api';
import { ConfirmActionButton } from '../../components/ConfirmActionButton';

interface FamilyFormState {
  firstName: string;
  lastName: string;
  relationship: string;
  dateOfBirth: string;
  documentId: string;
  phone: string;
  notes: string;
  isActive: boolean;
}

const emptyForm: FamilyFormState = {
  firstName: '',
  lastName: '',
  relationship: '',
  dateOfBirth: '',
  documentId: '',
  phone: '',
  notes: '',
  isActive: true
};

export const PatientFamilyMembersPage = (): ReactElement => {
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<PatientFamilyMemberDto[]>([]);
  const [form, setForm] = useState<FamilyFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const activeRows = useMemo(() => rows.filter((item) => item.isActive), [rows]);

  const reload = async (): Promise<void> => {
    if (!accessToken) return;
    setLoading(true);
    try {
      setError('');
      const data = await patientApi.listFamilyMembers(accessToken);
      setRows(data);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [accessToken]);

  const resetForm = (): void => {
    setForm(emptyForm);
    setEditingId(null);
  };

  return (
    <main className="nx-page">
      <Card title="Familiares" subtitle="Administrá familiares para reservar turnos para ellos cuando lo necesites.">
        <p className="nx-muted">Familiares activos: {activeRows.length}</p>
        {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}
        {message ? <p style={{ color: 'var(--success)' }}>{message}</p> : null}

        <form
          className="nx-form-grid"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!accessToken) return;
            try {
              setError('');
              setMessage('');
              const payload = {
                firstName: form.firstName,
                lastName: form.lastName,
                relationship: form.relationship,
                dateOfBirth: form.dateOfBirth,
                documentId: form.documentId,
                ...(form.phone.trim() ? { phone: form.phone } : {}),
                ...(form.notes.trim() ? { notes: form.notes } : {}),
                isActive: form.isActive
              };
              if (editingId) {
                await patientApi.patchFamilyMember(accessToken, editingId, payload);
                setMessage('Familiar actualizado.');
              } else {
                await patientApi.createFamilyMember(accessToken, payload);
                setMessage('Familiar agregado.');
              }
              resetForm();
              await reload();
            } catch (cause) {
              setError((cause as Error).message);
            }
          }}
        >
          <label className="nx-field">
            <span>Nombre</span>
            <input required value={form.firstName} onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))} />
          </label>
          <label className="nx-field">
            <span>Apellido</span>
            <input required value={form.lastName} onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))} />
          </label>
          <label className="nx-field">
            <span>Parentesco</span>
            <input required value={form.relationship} onChange={(event) => setForm((prev) => ({ ...prev, relationship: event.target.value }))} />
          </label>
          <label className="nx-field">
            <span>Fecha de nacimiento</span>
            <input type="date" required value={form.dateOfBirth} onChange={(event) => setForm((prev) => ({ ...prev, dateOfBirth: event.target.value }))} />
          </label>
          <label className="nx-field">
            <span>Documento</span>
            <input required value={form.documentId} onChange={(event) => setForm((prev) => ({ ...prev, documentId: event.target.value }))} />
          </label>
          <label className="nx-field">
            <span>Teléfono (opcional)</span>
            <input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
          </label>
          <label className="nx-field" style={{ gridColumn: '1 / -1' }}>
            <span>Notas (opcional)</span>
            <textarea value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </label>
          <label className="nx-checkbox" style={{ gridColumn: '1 / -1' }}>
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
            <span>Activo para reservar turnos</span>
          </label>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12 }}>
            <button type="submit" className="nx-btn">{editingId ? 'Guardar cambios' : 'Agregar familiar'}</button>
            {editingId ? (
              <button type="button" className="nx-btn-secondary" onClick={resetForm}>
                Cancelar edición
              </button>
            ) : null}
          </div>
        </form>

        <ul className="nx-appointment-list">
          {rows.map((item) => (
            <li key={item.id} className="nx-appointment-item">
              <div>
                <p className="nx-appointment-item__date">
                  {item.firstName} {item.lastName} · {item.relationship}
                </p>
                <p className="nx-appointment-item__status">
                  Doc: {item.documentId} · Nac: {item.dateOfBirth} · Estado: {item.isActive ? 'Activo' : 'Inactivo'}
                </p>
              </div>
              <div className="nx-appointment-item__actions">
                <button
                  type="button"
                  className="nx-btn-secondary"
                  onClick={() => {
                    setEditingId(item.id);
                    setForm({
                      firstName: item.firstName,
                      lastName: item.lastName,
                      relationship: item.relationship,
                      dateOfBirth: item.dateOfBirth,
                      documentId: item.documentId,
                      phone: item.phone ?? '',
                      notes: item.notes ?? '',
                      isActive: item.isActive
                    });
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="nx-btn-secondary"
                  onClick={async () => {
                    if (!accessToken) return;
                    try {
                      await patientApi.patchFamilyMember(accessToken, item.id, { isActive: !item.isActive });
                      await reload();
                    } catch (cause) {
                      setError((cause as Error).message);
                    }
                  }}
                >
                  {item.isActive ? 'Desactivar' : 'Activar'}
                </button>
                <ConfirmActionButton
                  confirmationMessage="¿Eliminar este familiar? Esta acción no se puede deshacer."
                  onConfirm={async () => {
                    if (!accessToken) return;
                    try {
                      await patientApi.deleteFamilyMember(accessToken, item.id);
                      if (editingId === item.id) resetForm();
                      await reload();
                    } catch (cause) {
                      setError((cause as Error).message);
                    }
                  }}
                >
                  Eliminar
                </ConfirmActionButton>
              </div>
            </li>
          ))}
        </ul>

        {!loading && rows.length === 0 ? <p className="nx-muted">Todavía no agregaste familiares.</p> : null}
      </Card>
    </main>
  );
};
