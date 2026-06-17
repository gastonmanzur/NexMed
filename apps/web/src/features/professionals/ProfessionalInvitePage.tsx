import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card } from '@starter/ui';
import { professionalInviteApi, type ProfessionalInviteDetails } from './professional-invite-api';

export const ProfessionalInvitePage = (): ReactElement => {
  const { token = '' } = useParams();
  const [details, setDetails] = useState<ProfessionalInviteDetails | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError('');
        setDetails(await professionalInviteApi.get(token));
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <main className="nx-auth-page" style={{ maxWidth: 560, margin: '2rem auto', padding: '1rem' }}>
      <section className="nx-auth-shell" style={{ maxWidth: 520 }}>
        <header className="nx-auth-header">
          <p className="nx-auth-kicker">NexMed</p>
          <h1>Invitación al panel profesional</h1>
          <p>Configurá tu contraseña para activar tu acceso profesional.</p>
        </header>
        <Card title="Activar acceso profesional">
          {loading ? <p>Cargando invitación...</p> : null}
          {!loading && error ? <p className="nx-auth-message nx-auth-message--error">{error}</p> : null}
          {!loading && details && !message ? (
            <>
              <div className="nx-form-grid">
                <p><strong>Centro:</strong> {details.organization.name}</p>
                <p><strong>Profesional:</strong> {details.professional.displayName}</p>
                <p><strong>Email:</strong> {details.email}</p>
                <label className="nx-field">
                  <span>Crear contraseña</span>
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 8 caracteres" />
                </label>
                <label className="nx-field">
                  <span>Confirmar contraseña</span>
                  <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repetí la contraseña" />
                </label>
              </div>
              <button className="nx-btn" type="button" onClick={async () => {
                try {
                  setError('');
                  const result = await professionalInviteApi.accept(token, password, confirmPassword);
                  setMessage(result.message);
                } catch (cause) {
                  setError((cause as Error).message);
                }
              }}>Activar acceso</button>
              {error ? <p className="nx-auth-message nx-auth-message--error">{error}</p> : null}
            </>
          ) : null}
          {message ? (
            <div className="nx-auth-actions">
              <p className="nx-auth-message nx-auth-message--success">Tu acceso profesional fue activado. Ya podés ingresar a NexMed.</p>
              <Link className="nx-btn" to="/login">Ir al login</Link>
            </div>
          ) : null}
        </Card>
      </section>
    </main>
  );
};
