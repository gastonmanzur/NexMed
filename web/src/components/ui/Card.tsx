import "./primitives.css";

export function Card({ children, className = "", ...props }: React.HTMLAttributes<HTMLElement>) {
  return <section className={`ui-card ui-card-interactive ${className}`.trim()} {...props}>{children}</section>;
}
