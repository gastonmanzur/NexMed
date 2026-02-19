import "./primitives.css";

export function TextArea({ className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`ui-textarea ${className}`.trim()} {...props} />;
}
