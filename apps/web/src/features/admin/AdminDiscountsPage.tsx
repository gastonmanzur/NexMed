import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { adminApi, type AdminDiscountItem } from './admin-api';

const valueLabel = (item: AdminDiscountItem): string => {
  if (item.discountType === 'percentage') return `${item.discountValue}%`;
  return `${item.discountValue} ${item.currency ?? ''}`.trim();
};

const rangeLabel = (item: AdminDiscountItem): string => {
  if (!item.startsAt && !item.endsAt) return 'Sin vencimiento';
  const from = item.startsAt ? new Date(item.startsAt).toLocaleDateString('es-AR') : 'Desde ahora';
  const to = item.endsAt ? new Date(item.endsAt).toLocaleDateString('es-AR') : 'Sin fin';
  return `${from} → ${to}`;
};

export const AdminDiscountsPage = (): ReactElement => {
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<AdminDiscountItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async (): Promise<void> => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      setRows(await adminApi.listDiscounts(accessToken));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [accessToken]);

  const toggleActive = async (item: AdminDiscountItem): Promise<void> => {
    if (!accessToken) return;
    try {
      await adminApi.updateDiscount(accessToken, item.id, { isActive: !item.isActive });
      await load();
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  return (
    <main className="nx-page">
      <Card title="Descuentos" subtitle="Cupones y promociones básicas para nuevas suscripciones.">
        <div className="nx-actions-row">
          <p style={{ margin: 0, color: '#5f6c80' }}>Los admins globales internos no aplican descuentos para sí mismos.</p>
          <Link className="nx-btn" to="/admin/discounts/new">Nuevo descuento</Link>
        </div>
        {error ? <p className="nx-state nx-state--error" style={{ marginTop: '0.75rem' }}>{error}</p> : null}
      </Card>

      <Card title="Listado de descuentos">
        {loading ? <p>Cargando descuentos...</p> : null}
        <div className="nx-table-wrap">
          <table className="nx-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Vigencia</th>
                <th>Usos</th>
                <th>Estado</th>
                <th>Alcance</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.code}</strong></td>
                  <td>{item.discountType}</td>
                  <td>{valueLabel(item)}</td>
                  <td>{rangeLabel(item)}</td>
                  <td>{item.redemptionCount} / {item.maxRedemptions ?? '∞'}</td>
                  <td><span className={item.isActive ? 'nx-badge' : 'nx-badge nx-badge--danger'}>{item.isActive ? 'Activo' : 'Inactivo'}</span></td>
                  <td>{item.appliesToPlanIds.length > 0 ? `${item.appliesToPlanIds.length} plan(es)` : 'Todos los planes'}</td>
                  <td className="nx-table-cell-actions">
                    <Link className="nx-btn-secondary" to={`/admin/discounts/${item.id}`}>Editar</Link>
                    <button className="nx-btn-secondary" onClick={() => void toggleActive(item)}>{item.isActive ? 'Desactivar' : 'Activar'}</button>
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
