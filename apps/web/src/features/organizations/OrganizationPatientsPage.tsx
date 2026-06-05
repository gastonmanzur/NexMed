import type { OrganizationPatientDetailDto, OrganizationPatientListItemDto } from '@starter/shared-types';
import type { ReactElement } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiRequestError, organizationApi } from './organization-api';

const fullName = (p: { firstName: string | null; lastName: string | null }): string => `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || 'Paciente sin nombre';

export const OrganizationPatientsPage = (): ReactElement => {
  const { user, accessToken, activeOrganizationId } = useAuth();
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<OrganizationPatientListItemDto[]>([]);
  const [selected, setSelected] = useState<OrganizationPatientDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [diagnostic, setDiagnostic] = useState('');
  const modalTitleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const buildDiagnosticMessage = (error: unknown): string => {
    if (error instanceof ApiRequestError) {
      if (error.status === 401) return `Diagnóstico: 401 no autorizado. URL: ${error.url}`;
      if (error.status === 403) return `Diagnóstico: 403 sin permisos para la organización activa. URL: ${error.url}`;
      if (error.status === 404) return `Diagnóstico: 404 endpoint no encontrado. Verificar prefijo /api. URL: ${error.url}`;
      if (error.status >= 500) return `Diagnóstico: ${error.status} error interno del backend. URL: ${error.url}`;
      return `Diagnóstico: ${error.status} en ${error.url}`;
    }
    return 'Diagnóstico: error inesperado de red o parseo.';
  };

  const load = async (): Promise<void> => {
    if (!activeOrganizationId) {
      setDiagnostic('Diagnóstico: no hay organización activa.');
      setRows([]);
      setLoading(false);
      return;
    }
    if (!accessToken) {
      setDiagnostic('Diagnóstico: no hay accessToken.');
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true); setError('');
    setDiagnostic('');
    try {
      const data = await organizationApi.listPatients(accessToken, activeOrganizationId, search);
      setRows(data);
      if (data.length === 0) {
        setDiagnostic('Diagnóstico: respuesta 200 OK con array vacío (sin pacientes vinculados para esa organización/filtro).');
      }
    } catch (e) {
      console.error('OrganizationPatientsPage.listPatients failed', e);
      setError((e as Error).message);
      setDiagnostic(buildDiagnosticMessage(e));
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [accessToken, activeOrganizationId, search]);
  const selectPatient = async (patientProfileId: string) => {
    if (!accessToken || !activeOrganizationId) return;
    setLoadingDetail(true); setDetailError('');
    try { setSelected(await organizationApi.getPatientDetail(accessToken, activeOrganizationId, patientProfileId)); } catch (e) { setDetailError((e as Error).message); } finally { setLoadingDetail(false); }
  };
  const closePatientModal = (): void => setSelected(null);

  useEffect(() => {
    if (!selected) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') closePatientModal();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selected]);

  const initials = useMemo(() => selected ? `${selected.patientProfile.firstName?.[0] ?? ''}${selected.patientProfile.lastName?.[0] ?? ''}`.toUpperCase() || 'P' : 'P', [selected]);
  const address = selected ? [selected.patientProfile.address, selected.patientProfile.city, selected.patientProfile.province].filter(Boolean).join(', ') : '';
  const patientModal = selected ? createPortal(<div className="nx-patient-modal" role="dialog" aria-modal="true" aria-labelledby={modalTitleId}>
    <button className="nx-patient-modal__overlay" type="button" aria-label="Cerrar detalle del paciente" onClick={closePatientModal} />
    <div className="nx-patient-modal__content">
      <button ref={closeButtonRef} className="nx-patient-modal__close" type="button" aria-label="Cerrar detalle del paciente" onClick={closePatientModal}>Cerrar</button>
      <header className="nx-patient-modal__header"><span className="nx-patient-avatar nx-patient-avatar--large">{initials}</span><div><h2 id={modalTitleId}>{fullName(selected.patientProfile)}</h2>{selected.patientProfile.relationshipToOwner ? <p className="nx-muted">{selected.patientProfile.relationshipToOwner} · Responsable de cuenta: {selected.ownerName ?? '—'}</p> : null}</div></header>
      {loadingDetail ? <p className="nx-patients-status">Cargando detalle...</p> : detailError ? <p className="nx-patients-status nx-patients-status--error">{detailError}</p> : <section className="nx-patient-modal__grid">
        <article className="nx-patient-block"><h3>Datos personales</h3><p><span>Tipo de perfil</span>{selected.patientProfile.isPrimaryProfile ? 'Titular' : 'Familiar'}</p><p><span>Relación con titular</span>{selected.patientProfile.relationshipToOwner ?? '—'}</p><p><span>Documento</span>{selected.patientProfile.documentId ?? '—'}</p><p><span>Nacimiento</span>{selected.patientProfile.dateOfBirth ?? '—'}</p><p><span>Sexo / género</span>{selected.patientProfile.sex ?? '—'}</p><p><span>Teléfono</span>{selected.patientProfile.phone ?? '—'}</p><p><span>Email</span>{selected.email ?? '—'}</p><p><span>Dirección</span>{address || '—'}</p></article>
        <article className="nx-patient-block"><h3>Cobertura médica</h3><p><span>Obra social / prepaga</span>{selected.patientProfile.insuranceProvider ?? '—'}</p><p><span>N° de afiliado</span>{selected.patientProfile.insuranceMemberId ?? '—'}</p><p><span>Plan</span>{selected.patientProfile.insurancePlan ?? '—'}</p></article>
        <article className="nx-patient-block"><h3>Contacto de emergencia</h3><p><span>Nombre</span>{selected.patientProfile.emergencyContactName ?? '—'}</p><p><span>Teléfono</span>{selected.patientProfile.emergencyContactPhone ?? '—'}</p><p><span>Relación</span>{selected.patientProfile.emergencyContactRelationship ?? '—'}</p></article>
        <article className="nx-patient-block"><h3>Información de salud</h3><p><span>Grupo sanguíneo</span>{selected.patientProfile.bloodType ?? '—'}</p><p><span>Alergias</span>{selected.patientProfile.allergies ?? '—'}</p><p><span>Medicación habitual</span>{selected.patientProfile.regularMedication ?? '—'}</p><p><span>Preexistentes</span>{selected.patientProfile.preexistingConditions ?? '—'}</p><p><span>Observaciones médicas</span>{selected.patientProfile.medicalNotes ?? '—'}</p></article>
        <article className="nx-patient-block"><h3>Actividad y vinculación</h3><p><span>Vinculación</span>{new Date(selected.linkedAt).toLocaleDateString('es-AR')}</p><p><span>Turnos</span>{selected.totalAppointments}</p><p><span>Último turno</span>{selected.lastAppointmentAt ? new Date(selected.lastAppointmentAt).toLocaleString('es-AR') : '—'}</p></article>
      </section>}
    </div>
  </div>, document.body) : null;

  if (!user) return <Navigate to="/login" replace />;
  if (!activeOrganizationId) return <Navigate to="/post-login" replace />;

  return <main className="nx-card nx-patients-page">
    <div className="nx-patients-page__header">
      <h1>Pacientes</h1>
      <input className="nx-patients-search" placeholder="Buscar por nombre, email o DNI" value={search} onChange={(e) => setSearch(e.target.value)} />
    </div>
    {diagnostic ? <p role="status" className="nx-patients-diagnostic">{diagnostic}</p> : null}
    {loading ? <p className="nx-patients-status">Cargando pacientes...</p> : error ? <p className="nx-patients-status nx-patients-status--error">{error}</p> : rows.length === 0 ? <div className="nx-patients-empty"><p>No hay pacientes vinculados.</p><small>Cuando vincules pacientes al centro, aparecerán aquí.</small></div> : <div className="nx-patients-list">{rows.map((row) => {
      const patientInitials = `${row.firstName?.[0] ?? ''}${row.lastName?.[0] ?? ''}`.toUpperCase() || 'P';
      return <button className="nx-patient-list-item" key={row.patientProfileId} type="button" onClick={() => void selectPatient(row.patientProfileId)}><span className="nx-patient-avatar">{patientInitials}</span><span><strong>{fullName(row)}</strong>{!row.isPrimaryProfile ? <small>Familiar: {row.relationshipToOwner ?? '—'} · Responsable: {row.ownerName ?? '—'}</small> : null}</span></button>;
    })}</div>}
    {patientModal}
  </main>;
};
