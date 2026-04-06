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

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void patientApi
      .listOrganizations(accessToken)
      .then(setItems)
      .catch((cause) => setError((cause as Error).message));
  }, [accessToken]);

  return (
    <main className="nx-page nx-page--patient-home">
      <Card
        title="Mis centros"
        subtitle="Seleccioná un centro para gestionar y reservar tus turnos online."
        className="nx-hero-card nx-patient-hero"
      >
        {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}
        {items.length === 0 ? (
          <p>No tenés centros vinculados todavía.</p>
        ) : (
          <ul className="nx-org-list">
            {items.map((item) => (
              <li key={item.organization.id} className="nx-org-list__item">
                <div>
                  <p className="nx-org-list__name">{item.organization.displayName ?? item.organization.name}</p>
                  <p className="nx-org-list__status">Estado del vínculo: {item.link.status}</p>
                </div>
                <Link className="nx-btn" to={`/patient/organizations/${item.organization.id}/book`}>
                  Reservar
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
};
