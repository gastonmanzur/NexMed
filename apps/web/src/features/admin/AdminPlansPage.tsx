import type { FormEvent, ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { adminApi, type AdminPlanItem } from './admin-api';

const money = (amount: number, currency: 'USD' | 'ARS'): string => new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
}).format(amount);

export const AdminPlansPage = (): ReactElement => {
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<AdminPlanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [displayPriceUsd, setDisplayPriceUsd] = useState('');
  const [billingPriceArs, setBillingPriceArs] = useState('');
  const [maxProfessionals, setMaxProfessionals] = useState('3');
  const [description, setDescription] = useState('');
  const [isRecommended, setIsRecommended] = useState(false);

  const title = useMemo(() => (editingId ? 'Editar plan' : 'Crear plan'), [editingId]);

  const resetForm = (): void => {
    setEditingId(null);
    setName('');
    setSlug('');
    setDisplayPriceUsd('');
    setBillingPriceArs('');
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
        displayPriceUsd: Number(displayPriceUsd),
        billingPriceArs: Number(billingPriceArs),
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
    setDisplayPriceUsd(String(item.displayPriceUsd));
    setBillingPriceArs(String(item.billingPriceArs));
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
      <Card title="Planes" subtitle="Gestioná el precio comercial visible en USD y el monto real de cobro en ARS para Mercado Pago.">
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
            Precio visible mensual (USD)
            <input type="number" min="0" step="0.01" value={displayPriceUsd} onChange={(event) => setDisplayPriceUsd(event.target.value)} required />
          </label>
          <label className="nx-field">
            Precio real de cobro mensual (ARS)
            <input type="number" min="0" step="0.01" value={billingPriceArs} onChange={(event) => setBillingPriceArs(event.target.value)} required />
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
                <th>Precio visible</th>
                <th>Cobro Mercado Pago</th>
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
                  <td>{money(item.displayPriceUsd, item.displayCurrency)}</td>
                  <td>{money(item.billingPriceArs, item.billingCurrency)}</td>
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
