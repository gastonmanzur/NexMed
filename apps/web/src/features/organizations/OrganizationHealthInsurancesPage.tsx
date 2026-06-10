import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card } from '@starter/ui';
import type { OrganizationHealthInsuranceDto } from '@starter/shared-types';
import { useAuth } from '../auth/AuthContext';
import { organizationApi } from './organization-api';

export const OrganizationHealthInsurancesPage = (): ReactElement => {
  const { user, accessToken, activeOrganizationId } = useAuth();
  const [rows, setRows] = useState<OrganizationHealthInsuranceDto[]>([]);
  const [name, setName] = useState('');
  const [requiresMemberNumber, setRequiresMemberNumber] = useState(false);
  const [requiresPlan, setRequiresPlan] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async (): Promise<void> => {
    if (!accessToken || !activeOrganizationId) return;
    setLoading(true);
    setError('');
    try {
      setRows(await organizationApi.listHealthInsurances(accessToken, activeOrganizationId));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [accessToken, activeOrganizationId]);

  const create = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!accessToken || !activeOrganizationId) return;
    setSaving(true);
    setError('');
    try {
      await organizationApi.createHealthInsurance(accessToken, activeOrganizationId, { name, requiresMemberNumber, requiresPlan, notes });
      setName(''); setRequiresMemberNumber(false); setRequiresPlan(false); setNotes('');
      await load();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (row: OrganizationHealthInsuranceDto): Promise<void> => {
    if (!accessToken || !activeOrganizationId) return;
    await organizationApi.updateHealthInsurance(accessToken, activeOrganizationId, row.id, { status: row.status === 'active' ? 'inactive' : 'active' });
    await load();
  };

  if (!user) return <Navigate to="/login" replace />;
  if (!activeOrganizationId) return <Navigate to="/post-login" replace />;

  return (
    <main>
      <Card title="Obras sociales" subtitle="Administrá las coberturas aceptadas por este centro. Particular siempre estará disponible en la reserva pública.">
        {error ? <p role="alert" className="nx-join__error">{error}</p> : null}
        <form onSubmit={(event) => void create(event)} style={{ display: 'grid', gap: '.75rem', marginBottom: '1.5rem' }}>
          <label>Nombre de cobertura<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="OSDE, IOMA, Swiss Medical..." /></label>
          <label><input type="checkbox" checked={requiresMemberNumber} onChange={(event) => setRequiresMemberNumber(event.target.checked)} /> Requiere número de afiliado</label>
          <label><input type="checkbox" checked={requiresPlan} onChange={(event) => setRequiresPlan(event.target.checked)} /> Requiere plan</label>
          <label>Notas<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
          <button className="nx-btn" type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Crear cobertura'}</button>
        </form>
        {loading ? <p>Cargando coberturas...</p> : null}
        <div style={{ overflowX: 'auto' }}>
          <table className="nx-table">
            <thead><tr><th>Nombre</th><th>Estado</th><th>N° afiliado</th><th>Plan</th><th>Notas</th><th>Acciones</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td><td>{row.status === 'active' ? 'Activa' : 'Inactiva'}</td><td>{row.requiresMemberNumber ? 'Sí' : 'No'}</td><td>{row.requiresPlan ? 'Sí' : 'No'}</td><td>{row.notes ?? '-'}</td>
                  <td><button type="button" className="nx-btn" onClick={() => void toggleStatus(row)}>{row.status === 'active' ? 'Inactivar' : 'Activar'}</button></td>
                </tr>
              ))}
              {rows.length === 0 && !loading ? <tr><td colSpan={6}>Todavía no cargaste coberturas.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
};
