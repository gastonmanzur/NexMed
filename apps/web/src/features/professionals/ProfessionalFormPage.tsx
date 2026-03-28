import type { OrganizationMemberRole, SpecialtyDto } from '@starter/shared-types';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { specialtiesApi } from '../specialties/specialties-api';
import { professionalsApi } from './professionals-api';

const containerStyle = { maxWidth: 780, margin: '2rem auto', padding: '1rem', display: 'grid', gap: '1rem' };

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
      <main style={containerStyle}>
        <Card title="Sin permisos">
          <p>No tenés permisos para crear o editar profesionales.</p>
          <Link to="/app/professionals">Volver al listado</Link>
        </Card>
      </main>
    );
  }

  return (
    <main style={containerStyle}>
      <Card title={isEdit ? 'Editar profesional' : 'Nuevo profesional'}>
        {loadingInitial ? <p>Cargando...</p> : null}
        {!loadingInitial ? (
          <>
            <input placeholder="Nombre" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
            <input placeholder="Apellido" value={lastName} onChange={(event) => setLastName(event.target.value)} />
            <input placeholder="Email (opcional)" value={email} onChange={(event) => setEmail(event.target.value)} />
            <input placeholder="Teléfono (opcional)" value={phone} onChange={(event) => setPhone(event.target.value)} />
            <input
              placeholder="Matrícula/licencia (opcional)"
              value={licenseNumber}
              onChange={(event) => setLicenseNumber(event.target.value)}
            />
            <textarea placeholder="Notas (opcional)" value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} />

            <label htmlFor="professional-status">Estado</label>
            <select id="professional-status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="archived">Archivado</option>
            </select>

            <fieldset style={{ border: '1px solid #ddd', borderRadius: 8, padding: '0.75rem' }}>
              <legend>Especialidades</legend>
              {specialties.length === 0 ? <p>No hay especialidades cargadas todavía.</p> : null}
              {specialties.map((specialty) => (
                <label key={specialty.id} style={{ display: 'block' }}>
                  <input
                    type="checkbox"
                    checked={selectedSpecialtyIds.includes(specialty.id)}
                    onChange={(event) => {
                      setSelectedSpecialtyIds((current) =>
                        event.target.checked ? [...current, specialty.id] : current.filter((item) => item !== specialty.id)
                      );
                    }}
                  />{' '}
                  {specialty.name} ({specialty.status})
                </label>
              ))}
            </fieldset>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
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
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
              <Link to="/app/professionals">Cancelar</Link>
            </div>
          </>
        ) : null}

        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
      </Card>
    </main>
  );
};
