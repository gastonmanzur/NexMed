import type { AvailabilityReleaseMode, OrganizationMemberRole, SpecialtyDto } from '@starter/shared-types';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { resolveAvatarUrl } from '../../lib/resolve-avatar-url';
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
  const [availabilityReleaseMode, setAvailabilityReleaseMode] = useState<AvailabilityReleaseMode>('free');
  const [availabilityReleaseLimit, setAvailabilityReleaseLimit] = useState('3');
  const [specialties, setSpecialties] = useState<SpecialtyDto[]>([]);
  const [selectedSpecialtyIds, setSelectedSpecialtyIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);

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
          setAvailabilityReleaseMode(professional.availabilityReleaseMode);
          setAvailabilityReleaseLimit(String(professional.availabilityReleaseLimit ?? 3));
          setSelectedSpecialtyIds(professional.specialties.map((specialty) => specialty.id));
          setAvatarPreview(professional.avatarUrl ? resolveAvatarUrl(professional.avatarUrl) : null);
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



            <fieldset className="nx-entity-form-page__fieldset">
              <legend>Modo de habilitación de turnos</legend>
              <p className="nx-entity-form-page__hint">
                En agenda progresiva, los pacientes solo podrán elegir los primeros turnos disponibles del día. Cuando esos turnos se reserven, se habilitarán los siguientes.
              </p>
              <div className="nx-entity-form-page__checkboxes">
                <label className="nx-checkbox-field nx-entity-form-page__checkbox-item">
                  <input
                    type="radio"
                    name="availabilityReleaseMode"
                    value="free"
                    checked={availabilityReleaseMode === 'free'}
                    onChange={() => setAvailabilityReleaseMode('free')}
                  />
                  <span>Agenda libre</span>
                </label>
                <label className="nx-checkbox-field nx-entity-form-page__checkbox-item">
                  <input
                    type="radio"
                    name="availabilityReleaseMode"
                    value="progressive"
                    checked={availabilityReleaseMode === 'progressive'}
                    onChange={() => setAvailabilityReleaseMode('progressive')}
                  />
                  <span>Habilitar turnos progresivamente</span>
                </label>
              </div>
              {availabilityReleaseMode === 'progressive' ? (
                <label className="nx-field" style={{ marginTop: '0.75rem' }}>
                  <span>Cantidad de turnos habilitados por día</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    step={1}
                    value={availabilityReleaseLimit}
                    onChange={(event) => setAvailabilityReleaseLimit(event.target.value)}
                  />
                </label>
              ) : null}
            </fieldset>

            <fieldset className="nx-entity-form-page__fieldset">
              <legend>Foto del profesional</legend>
              <div className="nx-professional-avatar-upload">
                {avatarPreview && !removeAvatar ? (
                  <img src={avatarPreview} alt="Avatar profesional" className="nx-avatar nx-professional-avatar-upload__preview" />
                ) : (
                  <span className="nx-avatar nx-avatar--fallback nx-professional-avatar-upload__preview">{`${firstName.charAt(0)}${lastName.charAt(0)}`.trim() || 'PR'}</span>
                )}
                <div className="nx-professional-avatar-upload__content">
                  <div className="nx-professional-avatar-upload__actions">
                    <input
                      id="professional-photo-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      ref={avatarInputRef}
                      className="nx-sr-only nx-professional-avatar-upload__input"
                      disabled={loading}
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        setAvatarFile(file);
                        setRemoveAvatar(false);
                        setAvatarPreview(file ? URL.createObjectURL(file) : avatarPreview);
                      }}
                    />
                    <label
                      htmlFor="professional-photo-input"
                      className={`nx-professional-avatar-upload__button${loading ? ' nx-professional-avatar-upload__button--disabled' : ''}`}
                      aria-disabled={loading}
                    >
                      {avatarFile || (avatarPreview && !removeAvatar) ? 'Cambiar foto' : 'Subir foto'}
                    </label>
                    {avatarFile || (avatarPreview && !removeAvatar) ? (
                      <button
                        type="button"
                        className="nx-professional-avatar-upload__remove"
                        disabled={loading}
                        onClick={() => {
                          setAvatarFile(null);
                          setRemoveAvatar(true);
                          setAvatarPreview(null);
                          if (avatarInputRef.current) {
                            avatarInputRef.current.value = '';
                          }
                        }}
                      >
                        Quitar foto
                      </button>
                    ) : null}
                  </div>
                  <p className="nx-professional-avatar-upload__filename" aria-live="polite">
                    {avatarFile?.name ?? (avatarPreview && !removeAvatar ? 'Foto actual del profesional' : 'Ningún archivo seleccionado')}
                  </p>
                  <p className="nx-professional-avatar-upload__hint">JPG, PNG o WEBP. Tamaño recomendado: imagen cuadrada.</p>
                </div>
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
                    const parsedAvailabilityReleaseLimit = Number(availabilityReleaseLimit);
                    if (availabilityReleaseMode === 'progressive' && (!Number.isInteger(parsedAvailabilityReleaseLimit) || parsedAvailabilityReleaseLimit < 1 || parsedAvailabilityReleaseLimit > 20)) {
                      throw new Error('La cantidad de turnos habilitados por día debe ser un entero entre 1 y 20.');
                    }

                    const payload = {
                      firstName,
                      lastName,
                      ...(email.trim() ? { email } : {}),
                      ...(phone.trim() ? { phone } : {}),
                      ...(licenseNumber.trim() ? { licenseNumber } : {}),
                      ...(notes.trim() ? { notes } : {}),
                      specialtyIds: selectedSpecialtyIds,
                      availabilityReleaseMode,
                      availabilityReleaseLimit: availabilityReleaseMode === 'progressive' ? parsedAvailabilityReleaseLimit : null,
                      ...(isEdit ? { status } : {})
                    };

                    let savedId = professionalId;
                    if (isEdit && professionalId) {
                      const updated = await professionalsApi.update(accessToken, activeOrganizationId, professionalId, payload);
                      savedId = updated.id;
                    } else {
                      const created = await professionalsApi.create(accessToken, activeOrganizationId, payload);
                      savedId = created.id;
                    }
                    if (savedId && avatarFile) {
                      await professionalsApi.uploadAvatar(accessToken, activeOrganizationId, savedId, avatarFile);
                    }
                    if (savedId && removeAvatar) {
                      await professionalsApi.deleteAvatar(accessToken, activeOrganizationId, savedId);
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
