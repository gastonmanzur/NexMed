export const fmtDate = (date: Date) => date.toISOString().slice(0, 10);

export function rangeDays(start: Date, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export const humanDate = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
