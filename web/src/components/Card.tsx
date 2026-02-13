import "./ui.css";

export function Card({ children }: { children: React.ReactNode }) {
  return <div className="card-box">{children}</div>;
}
