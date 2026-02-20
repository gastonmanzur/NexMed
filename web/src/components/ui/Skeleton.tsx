import "./primitives.css";

type SkeletonVariant = "line" | "avatar" | "card" | "table";

export function Skeleton({
  width = "100%",
  height = "1rem",
  variant = "line",
  rows = 4,
}: {
  width?: string;
  height?: string;
  variant?: SkeletonVariant;
  rows?: number;
}) {
  if (variant === "table") {
    return (
      <div className="ui-skeleton-table" aria-hidden="true">
        <div className="ui-skeleton-row" style={{ height: "1.4rem" }} />
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="ui-skeleton-row" style={{ height: "1.1rem" }} />
        ))}
      </div>
    );
  }

  const classes = ["ui-skeleton"];
  if (variant === "avatar") classes.push("ui-skeleton-avatar");
  if (variant === "card") classes.push("ui-skeleton-card");

  return <div className={classes.join(" ")} style={{ width, height }} aria-hidden="true" />;
}
