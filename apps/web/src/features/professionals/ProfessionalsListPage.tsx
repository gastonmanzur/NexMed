import type { ProfessionalDto, OrganizationMemberRole } from '@starter/shared-types';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { professionalsApi } from './professionals-api';
import { ConfirmActionButton } from '../../components/ConfirmActionButton';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncState';

const containerStyle = { maxWidth: 980, margin: '2rem auto', padding: '1rem', display: 'grid', gap: '1rem' };

const canManageByRole = (role: OrganizationMemberRole | undefined): boolean => role === 'owner' || role === 'admin';

export const ProfessionalsListPage = (): ReactElement => {
  const { user, accessToken, activeOrganizationId, memberships } = useAuth();
  const [professionals, setProfessionals] = useState<ProfessionalDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const membership = useMemo(
    () => memberships.find((item) => item.organizationId === activeOrganizationId) ?? null,
    [activeOrganizationId, memberships]
  );
  const canManage = canManageByRole(membership?.role);

  useEffect(() => {
    if (!accessToken || !activeOrganizationId) {
      return;
    }

    void (async () => {
      try {
        setLoading(true);
        setError('');
        const data = await professionalsApi.list(accessToken, activeOrganizationId);
        setProfessionals(data);
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken, activeOrganizationId]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!activeOrganizationId) {
    return <Navigate to="/post-login" replace />;
  }

  return (
    <main style={containerStyle}>
      <Card title="Profesionales">
        <p>Gestioná el equipo operativo del centro.</p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link className="nx-btn-secondary" to="/app">Volver al inicio</Link>
          {canManage ? <Link className="nx-btn" to="/app/professionals/new">Nuevo profesional</Link> : null}
        </div>
        {!canManage ? <p style={{ color: '#555' }}>Tu rol es de solo lectura para este módulo.</p> : null}
      </Card>

      <Card title="Lista de profecionales">
        {loading ? <LoadingState message="Cargando profesionales..." /> : null}
        {error ? <ErrorState message={error} /> : null}
        {!loading && !error && professionals.length === 0 ? (
          <EmptyState
            title="Aún no hay profesionales cargados"
            description="Cuando incorpores el equipo operativo, aparecerá en este listado."
            {...(canManage ? { action: <Link to="/app/professionals/new">Crear primer profesional</Link> } : {})}
          />
        ) : null}

        {!loading && !error && professionals.length > 0 ? (
          <ul className="nx-doctor-list">
            {professionals.map((professional) => (
              <li key={professional.id} className="nx-doctor-card">
                <p style={{ margin: 0 }}>
                  <strong>{professional.displayName}</strong> · estado:{' '}
                  <span className="nx-badge">{professional.status}</span>
                </p>
                <p className="nx-doctor-card__description">
                  Contacto: {professional.email ?? '-'} / {professional.phone ?? '-'}
                </p>
                <p className="nx-doctor-card__description">
                  Especialidades:{' '}
                  {professional.specialties.length > 0
                    ? professional.specialties.map((specialty) => specialty.name).join(', ')
                    : 'Sin especialidades asociadas'}
                </p>
                <div className="nx-doctor-card__actions">
                  <Link className="nx-btn-secondary" to={`/app/professionals/${professional.id}/availability`}>Agenda</Link>
                  {canManage ? <Link className="nx-btn-secondary" to={`/app/professionals/${professional.id}/edit`}>Editar</Link> : null}
                  {canManage ? (
                    <ConfirmActionButton
                      confirmationMessage={`¿Seguro que querés ${professional.status === 'active' ? 'desactivar' : 'activar'} este profesional?`}
                      onConfirm={async () => {
                        if (!accessToken) return;
                        const nextStatus = professional.status === 'active' ? 'inactive' : 'active';
                        try {
                          const updated = await professionalsApi.updateStatus(
                            accessToken,
                            activeOrganizationId,
                            professional.id,
                            nextStatus
                          );
                          setProfessionals((current) =>
                            current.map((item) => (item.id === professional.id ? updated : item))
                          );
                        } catch (cause) {
                          setError((cause as Error).message);
                        }
                      }}
                    >
                      {professional.status === 'active' ? 'Desactivar' : 'Activar'}
                    </ConfirmActionButton>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </main>
  );
};
