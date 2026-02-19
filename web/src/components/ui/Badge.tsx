import "./primitives.css";

type Variant = "default" | "muted" | "success" | "danger";

export function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: Variant }) {
  const variantClass = variant === "default" ? "" : `ui-badge-${variant}`;
  return <span className={`ui-badge ${variantClass}`.trim()}>{children}</span>;
}
