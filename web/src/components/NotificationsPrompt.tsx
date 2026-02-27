import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { InAppNotification } from "../types";
import { fetchLatestNotifications, getNotificationsState, refreshUnreadCount, setLastSeenNotificationId } from "../state/notificationsStore";
import styles from "./NotificationsPrompt.module.css";

type ToastState = {
  title: string;
  message: string;
  targetHref: string;
};

function resolveTarget(notification: InAppNotification) {
  if (notification.type === "appointment.confirmed" || notification.data?.appointmentId) {
    return "/patient/appointments";
  }
  return "/patient/notifications";
}

export function NotificationsPrompt() {
  const { token, user } = useAuth();
  const [toast, setToast] = useState<ToastState | null>(null);
  const dismissRef = useRef<number | null>(null);

  useEffect(() => {
    if (!token || !user || user.type !== "patient") return;

    let mounted = true;

    const poll = async () => {
      const previousState = getNotificationsState();
      const previousUnread = previousState.unreadCount;
      const previousId = previousState.lastSeenNotificationId;

      const latest = await fetchLatestNotifications(token, 3);
      const unreadNow = await refreshUnreadCount(token);

      if (!mounted || !window.document.hasFocus() || !latest.length) return;

      const latestId = latest[0]._id;
      if (!previousId) {
        setLastSeenNotificationId(latestId);
        return;
      }

      if (latestId !== previousId && unreadNow >= previousUnread) {
        const delta = Math.max(1, unreadNow - previousUnread);
        const target = resolveTarget(latest[0]);
        if (delta > 1) {
          setToast({
            title: "Nuevas notificaciones",
            message: `Tenés ${delta} notificaciones nuevas.`,
            targetHref: "/patient/notifications",
          });
        } else {
          setToast({
            title: latest[0].title,
            message: latest[0].message,
            targetHref: target,
          });
        }
        setLastSeenNotificationId(latestId);
      }
    };

    poll().catch(() => undefined);
    const interval = window.setInterval(() => {
      poll().catch(() => undefined);
    }, 25_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [token, user]);

  useEffect(() => {
    if (!toast) return;
    if (dismissRef.current) window.clearTimeout(dismissRef.current);
    dismissRef.current = window.setTimeout(() => setToast(null), 6000);
    return () => {
      if (dismissRef.current) window.clearTimeout(dismissRef.current);
    };
  }, [toast]);

  if (!toast || !user || user.type !== "patient") return null;

  return (
    <button
      type="button"
      className={styles.toast}
      onClick={() => {
        window.location.href = toast.targetHref;
      }}
      aria-label="Ver notificación"
    >
      <strong>{toast.title}</strong>
      <span>{toast.message}</span>
      <em>Ver</em>
    </button>
  );
}
