import { useAuth } from "../hooks/useAuth";
import { Navbar } from "./Navbar";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { clinic, user, logout } = useAuth();

  if (!user) return null;

  return (
    <>
      <Navbar user={user} clinicName={clinic?.name} onLogout={logout} />
      <div className="page">{children}</div>
    </>
  );
}
