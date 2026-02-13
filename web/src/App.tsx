import { AdminLayout } from "./components/AdminLayout";
import { useAuth } from "./hooks/useAuth";
import { AdminAppointmentsPage } from "./pages/AdminAppointmentsPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminSettingsPage } from "./pages/AdminSettingsPage";
import { LoginPage } from "./pages/LoginPage";
import { PublicBookingPage } from "./pages/PublicBookingPage";
import { RegisterPage } from "./pages/RegisterPage";

function App() {
  const { token, loading } = useAuth();
  const path = window.location.pathname;

  if (loading) return <p className="page">Cargando...</p>;

  if (path.startsWith("/c/")) {
    return <PublicBookingPage slug={path.split("/")[2] ?? ""} />;
  }

  if (path === "/register") return <RegisterPage />;
  if (path === "/login") return <LoginPage />;

  if (!token) {
    if (path !== "/login") window.history.replaceState({}, "", "/login");
    return <LoginPage />;
  }

  let content = <AdminDashboardPage />;
  if (path === "/admin/settings") content = <AdminSettingsPage />;
  if (path === "/admin/appointments") content = <AdminAppointmentsPage />;
  if (!["/admin", "/admin/settings", "/admin/appointments"].includes(path)) {
    window.history.replaceState({}, "", "/admin");
  }

  return <AdminLayout>{content}</AdminLayout>;
}

export default App;
