import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PatientOrganizationSummaryDto } from '@starter/shared-types';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { patientApi } from './patient-api';

export const PatientOrganizationsPage = (): ReactElement => {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<PatientOrganizationSummaryDto[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { if (!accessToken) return; void patientApi.listOrganizations(accessToken).then(setItems).catch((cause) => setError((cause as Error).message)); }, [accessToken]);
  return <main style={{ maxWidth: 880, margin: '2rem auto', padding: '1rem' }}><Card title="Mis centros">{error ? <p style={{ color: 'crimson' }}>{error}</p> : null}{items.length === 0 ? <p>No tenés centros vinculados todavía.</p> : null}<ul>{items.map((item) => <li key={item.organization.id} style={{ marginBottom: '0.75rem' }}><strong>{item.organization.displayName ?? item.organization.name}</strong> ({item.link.status}) · <Link to={`/patient/organizations/${item.organization.id}/book`}>Reservar</Link></li>)}</ul></Card></main>;
};
