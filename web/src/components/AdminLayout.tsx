import { useAuth } from "../hooks/useAuth";
import { Navbar } from "./Navbar";
import { PageContainer } from "./ui/Page";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { clinic, user, logout } = useAuth();

  if (!user) return null;

  return (
    <>
      <Navbar user={user} clinicName={clinic?.name} onLogout={logout} />
      <PageContainer>{children}</PageContainer>
    </>
  );
}
