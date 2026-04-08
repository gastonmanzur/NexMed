import type { OrganizationMemberRole, SpecialtyDto } from '@starter/shared-types';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { specialtiesApi } from './specialties-api';

const containerStyle = { maxWidth: 980, margin: '2rem auto', padding: '1rem', display: 'grid', gap: '1rem' };

const canManageByRole = (role: OrganizationMemberRole | undefined): boolean => role === 'owner' || role === 'admin';

export const SpecialtiesListPage = (): ReactElement => {
  const { user, accessToken, activeOrganizationId, memberships } = useAuth();
  const [specialties, setSpecialties] = useState<SpecialtyDto[]>([]);
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
        const data = await specialtiesApi.list(accessToken, activeOrganizationId);
        setSpecialties(data);
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
      <Card title="Especialidades">
        <p>Gestioná el catálogo de especialidades y servicios del centro.</p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link className="nx-btn" to="/app">Volver al inicio</Link>
          {canManage ? <Link className="nx-btn" to="/app/specialties/new">Nueva especialidad</Link> : null}
        </div>
      </Card>

      <Card title="Lista de especialidades">
        {loading ? <p>Cargando especialidades...</p> : null}
        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
        {!loading && !error && specialties.length === 0 ? (
          <>
            <p>Aún no hay especialidades cargadas.</p>
            {canManage ? <Link to="/app/specialties/new">Crear primera especialidad</Link> : null}
          </>
        ) : null}

        {!loading && !error && specialties.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' }}>
            {specialties.map((specialty) => (
              <li key={specialty.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: '0.75rem' }}>
                <p style={{ margin: 0 }}>
                  <strong>{specialty.name}</strong> · estado: <strong>{specialty.status}</strong>
                </p>
                <p style={{ margin: '0.35rem 0' }}>Descripción: {specialty.description ?? '-'}</p>
                <p style={{ margin: '0.35rem 0' }}>Profesionales asociados: {specialty.professionalCount}</p>

                {canManage ? (
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Link className="nx-btn-secondary" to={`/app/specialties/${specialty.id}/edit`}>Editar</Link>
                    <button
                      className={specialty.status === 'active' ? 'nx-btn-danger' : 'nx-btn-secondary'}
                      type="button"
                      onClick={async () => {
                        if (!accessToken) return;

                        const nextStatus = specialty.status === 'active' ? 'inactive' : 'active';
                        try {
                          const updated = await specialtiesApi.updateStatus(
                            accessToken,
                            activeOrganizationId,
                            specialty.id,
                            nextStatus
                          );
                          setSpecialties((current) =>
                            current.map((item) => (item.id === specialty.id ? updated : item))
                          );
                        } catch (cause) {
                          setError((cause as Error).message);
                        }
                      }}
                    >
                      {specialty.status === 'active' ? 'Desactivar' : 'Activar'}
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
