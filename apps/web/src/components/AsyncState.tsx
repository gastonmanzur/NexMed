import type { ReactElement } from 'react';

export const LoadingState = ({ message = 'Cargando...' }: { message?: string }): ReactElement => (
  <div className="nx-state" role="status" aria-live="polite">
    {message}
  </div>
);

export const ErrorState = ({
  message,
  onRetry,
  retryLabel = 'Reintentar'
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}): ReactElement => (
  <div className="nx-state nx-state--error" role="alert">
    <p style={{ marginTop: 0 }}>{message}</p>
    {onRetry ? (
      <button type="button" className="nx-btn-danger" onClick={onRetry}>
        {retryLabel}
      </button>
    ) : null}
  </div>
);

export const EmptyState = ({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactElement;
}): ReactElement => (
  <div className="nx-state">
    <p style={{ margin: 0, fontWeight: 600 }}>{title}</p>
    <p style={{ marginBottom: action ? '0.75rem' : 0, color: 'var(--text-soft)' }}>{description}</p>
    {action ?? null}
  </div>
);
