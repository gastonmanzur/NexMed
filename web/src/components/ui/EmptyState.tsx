import "./primitives.css";

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="ui-empty">
      {icon ? <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.55rem", color: "#6b7280" }}>{icon}</div> : null}
      <h3 style={{ margin: 0, color: "#1f2937", fontSize: "1.03rem" }}>{title}</h3>
      {description ? <p style={{ margin: "0.45rem 0 0" }}>{description}</p> : null}
      {action ? <div style={{ marginTop: "0.8rem" }}>{action}</div> : null}
    </div>
  );
}
