import type { ProfessionalDto, OrganizationMemberRole } from '@starter/shared-types';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { professionalsApi } from './professionals-api';

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
          <Link to="/app">Volver al dashboard</Link>
          {canManage ? <Link to="/app/professionals/new">Nuevo profesional</Link> : null}
        </div>
        {!canManage ? <p style={{ color: '#555' }}>Tu rol es de solo lectura para este módulo.</p> : null}
      </Card>

      <Card title="Listado">
        {loading ? <p>Cargando profesionales...</p> : null}
        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
        {!loading && !error && professionals.length === 0 ? (
          <>
            <p>Aún no hay profesionales cargados.</p>
            {canManage ? <Link to="/app/professionals/new">Crear primer profesional</Link> : null}
          </>
        ) : null}

        {!loading && !error && professionals.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' }}>
            {professionals.map((professional) => (
              <li key={professional.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: '0.75rem' }}>
                <p style={{ margin: 0 }}>
                  <strong>{professional.displayName}</strong> · estado: <strong>{professional.status}</strong>
                </p>
                <p style={{ margin: '0.35rem 0' }}>
                  Contacto: {professional.email ?? '-'} / {professional.phone ?? '-'}
                </p>
                <p style={{ margin: '0.35rem 0' }}>
                  Especialidades:{' '}
                  {professional.specialties.length > 0
                    ? professional.specialties.map((specialty) => specialty.name).join(', ')
                    : 'Sin especialidades asociadas'}
                </p>
                {canManage ? (
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Link to={`/app/professionals/${professional.id}/edit`}>Editar</Link>
                    <button
                      type="button"
                      onClick={async () => {
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
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </main>
  );
};
