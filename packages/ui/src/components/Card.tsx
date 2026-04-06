import type { ReactElement, ReactNode } from 'react';

interface CardProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const Card = ({ title, subtitle, actions, children, className }: CardProps): ReactElement => {
  return (
    <section className={className ? `nx-card ${className}` : 'nx-card'}>
      <header className="nx-card__header">
        <div>
          <h1 className="nx-card__title">{title}</h1>
          {subtitle ? <p className="nx-card__subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </header>
      {children}
    </section>
  );
};
