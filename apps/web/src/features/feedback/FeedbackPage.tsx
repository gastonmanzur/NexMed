import type { ChangeEvent, ReactElement } from 'react';
import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Card } from '@starter/ui';
import { useAuth } from '../auth/AuthContext';
import { feedbackApi, type FeedbackCategory } from './feedback-api';

const categories: Array<{ value: FeedbackCategory; label: string }> = [
  { value: 'bug', label: 'Bug' },
  { value: 'ux', label: 'UX' },
  { value: 'feature_request', label: 'Feature request' },
  { value: 'content', label: 'Contenido' },
  { value: 'support', label: 'Soporte' },
  { value: 'other', label: 'Otro' }
];

export const FeedbackPage = (): ReactElement => {
  const { accessToken, activeOrganizationId } = useAuth();
  const location = useLocation();
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  const onSubmit = async (): Promise<void> => {
    setSending(true);
    setError('');
    setSuccess('');

    try {
      const payload: {
        category: FeedbackCategory;
        title?: string;
        message: string;
        pagePath?: string;
        organizationId?: string;
      } = {
        category,
        message,
        pagePath:
          location.state && typeof location.state === 'object' && 'fromPath' in location.state
            ? String((location.state as { fromPath?: string }).fromPath ?? location.pathname)
            : location.pathname
      };

      if (title.trim()) payload.title = title.trim();
      if (activeOrganizationId) payload.organizationId = activeOrganizationId;

      await feedbackApi.submit(accessToken, payload);

      setSuccess('Gracias. Tu feedback se envió correctamente.');
      setTitle('');
      setMessage('');
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', padding: '1rem' }}>
      <Card title="Enviar feedback beta">
        <p>Ayudanos a priorizar mejoras. Este mensaje se guarda con contexto de uso.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <label>
            Categoría
            <select value={category} onChange={(event: ChangeEvent<HTMLSelectElement>) => setCategory(event.target.value as FeedbackCategory)}>
              {categories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Título (opcional)
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} />
          </label>

          <label>
            Mensaje
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={2000}
              rows={6}
              placeholder="Contanos qué pasó, dónde y qué esperabas."
            />
          </label>

          <button type="button" onClick={() => void onSubmit()} disabled={sending || message.trim().length < 5}>
            {sending ? 'Enviando...' : 'Enviar feedback'}
          </button>

          {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
          {success ? <p style={{ color: 'green' }}>{success}</p> : null}
        </div>
      </Card>
    </main>
  );
};
