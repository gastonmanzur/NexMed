import { useEffect, useMemo, useState } from "react";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "../../api/notifications";
import { Card } from "../../components/Card";
import { Navbar } from "../../components/Navbar";
import { useAuth } from "../../hooks/useAuth";
import { InAppNotification } from "../../types";
import { refreshUnreadCount, setLastSeenNotificationId } from "../../state/notificationsStore";

function formatTimeAgo(date: string) {
  const deltaMinutes = Math.round((new Date(date).getTime() - Date.now()) / 60000);
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  if (Math.abs(deltaMinutes) < 60) return rtf.format(deltaMinutes, "minute");
  const deltaHours = Math.round(deltaMinutes / 60);
  if (Math.abs(deltaHours) < 24) return rtf.format(deltaHours, "hour");
  return rtf.format(Math.round(deltaHours / 24), "day");
}

export function PatientNotificationsPage() {
  const { logout, token, user } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await listNotifications(token, { page: 1, limit: 50 });
      setNotifications(data.items);
      if (data.items[0]?._id) setLastSeenNotificationId(data.items[0]._id);
      await refreshUnreadCount(token);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const onLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const filtered = useMemo(() => (tab === "unread" ? notifications.filter((n) => !n.readAt) : notifications), [notifications, tab]);

  const onMarkRead = async (notification: InAppNotification) => {
    if (!token) return;
    if (!notification.readAt) {
      await markNotificationRead(token, notification._id);
      await load();
    }

    if (notification.data?.appointmentId) {
      window.location.href = "/patient/appointments";
    }
  };

  const onMarkAllRead = async () => {
    if (!token) return;
    await markAllNotificationsRead(token);
    await load();
  };

  return (
    <>
      {user && <Navbar user={user} token={token} onLogout={onLogout} />}
      <div className="page">
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <h2>Notificaciones</h2>
            <button type="button" onClick={onMarkAllRead}>Marcar todas como leídas</button>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button type="button" onClick={() => setTab("all")} style={{ fontWeight: tab === "all" ? 700 : 500 }}>Todas</button>
            <button type="button" onClick={() => setTab("unread")} style={{ fontWeight: tab === "unread" ? 700 : 500 }}>No leídas</button>
          </div>

          {error && <p className="error">{error}</p>}

          {loading && (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ height: 64, borderRadius: 8, background: "#f3f4f6" }} />
              <div style={{ height: 64, borderRadius: 8, background: "#f3f4f6" }} />
              <div style={{ height: 64, borderRadius: 8, background: "#f3f4f6" }} />
            </div>
          )}

          {!loading && !filtered.length && !error && <p>No hay notificaciones todavía.</p>}

          {!loading &&
            filtered.map((item) => (
              <button
                type="button"
                key={item._id}
                className="form-row"
                onClick={() => onMarkRead(item)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                  background: "#fff",
                  fontWeight: item.readAt ? 500 : 700,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>{item.title}</span>
                  {!item.readAt && <span style={{ width: 8, height: 8, borderRadius: 999, background: "#dc2626" }} />}
                </div>
                <div style={{ fontWeight: 500, color: "#374151", marginTop: 4 }}>{item.message}</div>
                <div style={{ fontWeight: 500, color: "#6b7280", marginTop: 4 }}>{formatTimeAgo(item.createdAt)}</div>
              </button>
            ))}
        </Card>
      </div>
    </>
  );
}
