import type { ReactElement, ReactNode } from 'react';

interface CardProps {
  title: string;
  children: ReactNode;
}

export const Card = ({ title, children }: CardProps): ReactElement => {
  return (
    <section
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: '1rem',
        boxShadow: '0 6px 20px rgba(0,0,0,0.05)'
      }}
    >
      <h1>{title}</h1>
      {children}
    </section>
  );
};
