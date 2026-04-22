import type { FormEvent, ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { adminApi, type AdminPlanItem } from './admin-api';

const money = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const AdminPlansPage = (): ReactElement => {
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<AdminPlanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [currency, setCurrency] = useState('ARS');
  const [maxProfessionals, setMaxProfessionals] = useState('3');
  const [description, setDescription] = useState('');
  const [isRecommended, setIsRecommended] = useState(false);

  const title = useMemo(() => (editingId ? 'Editar plan' : 'Crear plan'), [editingId]);

  const resetForm = (): void => {
    setEditingId(null);
    setName('');
    setSlug('');
    setMonthlyPrice('');
    setCurrency('ARS');
    setMaxProfessionals('3');
    setDescription('');
    setIsRecommended(false);
  };

  const load = async (): Promise<void> => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      setRows(await adminApi.listPlans(accessToken));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [accessToken]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!accessToken || saving) return;

    setSaving(true);
    setError('');
    try {
      const payload = {
        name,
        slug,
        monthlyPrice: Number(monthlyPrice),
        currency,
        maxProfessionals: Number(maxProfessionals),
        isRecommended
      };
      const payloadWithDescription = {
        ...payload,
        ...(description.trim() ? { description: description.trim() } : {})
      };

      if (editingId) {
        await adminApi.updatePlan(accessToken, editingId, payloadWithDescription);
      } else {
        await adminApi.createPlan(accessToken, payloadWithDescription);
      }
      resetForm();
      await load();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: AdminPlanItem): void => {
    setEditingId(item.id);
    setName(item.name);
    setSlug(item.slug);
    setMonthlyPrice(String(item.monthlyPrice));
    setCurrency(item.currency);
    setMaxProfessionals(String(item.maxProfessionals));
    setDescription(item.description ?? '');
    setIsRecommended(item.isRecommended);
  };

  const toggleActive = async (item: AdminPlanItem): Promise<void> => {
    if (!accessToken) return;
    setSaving(true);
    try {
      await adminApi.updatePlan(accessToken, item.id, { isActive: !item.isActive });
      await load();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const setRecommendedPlan = async (item: AdminPlanItem): Promise<void> => {
    if (!accessToken) return;
    setSaving(true);
    try {
      await adminApi.updatePlan(accessToken, item.id, { isRecommended: true });
      await load();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="nx-page">
      <Card title="Planes" subtitle="Gestioná precios, límites y recomendación comercial.">
        <form className="nx-form-grid nx-form-grid--cols-3" onSubmit={(event) => void onSubmit(event)}>
          <label className="nx-field">
            Nombre
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="nx-field">
            Slug
            <input value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/\s+/g, '-'))} required />
          </label>
          <label className="nx-field">
            Precio mensual
            <input type="number" min="0" value={monthlyPrice} onChange={(event) => setMonthlyPrice(event.target.value)} required />
          </label>
          <label className="nx-field">
            Moneda
            <input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} required />
          </label>
          <label className="nx-field">
            Límite de profesionales
            <input type="number" min="1" value={maxProfessionals} onChange={(event) => setMaxProfessionals(event.target.value)} required />
          </label>
          <label className="nx-field">
            Descripción
            <input value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label className="nx-field nx-checkbox-field">
            <input type="checkbox" checked={isRecommended} onChange={(event) => setIsRecommended(event.target.checked)} />
            Plan recomendado
          </label>
          <div className="nx-form-actions">
            <button className="nx-btn" type="submit" disabled={saving}>{saving ? 'Guardando...' : title}</button>
            {editingId ? <button type="button" className="nx-btn-secondary" onClick={resetForm}>Cancelar</button> : null}
          </div>
        </form>
        {error ? <p className="nx-state nx-state--error" style={{ marginTop: '0.75rem' }}>{error}</p> : null}
      </Card>

      <Card title="Listado de planes">
        {loading ? <p>Cargando planes...</p> : null}
        <div className="nx-table-wrap">
          <table className="nx-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Precio mensual</th>
                <th>Moneda</th>
                <th>Límite profesionales</th>
                <th>Estado</th>
                <th>Recomendado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{money.format(item.monthlyPrice)}</td>
                  <td>{item.currency}</td>
                  <td>{item.maxProfessionals}</td>
                  <td><span className={item.isActive ? 'nx-badge' : 'nx-badge nx-badge--danger'}>{item.isActive ? 'Activo' : 'Inactivo'}</span></td>
                  <td>{item.isRecommended ? <span className="nx-badge">Sí</span> : '-'}</td>
                  <td className="nx-table-cell-actions">
                    <button className="nx-btn-secondary" onClick={() => startEdit(item)}>Editar</button>
                    <button className="nx-btn-secondary" onClick={() => void toggleActive(item)}>{item.isActive ? 'Desactivar' : 'Activar'}</button>
                    {!item.isRecommended ? <button className="nx-btn-secondary" onClick={() => void setRecommendedPlan(item)}>Recomendar</button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
};
