import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card } from '@starter/ui';
import type { OrganizationHealthInsuranceDto, OrganizationHealthInsurancePlanDto } from '@starter/shared-types';
import { useAuth } from '../auth/AuthContext';
import { organizationApi } from './organization-api';

type PlanDraft = OrganizationHealthInsurancePlanDto;

type CoverageDraft = {
  name: string;
  requiresMemberNumber: boolean;
  requiresPlan: boolean;
  notes: string;
  plans: PlanDraft[];
};

const emptyDraft: CoverageDraft = { name: '', requiresMemberNumber: false, requiresPlan: false, notes: '', plans: [] };
const normalizePlanName = (value: string): string => value.trim().replace(/\s+/g, ' ');
const planKey = (value: string): string => normalizePlanName(value).toLocaleLowerCase('es-AR');

const PlanEditor = ({ draft, onChange }: { draft: CoverageDraft; onChange: (draft: CoverageDraft) => void }): ReactElement | null => {
  const [planName, setPlanName] = useState('');
  const [planError, setPlanError] = useState('');

  if (!draft.requiresPlan) return null;

  const addPlan = (): void => {
    const name = normalizePlanName(planName);
    if (!name) {
      setPlanError('Ingresá el nombre del plan.');
      return;
    }
    if (draft.plans.some((plan) => planKey(plan.name) === planKey(name))) {
      setPlanError('Ese plan ya está cargado para esta obra social.');
      return;
    }
    onChange({ ...draft, plans: [...draft.plans, { name, code: name, active: true }] });
    setPlanName('');
    setPlanError('');
  };

  const updatePlan = (index: number, name: string): void => {
    const normalized = normalizePlanName(name);
    const duplicate = draft.plans.some((plan, planIndex) => planIndex !== index && planKey(plan.name) === planKey(normalized));
    if (!normalized) {
      setPlanError('El plan no puede quedar vacío.');
      return;
    }
    if (duplicate) {
      setPlanError('Ese plan ya está cargado para esta obra social.');
      return;
    }
    setPlanError('');
    onChange({ ...draft, plans: draft.plans.map((plan, planIndex) => (planIndex === index ? { ...plan, name: normalized, code: plan.code || normalized } : plan)) });
  };

  const togglePlan = (index: number): void => {
    onChange({ ...draft, plans: draft.plans.map((plan, planIndex) => (planIndex === index ? { ...plan, active: !plan.active } : plan)) });
  };

  const removePlan = (index: number): void => {
    onChange({ ...draft, plans: draft.plans.filter((_, planIndex) => planIndex !== index) });
  };

  return (
    <section style={{ border: '1px solid #dbe7f3', borderRadius: '16px', padding: '1rem', background: '#f8fbff', display: 'grid', gap: '.75rem' }}>
      <div>
        <strong>Planes disponibles</strong>
        <p style={{ margin: '.25rem 0 0', color: '#64748b' }}>Cargá los planes que podrá elegir el paciente al reservar.</p>
      </div>
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        <input
          value={planName}
          onChange={(event) => { setPlanName(event.target.value); setPlanError(''); }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addPlan();
            }
          }}
          placeholder="210, 310, Plan joven..."
          aria-label="Nombre del plan"
        />
        <button className="nx-btn" type="button" onClick={addPlan}>Agregar plan</button>
      </div>
      {planError ? <p role="alert" className="nx-join__error">{planError}</p> : null}
      {draft.plans.length === 0 ? <p style={{ margin: 0, color: '#64748b' }}>Todavía no cargaste planes para esta obra social.</p> : null}
      <div style={{ display: 'grid', gap: '.5rem' }}>
        {draft.plans.map((plan, index) => (
          <div key={`${plan.name}-${index}`} style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={plan.name} onChange={(event) => updatePlan(index, event.target.value)} aria-label={`Plan ${index + 1}`} />
            <span style={{ color: plan.active ? '#047857' : '#94a3b8' }}>{plan.active ? 'Activo' : 'Inactivo'}</span>
            <button className="nx-btn nx-btn--ghost" type="button" onClick={() => togglePlan(index)}>{plan.active ? 'Desactivar' : 'Activar'}</button>
            <button className="nx-btn nx-btn--ghost" type="button" onClick={() => removePlan(index)}>Eliminar</button>
          </div>
        ))}
      </div>
    </section>
  );
};

export const OrganizationHealthInsurancesPage = (): ReactElement => {
  const { user, accessToken, activeOrganizationId } = useAuth();
  const [rows, setRows] = useState<OrganizationHealthInsuranceDto[]>([]);
  const [draft, setDraft] = useState<CoverageDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const save = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!accessToken || !activeOrganizationId) return;
    const activePlanNames = draft.plans.filter((plan) => plan.active).map((plan) => normalizePlanName(plan.name)).filter(Boolean);
    if (draft.requiresPlan && activePlanNames.length === 0) {
      setError('Agregá al menos un plan activo o desmarcá “Requiere plan”.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await organizationApi.updateHealthInsurance(accessToken, activeOrganizationId, editingId, draft);
      } else {
        await organizationApi.createHealthInsurance(accessToken, activeOrganizationId, draft);
      }
      setDraft(emptyDraft);
      setEditingId(null);
      await load();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const edit = (row: OrganizationHealthInsuranceDto): void => {
    setEditingId(row.id);
    setDraft({ name: row.name, requiresMemberNumber: row.requiresMemberNumber, requiresPlan: row.requiresPlan, notes: row.notes ?? '', plans: row.plans ?? [] });
    setError('');
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
        <form onSubmit={(event) => void save(event)} style={{ display: 'grid', gap: '.75rem', marginBottom: '1.5rem' }}>
          <label>Nombre de obra social<input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="OSDE, IOMA, Swiss Medical..." /></label>
          <label><input type="checkbox" checked={draft.requiresMemberNumber} onChange={(event) => setDraft({ ...draft, requiresMemberNumber: event.target.checked })} /> Requiere número de afiliado</label>
          <label><input type="checkbox" checked={draft.requiresPlan} onChange={(event) => setDraft({ ...draft, requiresPlan: event.target.checked })} /> Requiere plan</label>
          <PlanEditor draft={draft} onChange={setDraft} />
          <label>Notas<textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <button className="nx-btn" type="submit" disabled={saving}>{saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear obra social'}</button>
            {editingId ? <button className="nx-btn nx-btn--ghost" type="button" onClick={() => { setEditingId(null); setDraft(emptyDraft); }}>Cancelar edición</button> : null}
          </div>
        </form>
        {loading ? <p>Cargando coberturas...</p> : null}
        <div style={{ overflowX: 'auto' }}>
          <table className="nx-table">
            <thead><tr><th>Nombre</th><th>Estado</th><th>N° afiliado</th><th>Plan</th><th>Planes</th><th>Notas</th><th>Acciones</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td><td>{row.status === 'active' ? 'Activa' : 'Inactiva'}</td><td>{row.requiresMemberNumber ? 'Sí' : 'No'}</td><td>{row.requiresPlan ? 'Sí' : 'No'}</td><td>{row.plans?.length ? row.plans.map((plan) => `${plan.name}${plan.active ? '' : ' (inactivo)'}`).join(', ') : '-'}</td><td>{row.notes ?? '-'}</td>
                  <td style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}><button type="button" className="nx-btn" onClick={() => edit(row)}>Editar</button><button type="button" className="nx-btn nx-btn--ghost" onClick={() => void toggleStatus(row)}>{row.status === 'active' ? 'Inactivar' : 'Activar'}</button></td>
                </tr>
              ))}
              {rows.length === 0 && !loading ? <tr><td colSpan={7}>Todavía no cargaste coberturas.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
};
