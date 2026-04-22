import type { FormEvent, ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { adminApi, type AdminDiscountItem, type AdminPlanItem } from './admin-api';

export const AdminDiscountDetailPage = (): ReactElement => {
  const { accessToken } = useAuth();
  const { discountId = '' } = useParams();

  const [plans, setPlans] = useState<AdminPlanItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [currency, setCurrency] = useState('ARS');
  const [appliesToPlanIds, setAppliesToPlanIds] = useState<string[]>([]);
  const [onlyForNewOrganizations, setOnlyForNewOrganizations] = useState(false);
  const [onlyDuringTrial, setOnlyDuringTrial] = useState(false);
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [maxRedemptionsPerOrganization, setMaxRedemptionsPerOrganization] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [isActive, setIsActive] = useState(true);

  const hydrate = (item: AdminDiscountItem): void => {
    setCode(item.code);
    setDiscountType(item.discountType);
    setDiscountValue(String(item.discountValue));
    setCurrency(item.currency ?? 'ARS');
    setAppliesToPlanIds(item.appliesToPlanIds ?? []);
    setOnlyForNewOrganizations(item.onlyForNewOrganizations);
    setOnlyDuringTrial(item.onlyDuringTrial);
    setMaxRedemptions(item.maxRedemptions ? String(item.maxRedemptions) : '');
    setMaxRedemptionsPerOrganization(item.maxRedemptionsPerOrganization ? String(item.maxRedemptionsPerOrganization) : '');
    setStartsAt(item.startsAt ? item.startsAt.slice(0, 10) : '');
    setEndsAt(item.endsAt ? item.endsAt.slice(0, 10) : '');
    setIsActive(item.isActive);
  };

  useEffect(() => {
    if (!accessToken || !discountId) return;
    const load = async (): Promise<void> => {
      setLoaded(false);
      setError('');
      try {
        const [discount, planRows] = await Promise.all([
          adminApi.getDiscount(accessToken, discountId),
          adminApi.listPlans(accessToken)
        ]);
        hydrate(discount);
        setPlans(planRows);
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setLoaded(true);
      }
    };

    void load();
  }, [accessToken, discountId]);

  const togglePlan = (planId: string): void => {
    setAppliesToPlanIds((current) =>
      current.includes(planId) ? current.filter((value) => value !== planId) : [...current, planId]
    );
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!accessToken || !discountId || saving) return;

    setSaving(true);
    setError('');
    try {
      await adminApi.updateDiscount(accessToken, discountId, {
        code,
        discountType,
        discountValue: Number(discountValue),
        currency: discountType === 'fixed' ? currency : null,
        appliesToPlanIds,
        onlyForNewOrganizations,
        onlyDuringTrial,
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
        maxRedemptionsPerOrganization: maxRedemptionsPerOrganization ? Number(maxRedemptionsPerOrganization) : null,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        isActive
      });
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="nx-page">
      <Card title="Editar descuento" subtitle="Ajustá reglas promocionales y estado del cupón.">
        {!loaded ? <p>Cargando descuento...</p> : null}
        {loaded ? (
          <form className="nx-form-grid nx-form-grid--cols-2" onSubmit={(event) => void onSubmit(event)}>
            <label className="nx-field">
              Código
              <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} required />
            </label>
            <label className="nx-field">
              Tipo
              <select value={discountType} onChange={(event) => setDiscountType(event.target.value as 'percentage' | 'fixed')}>
                <option value="percentage">Porcentaje</option>
                <option value="fixed">Monto fijo</option>
              </select>
            </label>
            <label className="nx-field">
              Valor
              <input type="number" min="0" value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} required />
            </label>
            {discountType === 'fixed' ? (
              <label className="nx-field">
                Moneda
                <input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} required />
              </label>
            ) : null}
            <label className="nx-field">
              Máximas redenciones
              <input type="number" min="1" value={maxRedemptions} onChange={(event) => setMaxRedemptions(event.target.value)} placeholder="Sin límite" />
            </label>
            <label className="nx-field">
              Máx. redenciones por organización
              <input type="number" min="1" value={maxRedemptionsPerOrganization} onChange={(event) => setMaxRedemptionsPerOrganization(event.target.value)} />
            </label>
            <label className="nx-field">
              Inicio
              <input type="date" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
            </label>
            <label className="nx-field">
              Fin
              <input type="date" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
            </label>

            <div className="nx-field nx-form-grid__full">
              Alcance por plan (vacío = todos)
              <div className="nx-chip-group">
                {plans.map((plan) => (
                  <label key={plan.id} className="nx-badge" style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                    <input type="checkbox" checked={appliesToPlanIds.includes(plan.id)} onChange={() => togglePlan(plan.id)} />
                    {plan.name}
                  </label>
                ))}
              </div>
            </div>

            <label className="nx-field nx-checkbox-field">
              <input type="checkbox" checked={onlyForNewOrganizations} onChange={(event) => setOnlyForNewOrganizations(event.target.checked)} />
              Solo organizaciones nuevas
            </label>
            <label className="nx-field nx-checkbox-field">
              <input type="checkbox" checked={onlyDuringTrial} onChange={(event) => setOnlyDuringTrial(event.target.checked)} />
              Solo durante trial
            </label>
            <label className="nx-field nx-checkbox-field">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
              Activo
            </label>

            <div className="nx-form-actions">
              <button className="nx-btn" type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
              <Link className="nx-btn-secondary" to="/admin/discounts">Volver</Link>
            </div>
          </form>
        ) : null}
        {error ? <p className="nx-state nx-state--error" style={{ marginTop: '0.75rem' }}>{error}</p> : null}
      </Card>
    </main>
  );
};
