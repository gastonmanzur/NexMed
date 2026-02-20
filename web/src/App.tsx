import { AdminLayout } from "./components/AdminLayout";
import { useAuth } from "./hooks/useAuth";
import { AdminAppointmentsPage } from "./pages/AdminAppointmentsPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminProfessionalsPage } from "./pages/AdminProfessionalsPage";
import { AdminSchedulesPage } from "./pages/AdminSchedulesPage";
import { AdminSettingsPage } from "./pages/AdminSettingsPage";
import { AdminNotificationsPage } from "./pages/AdminNotificationsPage";
import { AdminSpecialtiesPage } from "./pages/AdminSpecialtiesPage";
import { JoinClinicPage } from "./pages/JoinClinicPage";
import { LoginPage } from "./pages/LoginPage";
import { PatientAppointmentsPage } from "./pages/patient/PatientAppointmentsPage";
import { PatientClinicsPage } from "./pages/patient/PatientClinicsPage";
import { PatientReschedulePage } from "./pages/patient/PatientReschedulePage";
import { PatientNotificationsPage } from "./pages/patient/PatientNotificationsPage";
import { PublicBookingPage } from "./pages/PublicBookingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";

function App() {
  const { token, loading, user } = useAuth();
  const path = window.location.pathname;

  if (loading) return <p className="page">Cargando...</p>;

  if (path.startsWith("/c/")) {
    return <PublicBookingPage slug={path.split("/")[2] ?? ""} />;
  }

  if (path.startsWith("/join/")) {
    return <JoinClinicPage token={path.split("/")[2] ?? ""} />;
  }

  if (path === "/register") return <RegisterPage />;
  if (path === "/login") return <LoginPage />;

  if (!token || !user) {
    if (path !== "/login") window.history.replaceState({}, "", "/login");
    return <LoginPage />;
  }

  if (path === "/profile") return <ProfilePage />;

  if (user.type === "patient") {
    if (path === "/patient" || path === "/patient/appointments") return <PatientAppointmentsPage />;
    if (path === "/patient/clinics") return <PatientClinicsPage />;
    if (path === "/patient/reschedule") return <PatientReschedulePage />;
    if (path === "/patient/notifications") return <PatientNotificationsPage />;

    window.history.replaceState({}, "", "/patient/appointments");
    return <PatientAppointmentsPage />;
  }

  let content = <AdminDashboardPage />;
  if (path === "/admin/settings") content = <AdminSettingsPage />;
  if (path === "/admin/appointments") content = <AdminAppointmentsPage />;
  if (path === "/admin/specialties") content = <AdminSpecialtiesPage />;
  if (path === "/admin/professionals") content = <AdminProfessionalsPage />;
  if (path === "/admin/schedules") content = <AdminSchedulesPage />;
  if (path === "/clinic/notifications") content = <AdminNotificationsPage />;
  if (!["/admin", "/admin/settings", "/admin/appointments", "/admin/specialties", "/admin/professionals", "/admin/schedules", "/clinic/notifications"].includes(path)) {
    window.history.replaceState({}, "", "/admin");
  }

  return <AdminLayout>{content}</AdminLayout>;
}

export default App;
