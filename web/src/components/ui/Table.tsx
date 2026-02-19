import "./primitives.css";

export function Table({ children }: { children: React.ReactNode }) {
  return <div className="ui-table-wrap"><table className="ui-table">{children}</table></div>;
}
