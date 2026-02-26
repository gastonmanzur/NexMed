import { useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { getUnreadNotificationsCount, listNotifications, markAllNotificationsRead, markNotificationRead } from "../api/notifications";
import { InAppNotification } from "../types";
import styles from "./NotificationsBell.module.css";

type NotificationsBellProps = {
  token: string;
};

function getTimeAgoLabel(value: string) {
  const ms = new Date(value).getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  const mins = Math.round(ms / 60000);
  if (Math.abs(mins) < 60) return rtf.format(mins, "minute");
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  const days = Math.round(hours / 24);
  return rtf.format(days, "day");
}

export function NotificationsBell({ token }: NotificationsBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [error, setError] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const badgeLabel = useMemo(() => {
    if (unreadCount <= 0) return "";
    if (unreadCount >= 10) return "9+";
    return String(unreadCount);
  }, [unreadCount]);

  const refreshUnread = async () => {
    const data = await getUnreadNotificationsCount(token);
    setUnreadCount(data.unreadCount);
  };

  const loadLatest = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listNotifications(token, { page: 1, limit: 5 });
      setItems(data.items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUnread().catch(() => undefined);
    const interval = window.setInterval(() => {
      refreshUnread().catch(() => undefined);
    }, 30_000);

    const onFocus = () => refreshUnread().catch(() => undefined);
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [token]);

  useEffect(() => {
    const closeOnClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnClickOutside);
    return () => document.removeEventListener("mousedown", closeOnClickOutside);
  }, []);

  const toggleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      await Promise.all([refreshUnread(), loadLatest()]);
    }
  };

  const onReadOne = async (id: string) => {
    await markNotificationRead(token, id);
    await Promise.all([refreshUnread(), loadLatest()]);
  };

  const onReadAll = async () => {
    await markAllNotificationsRead(token);
    await Promise.all([refreshUnread(), loadLatest()]);
  };

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <button type="button" className={styles.bellButton} aria-label="Notificaciones" onClick={toggleOpen}>
        <Bell size={18} />
        {unreadCount > 0 && <span className={styles.badge}>{badgeLabel}</span>}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <strong>Notificaciones</strong>
            <button type="button" className={styles.textButton} onClick={onReadAll}>
              Marcar todas como leídas
            </button>
          </div>

          {loading && (
            <div className={styles.skeletonList}>
              <div className={styles.skeleton} />
              <div className={styles.skeleton} />
              <div className={styles.skeleton} />
            </div>
          )}

          {!loading && error && <p className={styles.error}>{error}</p>}
          {!loading && !error && !items.length && <p className={styles.empty}>No hay notificaciones.</p>}

          {!loading &&
            items.map((item) => (
              <button key={item._id} type="button" className={styles.item} onClick={() => onReadOne(item._id)}>
                <div className={styles.itemTop}>
                  <span className={item.readAt ? styles.title : `${styles.title} ${styles.unreadTitle}`}>{item.title}</span>
                  {!item.readAt && <span className={styles.dot} />}
                </div>
                <span className={styles.message}>{item.message}</span>
                <span className={styles.time}>{getTimeAgoLabel(item.createdAt)}</span>
              </button>
            ))}

          <a className={styles.viewAll} href="/patient/notifications">
            Ver todas
          </a>
        </div>
      )}
    </div>
  );
}
