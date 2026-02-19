import "./primitives.css";

export function Skeleton({ width = "100%", height = "1rem" }: { width?: string; height?: string }) {
  return <div className="ui-skeleton" style={{ width, height }} aria-hidden="true" />;
}
