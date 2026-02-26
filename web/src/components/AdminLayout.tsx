import { useAuth } from "../hooks/useAuth";
import { Navbar } from "./Navbar";
import { PageContainer } from "./ui/Page";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { clinic, user, token, logout } = useAuth();

  if (!user) return null;

  return (
    <>
      <Navbar user={user} token={token} clinicName={clinic?.name} onLogout={logout} />
      <PageContainer>{children}</PageContainer>
    </>
  );
}
