import { useEffect, useState } from "react";
import { getUnreadCount, listNotifications, markAllRead, markNotificationRead } from "../../api/notifications";
import { Navbar } from "../../components/Navbar";
import { Card } from "../../components/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAuth } from "../../hooks/useAuth";
import { NotificationItem } from "../../types";

export function PatientNotificationsPage() {
  const { logout, token, user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [listData, countData] = await Promise.all([listNotifications(token), getUnreadCount(token)]);
      setNotifications(listData.items);
      setUnreadCount(countData.unreadCount);
    } catch (e: any) {
      setError(e.message || "No se pudieron cargar las notificaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const onMarkRead = async (notification: NotificationItem) => {
    if (!token || notification.readAt) return;
    await markNotificationRead(token, notification._id);
    setNotifications((prev) => prev.map((item) => (item._id === notification._id ? { ...item, readAt: new Date().toISOString() } : item)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    window.dispatchEvent(new Event("notifications:refresh"));
  };

  const onMarkAllRead = async () => {
    if (!token) return;
    await markAllRead(token);
    setNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
    window.dispatchEvent(new Event("notifications:refresh"));
  };

  const onLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <>
      {user && <Navbar user={user} token={token} onLogout={onLogout} />}
      <div className="page">
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div>
              <h2 style={{ marginBottom: 4 }}>Notificaciones</h2>
              <p style={{ margin: 0, color: "#6b7280" }}>{unreadCount} sin leer</p>
            </div>
            <button className="btn" type="button" onClick={onMarkAllRead} disabled={unreadCount === 0 || loading}>
              Marcar todas como leídas
            </button>
          </div>

          {loading ? (
            <div style={{ display: "grid", gap: 10 }}>
              <Skeleton variant="card" height="4rem" />
              <Skeleton variant="card" height="4rem" />
              <Skeleton variant="card" height="4rem" />
            </div>
          ) : error ? (
            <p className="error">{error}</p>
          ) : notifications.length === 0 ? (
            <p>No tenés notificaciones.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {notifications.map((notification) => {
                const isUnread = !notification.readAt;
                return (
                  <button
                    key={notification._id}
                    type="button"
                    onClick={() => onMarkRead(notification)}
                    style={{
                      textAlign: "left",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: 12,
                      background: isUnread ? "#eef4ff" : "#fff",
                      boxShadow: isUnread ? "0 0 0 1px rgba(37, 99, 235, 0.2)" : "none",
                      cursor: isUnread ? "pointer" : "default",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <strong>{notification.title}</strong>
                      <small style={{ color: "#6b7280" }}>
                        {new Date(notification.createdAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
                      </small>
                    </div>
                    <p style={{ margin: "6px 0 0", color: "#374151" }}>{notification.message}</p>
                    {isUnread && <small style={{ color: "#1d4ed8" }}>Marcar como leída</small>}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
