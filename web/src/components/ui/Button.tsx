import "./primitives.css";

type Variant = "primary" | "secondary" | "danger";

export function Button({ variant = "primary", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`ui-button ui-button-${variant} ${className}`.trim()} {...props} />;
}
