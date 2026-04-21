import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { patientApi } from './patient-api';
import { saveJoinIntent } from './join-intent';

export const JoinPage = (): ReactElement => {
  const { tokenOrSlug = '' } = useParams();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [centerName, setCenterName] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const preview = await patientApi.getJoinPreview(tokenOrSlug);
        setCenterName(preview.organization.displayName ?? preview.organization.name);
        if (!user || !accessToken) {
          saveJoinIntent(tokenOrSlug);
          setLoading(false);
          return;
        }
        await patientApi.resolveJoin(accessToken, tokenOrSlug);
        navigate('/patient/organizations', { replace: true });
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken, navigate, tokenOrSlug, user]);

  return (
    <main style={{ maxWidth: 640, margin: '2rem auto', padding: '1rem' }}>
      <Card title="Vinculación de centro">
        <section className="nx-join">
          {loading ? <p className="nx-join__status">Cargando...</p> : null}

          {!loading && !error ? (
            <>
              <p className="nx-join__lead">
                Estás por vincularte a <strong>{centerName}</strong>.
              </p>

              {!user ? (
                <div className="nx-join__actions" role="group" aria-label="Acciones de acceso para completar la vinculación">
                  <Link className="nx-btn nx-join__action" to="/login">Iniciar sesión</Link>
                  <Link className="nx-btn-secondary nx-join__action" to="/register">Crear cuenta</Link>
                </div>
              ) : (
                <p className="nx-join__status">Resolviendo vinculación...</p>
              )}
            </>
          ) : null}

          {error ? (
            <>
              <p className="nx-join__error">{error}</p>
              {user ? (
                <div className="nx-join__actions">
                  <Link className="nx-btn nx-join__action" to="/patient/organizations">Ir a Mis clínicas</Link>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </Card>
    </main>
  );
};
