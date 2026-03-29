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

  return <main style={{ maxWidth: 640, margin: '2rem auto', padding: '1rem' }}><Card title="Vinculación de centro">{loading ? <p>Cargando...</p> : null}{!loading && !error ? <><p>Estás por vincularte a <strong>{centerName}</strong>.</p>{!user ? <p><Link to="/login">Iniciar sesión</Link> o <Link to="/register">crear cuenta</Link> para continuar.</p> : <p>Resolviendo vinculación...</p>}</> : null}{error ? <p style={{ color: 'crimson' }}>{error}</p> : null}</Card></main>;
};
