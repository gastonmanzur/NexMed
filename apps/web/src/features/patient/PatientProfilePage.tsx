import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { patientApi } from './patient-api';

export const PatientProfilePage = (): ReactElement => {
  const { accessToken } = useAuth();
  const [phone, setPhone] = useState(''); const [dateOfBirth, setDateOfBirth] = useState(''); const [documentId, setDocumentId] = useState(''); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  useEffect(() => { if (!accessToken) return; void patientApi.getMe(accessToken).then((me) => { setPhone(me.patientProfile.phone ?? ''); setDateOfBirth(me.patientProfile.dateOfBirth ?? ''); setDocumentId(me.patientProfile.documentId ?? ''); }).catch((cause) => setError((cause as Error).message)); }, [accessToken]);
  return <main style={{ maxWidth: 720, margin: '2rem auto', padding: '1rem' }}><Card title="Mi perfil de paciente">{error ? <p style={{ color: 'crimson' }}>{error}</p> : null}{message ? <p style={{ color: 'green' }}>{message}</p> : null}<label>Teléfono<input value={phone} onChange={(event) => setPhone(event.target.value)} /></label><label>Fecha de nacimiento<input type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} /></label><label>Documento<input value={documentId} onChange={(event) => setDocumentId(event.target.value)} /></label><button type="button" onClick={async () => { if (!accessToken) return; try { setError(''); await patientApi.patchMe(accessToken, { phone, dateOfBirth, documentId }); setMessage('Perfil actualizado.'); } catch (cause) { setError((cause as Error).message); } }}>Guardar</button></Card></main>;
};
