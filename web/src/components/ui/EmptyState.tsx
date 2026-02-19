import "./primitives.css";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="ui-empty">
      <h3 style={{ margin: 0, color: "#1f2937", fontSize: "1.03rem" }}>{title}</h3>
      {description ? <p style={{ margin: "0.45rem 0 0" }}>{description}</p> : null}
      {action ? <div style={{ marginTop: "0.8rem" }}>{action}</div> : null}
    </div>
  );
}
