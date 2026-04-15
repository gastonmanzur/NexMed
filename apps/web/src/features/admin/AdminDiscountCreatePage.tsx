import type { FormEvent, ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { adminApi, type AdminPlanItem } from './admin-api';

export const AdminDiscountCreatePage = (): ReactElement => {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<AdminPlanItem[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('10');
  const [currency, setCurrency] = useState('ARS');
  const [appliesToPlanIds, setAppliesToPlanIds] = useState<string[]>([]);
  const [onlyForNewOrganizations, setOnlyForNewOrganizations] = useState(true);
  const [onlyDuringTrial, setOnlyDuringTrial] = useState(false);
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [maxRedemptionsPerOrganization, setMaxRedemptionsPerOrganization] = useState('1');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    void adminApi.listPlans(accessToken).then(setPlans).catch((cause) => setError((cause as Error).message));
  }, [accessToken]);

  const togglePlan = (planId: string): void => {
    setAppliesToPlanIds((current) =>
      current.includes(planId) ? current.filter((value) => value !== planId) : [...current, planId]
    );
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!accessToken || saving) return;

    setSaving(true);
    setError('');
    try {
      await adminApi.createDiscount(accessToken, {
        code,
        discountType,
        discountValue: Number(discountValue),
        ...(discountType === 'fixed' ? { currency } : {}),
        ...(appliesToPlanIds.length > 0 ? { appliesToPlanIds } : {}),
        onlyForNewOrganizations,
        onlyDuringTrial,
        ...(maxRedemptions ? { maxRedemptions: Number(maxRedemptions) } : {}),
        ...(maxRedemptionsPerOrganization
          ? { maxRedemptionsPerOrganization: Number(maxRedemptionsPerOrganization) }
          : {}),
        ...(startsAt ? { startsAt } : {}),
        ...(endsAt ? { endsAt } : {}),
        isActive
      });

      navigate('/admin/discounts');
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="nx-page">
      <Card title="Nuevo descuento" subtitle="Creá un cupón con reglas básicas para trial y organizaciones nuevas.">
        <form className="nx-form-grid" onSubmit={(event) => void onSubmit(event)} style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
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
            Máximas redenciones por organización
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
          <div className="nx-field" style={{ gridColumn: '1 / -1' }}>
            Alcance por plan (vacío = todos)
            <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
              {plans.map((plan) => (
                <label key={plan.id} className="nx-badge" style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                  <input type="checkbox" checked={appliesToPlanIds.includes(plan.id)} onChange={() => togglePlan(plan.id)} />
                  {plan.name}
                </label>
              ))}
            </div>
          </div>

          <label className="nx-field" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={onlyForNewOrganizations} onChange={(event) => setOnlyForNewOrganizations(event.target.checked)} />
            Solo organizaciones nuevas
          </label>
          <label className="nx-field" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={onlyDuringTrial} onChange={(event) => setOnlyDuringTrial(event.target.checked)} />
            Solo durante trial
          </label>
          <label className="nx-field" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            Activo
          </label>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="nx-btn" type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Crear descuento'}</button>
            <Link className="nx-btn-secondary" to="/admin/discounts">Cancelar</Link>
          </div>
        </form>
        {error ? <p className="nx-state nx-state--error" style={{ marginTop: '0.75rem' }}>{error}</p> : null}
      </Card>
    </main>
  );
};
