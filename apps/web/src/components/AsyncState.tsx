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
  action,
  icon = '📭'
}: {
  title: string;
  description: string;
  action?: ReactElement;
  icon?: string;
}): ReactElement => (
  <div className="nx-state nx-empty-state">
    <span className="nx-empty-state__icon" aria-hidden="true">{icon}</span>
    <p className="nx-empty-state__title">{title}</p>
    <p className="nx-empty-state__subtitle">{description}</p>
    {action ?? null}
  </div>
);
