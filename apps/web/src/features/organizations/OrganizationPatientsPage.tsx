import type { OrganizationPatientDetailDto, OrganizationPatientListItemDto } from '@starter/shared-types';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { PatientDetailModal, getPatientFullName } from './PatientDetailModal';
import { ApiRequestError, organizationApi } from './organization-api';

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
  const selectPatient = async (patientProfileId: string) => {
    if (!accessToken || !activeOrganizationId) return;
    setLoadingDetail(true); setDetailError('');
    try { setSelected(await organizationApi.getPatientDetail(accessToken, activeOrganizationId, patientProfileId)); } catch (e) { setDetailError((e as Error).message); } finally { setLoadingDetail(false); }
  };
  const closePatientModal = (): void => setSelected(null);


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
      return <button className="nx-patient-list-item" key={row.patientProfileId} type="button" onClick={() => void selectPatient(row.patientProfileId)}><span className="nx-patient-avatar">{patientInitials}</span><span><strong>{getPatientFullName(row)}</strong>{!row.isPrimaryProfile ? <small>Familiar: {row.relationshipToOwner ?? '—'} · Responsable: {row.ownerName ?? '—'}</small> : null}</span></button>;
    })}</div>}
    <PatientDetailModal patient={selected} loading={loadingDetail} error={detailError} onClose={closePatientModal} />
  </main>;
};
