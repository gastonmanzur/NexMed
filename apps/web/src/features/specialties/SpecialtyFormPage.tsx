import type { OrganizationMemberRole } from '@starter/shared-types';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { specialtiesApi } from './specialties-api';

const containerStyle = { maxWidth: 780, margin: '2rem auto', padding: '1rem', display: 'grid', gap: '1rem' };

const canManageByRole = (role: OrganizationMemberRole | undefined): boolean => role === 'owner' || role === 'admin';

export const SpecialtyFormPage = (): ReactElement => {
  const { specialtyId } = useParams();
  const isEdit = Boolean(specialtyId);
  const navigate = useNavigate();

  const { user, accessToken, activeOrganizationId, memberships } = useAuth();

  const membership = useMemo(
    () => memberships.find((item) => item.organizationId === activeOrganizationId) ?? null,
    [activeOrganizationId, memberships]
  );
  const canManage = canManageByRole(membership?.role);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'archived'>('active');
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit || !accessToken || !activeOrganizationId || !specialtyId) {
      setLoadingInitial(false);
      return;
    }

    void (async () => {
      try {
        setLoadingInitial(true);
        setError('');
        const specialty = await specialtiesApi.getById(accessToken, activeOrganizationId, specialtyId);
        setName(specialty.name);
        setDescription(specialty.description ?? '');
        setStatus(specialty.status);
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setLoadingInitial(false);
      }
    })();
  }, [accessToken, activeOrganizationId, isEdit, specialtyId]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!activeOrganizationId) {
    return <Navigate to="/post-login" replace />;
  }

  if (!canManage) {
    return (
      <main style={containerStyle}>
        <Card title="Sin permisos">
          <p>No tenés permisos para crear o editar especialidades.</p>
          <Link to="/app/specialties">Volver al listado</Link>
        </Card>
      </main>
    );
  }

  return (
    <main style={containerStyle}>
      <Card title={isEdit ? 'Editar especialidad' : 'Nueva especialidad'}>
        {loadingInitial ? <p>Cargando...</p> : null}
        {!loadingInitial ? (
          <>
            <input placeholder="Nombre" value={name} onChange={(event) => setName(event.target.value)} />
            <textarea
              placeholder="Descripción (opcional)"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
            />

            <label htmlFor="specialty-status">Estado</label>
            <select id="specialty-status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="archived">Archivado</option>
            </select>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  if (!accessToken) return;

                  try {
                    setLoading(true);
                    setError('');

                    if (!name.trim()) throw new Error('El nombre es obligatorio');

                    const payload = {
                      name,
                      ...(description.trim() ? { description } : {}),
                      ...(isEdit ? { status } : {})
                    };

                    if (isEdit && specialtyId) {
                      await specialtiesApi.update(accessToken, activeOrganizationId, specialtyId, payload);
                    } else {
                      await specialtiesApi.create(accessToken, activeOrganizationId, payload);
                    }

                    navigate('/app/specialties');
                  } catch (cause) {
                    setError((cause as Error).message);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
              <Link to="/app/specialties">Cancelar</Link>
            </div>
          </>
        ) : null}

        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
      </Card>
    </main>
  );
};
