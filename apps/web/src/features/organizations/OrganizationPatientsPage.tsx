import type { OrganizationPatientDetailDto, OrganizationPatientListItemDto } from '@starter/shared-types';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
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
  if (!user) return <Navigate to="/login" replace />;
  if (!activeOrganizationId) return <Navigate to="/post-login" replace />;
  const selectPatient = async (patientProfileId: string) => {
    if (!accessToken) return;
    setLoadingDetail(true); setDetailError('');
    try { setSelected(await organizationApi.getPatientDetail(accessToken, activeOrganizationId, patientProfileId)); } catch (e) { setDetailError((e as Error).message); } finally { setLoadingDetail(false); }
  };
  const initials = useMemo(() => selected ? `${selected.patientProfile.firstName?.[0] ?? ''}${selected.patientProfile.lastName?.[0] ?? ''}`.toUpperCase() || 'P' : 'P', [selected]);
  return <main className="nx-card"><h1>Pacientes</h1><input placeholder="Buscar por nombre, email o DNI" value={search} onChange={(e) => setSearch(e.target.value)} />
    {diagnostic ? <p role="status">{diagnostic}</p> : null}
    {loading ? <p>Cargando pacientes...</p> : error ? <p>{error}</p> : rows.length === 0 ? <p>No hay pacientes vinculados.</p> : <div>{rows.map((row) => <button key={row.patientProfileId} type="button" onClick={() => void selectPatient(row.patientProfileId)}><strong>{fullName(row)}</strong> · {row.documentId ?? 'Sin DNI'} · {row.email ?? 'Sin email'} · {row.phone ?? 'Sin teléfono'} · {row.insuranceProvider ?? 'Sin cobertura'}</button>)}</div>}
    {selected ? <dialog open><button type="button" onClick={() => setSelected(null)}>Cerrar</button><h2>{fullName(selected.patientProfile)} <span>{initials}</span></h2>{loadingDetail ? <p>Cargando detalle...</p> : detailError ? <p>{detailError}</p> : <section><p>DNI: {selected.patientProfile.documentId ?? '—'}</p><p>Nacimiento: {selected.patientProfile.dateOfBirth ?? '—'}</p><p>Sexo: {selected.patientProfile.sex ?? '—'}</p><p>Tel: {selected.patientProfile.phone ?? '—'}</p><p>Email: {selected.email ?? '—'}</p><p>Dirección: {[selected.patientProfile.address, selected.patientProfile.city, selected.patientProfile.province].filter(Boolean).join(', ') || '—'}</p><p>Obra social: {selected.patientProfile.insuranceProvider ?? '—'}</p><p>N° afiliado: {selected.patientProfile.insuranceMemberId ?? '—'}</p><p>Plan: {selected.patientProfile.insurancePlan ?? '—'}</p><p>Emergencia: {selected.patientProfile.emergencyContactName ?? '—'} · {selected.patientProfile.emergencyContactPhone ?? '—'} · {selected.patientProfile.emergencyContactRelationship ?? '—'}</p><p>Sangre: {selected.patientProfile.bloodType ?? '—'}</p><p>Alergias: {selected.patientProfile.allergies ?? '—'}</p><p>Medicación: {selected.patientProfile.regularMedication ?? '—'}</p><p>Preexistentes: {selected.patientProfile.preexistingConditions ?? '—'}</p><p>Observaciones: {selected.patientProfile.medicalNotes ?? '—'}</p><p>Vinculación: {new Date(selected.linkedAt).toLocaleDateString('es-AR')}</p><p>Turnos: {selected.totalAppointments} · Último: {selected.lastAppointmentAt ? new Date(selected.lastAppointmentAt).toLocaleString('es-AR') : '—'}</p></section>}</dialog> : null}
  </main>;
};
