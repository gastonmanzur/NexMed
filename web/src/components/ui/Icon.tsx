import type { ReactNode, SVGProps } from "react";

type IconName =
  | "calendar-check"
  | "calendar-days"
  | "users"
  | "tags"
  | "plus"
  | "pencil"
  | "trash"
  | "ban"
  | "save"
  | "search"
  | "filter"
  | "clock"
  | "list-checks"
  | "calendar-x"
  | "x";

const paths: Record<IconName, ReactNode> = {
  "calendar-check": <><path d="M8 2v4" /><path d="M16 2v4" /><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /><path d="m9 16 2 2 4-4" /></>,
  "calendar-days": <><path d="M8 2v4" /><path d="M16 2v4" /><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6" /><path d="M23 11h-6" /></>,
  tags: <><path d="M20 12V5a2 2 0 0 0-2-2h-7" /><path d="M4 11v7a2 2 0 0 0 2 2h7" /><path d="M4 11 11 4l9 9-7 7-9-9Z" /><path d="M14 7h.01" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  pencil: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></>,
  ban: <><circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" /></>,
  save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" /></>,
  search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
  filter: <><path d="M22 3H2l8 9v6l4 3v-9l8-9Z" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  "list-checks": <><path d="M3 6h11" /><path d="M3 12h11" /><path d="M3 18h11" /><path d="m16 6 2 2 4-4" /><path d="m16 12 2 2 4-4" /></>,
  "calendar-x": <><path d="M8 2v4" /><path d="M16 2v4" /><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /><path d="m10 15 4 4" /><path d="m14 15-4 4" /></>,
  x: <><path d="m18 6-12 12" /><path d="m6 6 12 12" /></>,
};

export function Icon({ name, size = 18, className = "", ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: 16 | 18 | 20 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      aria-hidden="true"
      className={`ui-icon ${className}`.trim()}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
