import type { ReactElement } from 'react';

const boxStyle = {
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '0.9rem',
  background: '#fafafa'
};

export const LoadingState = ({ message = 'Cargando...' }: { message?: string }): ReactElement => (
  <div style={boxStyle} role="status" aria-live="polite">
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
  <div style={{ ...boxStyle, borderColor: '#fecaca', background: '#fff1f2', color: '#9f1239' }} role="alert">
    <p style={{ marginTop: 0 }}>{message}</p>
    {onRetry ? (
      <button type="button" onClick={onRetry}>
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
  <div style={boxStyle}>
    <p style={{ margin: 0, fontWeight: 600 }}>{title}</p>
    <p style={{ marginBottom: action ? '0.75rem' : 0 }}>{description}</p>
    {action ?? null}
  </div>
);
