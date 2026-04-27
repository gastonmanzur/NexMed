import type { OrganizationMemberRole } from '@starter/shared-types';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { specialtiesApi } from './specialties-api';

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
      <main className="nx-page nx-entity-form-page">
        <Card title="Sin permisos" className="nx-entity-form-page__card">
          <p>No tenés permisos para crear o editar especialidades.</p>
          <Link to="/app/specialties" className="nx-btn-secondary nx-entity-form-page__inline-link">
            Volver al listado
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="nx-page nx-entity-form-page">
      <Card
        title={isEdit ? 'Editar especialidad' : 'Nueva especialidad'}
        subtitle="Definí una especialidad para organizar profesionales y facilitar la gestión de turnos."
        className="nx-entity-form-page__card"
      >
        {loadingInitial ? <p className="nx-entity-form-page__loading">Cargando...</p> : null}
        {!loadingInitial ? (
          <>
            <div className="nx-form-grid nx-entity-form-page__grid">
              <label className="nx-field">
                <span>Nombre</span>
                <input value={name} onChange={(event) => setName(event.target.value)} />
              </label>

              <label className="nx-field">
                <span>Descripción (opcional)</span>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} />
              </label>

              {isEdit ? (
                <label className="nx-field">
                  <span>Estado</span>
                  <select id="specialty-status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                    <option value="archived">Archivado</option>
                  </select>
                </label>
              ) : null}
            </div>

            {error ? <p className="nx-entity-form-page__error">{error}</p> : null}

            <div className="nx-form-actions nx-entity-form-page__actions">
              <button
                type="button"
                className="nx-btn"
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
                {loading ? 'Guardando...' : isEdit ? 'Actualizar especialidad' : 'Crear especialidad'}
              </button>
              <Link to="/app/specialties" className="nx-btn-secondary">
                Cancelar
              </Link>
            </div>
          </>
        ) : null}
      </Card>
    </main>
  );
};
