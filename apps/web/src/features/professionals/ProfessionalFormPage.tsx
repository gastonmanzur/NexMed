import type { OrganizationMemberRole, SpecialtyDto } from '@starter/shared-types';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { specialtiesApi } from '../specialties/specialties-api';
import { professionalsApi } from './professionals-api';

const canManageByRole = (role: OrganizationMemberRole | undefined): boolean => role === 'owner' || role === 'admin';

export const ProfessionalFormPage = (): ReactElement => {
  const { professionalId } = useParams();
  const isEdit = Boolean(professionalId);
  const navigate = useNavigate();

  const { user, accessToken, activeOrganizationId, memberships } = useAuth();

  const membership = useMemo(
    () => memberships.find((item) => item.organizationId === activeOrganizationId) ?? null,
    [activeOrganizationId, memberships]
  );
  const canManage = canManageByRole(membership?.role);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'archived'>('active');
  const [specialties, setSpecialties] = useState<SpecialtyDto[]>([]);
  const [selectedSpecialtyIds, setSelectedSpecialtyIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken || !activeOrganizationId) {
      return;
    }

    void (async () => {
      try {
        setLoadingInitial(true);
        setError('');

        const [specialtiesData, professional] = await Promise.all([
          specialtiesApi.list(accessToken, activeOrganizationId),
          isEdit && professionalId ? professionalsApi.getById(accessToken, activeOrganizationId, professionalId) : Promise.resolve(null)
        ]);

        setSpecialties(specialtiesData);

        if (professional) {
          setFirstName(professional.firstName);
          setLastName(professional.lastName);
          setEmail(professional.email ?? '');
          setPhone(professional.phone ?? '');
          setLicenseNumber(professional.licenseNumber ?? '');
          setNotes(professional.notes ?? '');
          setStatus(professional.status);
          setSelectedSpecialtyIds(professional.specialties.map((specialty) => specialty.id));
        }
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setLoadingInitial(false);
      }
    })();
  }, [accessToken, activeOrganizationId, isEdit, professionalId]);

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
          <p>No tenés permisos para crear o editar profesionales.</p>
          <Link to="/app/professionals" className="nx-btn-secondary nx-entity-form-page__inline-link">
            Volver al listado
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="nx-page nx-entity-form-page">
      <Card
        title={isEdit ? 'Editar profesional' : 'Nuevo profesional'}
        subtitle="Completá los datos para crear o actualizar el perfil profesional dentro de tu organización."
        className="nx-entity-form-page__card"
      >
        {loadingInitial ? <p className="nx-entity-form-page__loading">Cargando...</p> : null}
        {!loadingInitial ? (
          <>
            <div className="nx-form-grid nx-form-grid--cols-2 nx-entity-form-page__grid">
              <label className="nx-field">
                <span>Nombre</span>
                <input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
              </label>
              <label className="nx-field">
                <span>Apellido</span>
                <input value={lastName} onChange={(event) => setLastName(event.target.value)} />
              </label>
              <label className="nx-field">
                <span>Email (opcional)</span>
                <input value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label className="nx-field">
                <span>Teléfono (opcional)</span>
                <input value={phone} onChange={(event) => setPhone(event.target.value)} />
              </label>
              <label className="nx-field nx-form-grid__full">
                <span>Matrícula/licencia (opcional)</span>
                <input value={licenseNumber} onChange={(event) => setLicenseNumber(event.target.value)} />
              </label>
              <label className="nx-field nx-form-grid__full">
                <span>Notas (opcional)</span>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} />
              </label>

              {isEdit ? (
                <label className="nx-field nx-form-grid__full">
                  <span>Estado</span>
                  <select id="professional-status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                    <option value="archived">Archivado</option>
                  </select>
                </label>
              ) : null}
            </div>

            <fieldset className="nx-entity-form-page__fieldset">
              <legend>Especialidades</legend>
              {specialties.length === 0 ? <p className="nx-entity-form-page__hint">No hay especialidades cargadas todavía.</p> : null}
              <div className="nx-entity-form-page__checkboxes">
                {specialties.map((specialty) => (
                  <label key={specialty.id} className="nx-checkbox-field nx-entity-form-page__checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedSpecialtyIds.includes(specialty.id)}
                      onChange={(event) => {
                        setSelectedSpecialtyIds((current) =>
                          event.target.checked ? [...current, specialty.id] : current.filter((item) => item !== specialty.id)
                        );
                      }}
                    />
                    <span>
                      {specialty.name} <small>({specialty.status})</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

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

                    if (!firstName.trim()) throw new Error('El nombre es obligatorio');
                    if (!lastName.trim()) throw new Error('El apellido es obligatorio');

                    const payload = {
                      firstName,
                      lastName,
                      ...(email.trim() ? { email } : {}),
                      ...(phone.trim() ? { phone } : {}),
                      ...(licenseNumber.trim() ? { licenseNumber } : {}),
                      ...(notes.trim() ? { notes } : {}),
                      specialtyIds: selectedSpecialtyIds,
                      ...(isEdit ? { status } : {})
                    };

                    if (isEdit && professionalId) {
                      await professionalsApi.update(accessToken, activeOrganizationId, professionalId, payload);
                    } else {
                      await professionalsApi.create(accessToken, activeOrganizationId, payload);
                    }

                    navigate('/app/professionals');
                  } catch (cause) {
                    setError((cause as Error).message);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {loading ? 'Guardando...' : isEdit ? 'Actualizar profesional' : 'Crear profesional'}
              </button>
              <Link to="/app/professionals" className="nx-btn-secondary">
                Cancelar
              </Link>
            </div>
          </>
        ) : null}
      </Card>
    </main>
  );
};
