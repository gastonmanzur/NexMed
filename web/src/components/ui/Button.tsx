import "./primitives.css";

type Variant = "primary" | "secondary" | "danger";

export function Button({ variant = "primary", className = "", children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`ui-button ui-button-${variant} ${className}`.trim()} {...props}><span className="ui-button-content">{children}</span></button>;
}
