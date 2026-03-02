import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { getUnreadCount } from "../api/notifications";
import styles from "./Navbar.module.css";

export function NotificationsBell({ token, enabled }: { token?: string | null; enabled?: boolean }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!token || !enabled) {
      setUnreadCount(0);
      return;
    }

    let cancelled = false;

    const loadCount = async () => {
      try {
        const data = await getUnreadCount(token);
        if (!cancelled) {
          setUnreadCount(data.unreadCount);
        }
      } catch {
        if (!cancelled) setUnreadCount(0);
      }
    };

    loadCount();
    const interval = window.setInterval(loadCount, 25000);

    const onRefresh = () => loadCount();
    window.addEventListener("notifications:refresh", onRefresh as EventListener);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("notifications:refresh", onRefresh as EventListener);
    };
  }, [token, enabled]);

  if (!enabled) return null;

  const badgeLabel = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <button type="button" className={styles.bellButton} aria-label="Notificaciones" onClick={() => (window.location.href = "/patient/notifications")}>
      <Bell size={18} />
      {unreadCount > 0 && <span className={styles.bellBadge}>{badgeLabel}</span>}
    </button>
  );
}
