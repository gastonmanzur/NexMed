import { useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "../api/notifications";
import { InAppNotification } from "../types";
import { refreshUnreadCount, setLastSeenNotificationId, subscribeNotificationsStore } from "../state/notificationsStore";
import styles from "./NotificationsBell.module.css";

type NotificationsBellProps = {
  token: string;
  notificationsHref?: string;
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

export function NotificationsBell({ token, notificationsHref = "/patient/notifications" }: NotificationsBellProps) {
  const [unreadCount, setUnreadCountState] = useState(0);
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

  const loadLatest = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listNotifications(token, { page: 1, limit: 5 });
      setItems(data.items);
      if (data.items[0]?._id) setLastSeenNotificationId(data.items[0]._id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeNotificationsStore((nextState) => {
      setUnreadCountState(nextState.unreadCount);
    });

    refreshUnreadCount(token).catch(() => undefined);
    const interval = window.setInterval(() => {
      refreshUnreadCount(token).catch(() => undefined);
    }, 25_000);

    const onFocus = () => refreshUnreadCount(token).catch(() => undefined);
    window.addEventListener("focus", onFocus);

    return () => {
      unsubscribe();
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
      await Promise.all([refreshUnreadCount(token), loadLatest()]);
    }
  };

  const onReadOne = async (id: string) => {
    await markNotificationRead(token, id);
    await Promise.all([refreshUnreadCount(token), loadLatest()]);
  };

  const onReadAll = async () => {
    await markAllNotificationsRead(token);
    await Promise.all([refreshUnreadCount(token), loadLatest()]);
  };

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <button type="button" className={`${styles.bellButton} ${unreadCount > 0 ? styles.bellButtonAlert : ""}`} aria-label="Notificaciones" onClick={toggleOpen}>
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

          <a className={styles.viewAll} href={notificationsHref}>
            Ver todas
          </a>
        </div>
      )}
    </div>
  );
}
