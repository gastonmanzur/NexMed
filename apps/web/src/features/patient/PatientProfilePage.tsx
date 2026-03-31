import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { patientApi } from './patient-api';

export const PatientProfilePage = (): ReactElement => {
  const { accessToken } = useAuth();
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    void patientApi
      .getMe(accessToken)
      .then((me) => {
        setPhone(me.patientProfile.phone ?? '');
        setDateOfBirth(me.patientProfile.dateOfBirth ?? '');
        setDocumentId(me.patientProfile.documentId ?? '');
      })
      .catch((cause) => setError((cause as Error).message));
  }, [accessToken]);

  return (
    <main className="nx-page" style={{ maxWidth: 760 }}>
      <Card title="Mi perfil de paciente" subtitle="Mantené tus datos personales actualizados para una mejor atención.">
        {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}
        {message ? <p style={{ color: '#166534' }}>{message}</p> : null}
        <form className="nx-form-grid" onSubmit={(event) => event.preventDefault()}>
          <label className="nx-field">
            Teléfono
            <input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <label className="nx-field">
            Fecha de nacimiento
            <input type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} />
          </label>
          <label className="nx-field">
            Documento
            <input value={documentId} onChange={(event) => setDocumentId(event.target.value)} />
          </label>
          <div>
            <button
              type="button"
              className="nx-btn"
              onClick={async () => {
                if (!accessToken) return;
                try {
                  setError('');
                  await patientApi.patchMe(accessToken, { phone, dateOfBirth, documentId });
                  setMessage('Perfil actualizado.');
                } catch (cause) {
                  setError((cause as Error).message);
                }
              }}
            >
              Guardar
            </button>
          </div>
        </form>
      </Card>
    </main>
  );
};
